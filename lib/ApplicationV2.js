const FuzaApplication = require("./index").FuzaApplication;
const { EventEmitter } = require("events")
const path = require("path");
const fs = require("fs-extra");
const filesize = require("filesize");
const CombinedStream = require('combined-stream');
const QueuePromise = require("promise-queue");
const rn = require("random-number")
const rs = require("randomstring");
const GarbageMht = require("../tool/garbage_mht");
const GarbageEml = require("../tool/garbage_eml");
const CommonAHG = require("../tool/CommonAxerrHandlerGenerator").CommonAxerrHandlerGen;
const Toolbox = require("../tool/toolbox");

const EVENT_NAMES = {
  state_change: "state_change",
  error: "error",
  speed: "speed",
  complete: "complete",
  upload_finish: "upload_finish"
};
const COVER_EVENTS = {
  CHECK: "CHECK"
}
class ApplicationV2 {
  /**
   * 
   * @param {FuzaApplication} parent 
   */
  constructor(parent) {
    this.v1p = parent;
    this.upload_queue = new QueuePromise(2, Infinity);
    this.cover_queue = new QueuePromise(1, Infinity);

    /**@type {Array<{
     *file_path:String,
     *ksyun_store: String,
     *ksyun_key: String,
     *ksyun_etag: String,
     *ksyun_sha1: String,
     *ksyun_size:Number,
     *create_time: Number,
     *parent_id:Number,
     *task_ev:import("events").EventEmitter,
    *helped_fileids:Number[],
     *state:"todo"|"doing"|"done"|"fail"，
     * }}} */
    this.cover_store = [];
    this.coverEv = new EventEmitter;
    this.coverEv.on(COVER_EVENTS.CHECK, () => {
      this.CHECK_COVER_STORE();
    })
    setInterval(() => {
      this.coverEv.emit(COVER_EVENTS.CHECK);
    }, 1000);

  }


  /**
   * @returns {import("events").EventEmitter}
   * @param {String} rar_paths 
   * @param {} parent_id 
   * @param {import("events").EventEmitter} input_ev
   */
  inputRarFile(rar_path, parent_id = 0, input_ev = null) {
    let ev = input_ev || new EventEmitter;
    ev.emit(EVENT_NAMES.state_change, "等待任务开始");
    let upload_task = () => new Promise(async task_finish => {
      ev.emit(EVENT_NAMES.state_change, "上传开始");
      let step1_randomContent = await GarbageMht.randomMht();
      if (!step1_randomContent.ok) {
        ev.emit(EVENT_NAMES.error, `GarbageMht.randomMht:${step2_randomMHT.msg}`)
        return task_finish();
      }
      let o_file_stats = await Toolbox.getStats(rar_path);
      if (!o_file_stats.ok) {
        ev.emit(EVENT_NAMES.error, `get stats fail:${o_file_stats.msg}`)
        return task_finish();
      }
      if (!o_file_stats.stats.isFile()) {
        ev.emit(EVENT_NAMES.error, `IT IS NOT A FILE`)
        return task_finish();
      }
      let cStream = CombinedStream.create();
      let fStream = fs.createReadStream(rar_path)
      cStream.append(step1_randomContent.data.buf);
      cStream.append(fStream);
      let combiedSize = step1_randomContent.data.buf.byteLength + o_file_stats.stats.size;
      ev.emit(EVENT_NAMES.state_change, "上传中");
      let interval_mark = 0;
      let bytesRead = 0;
      interval_mark = setInterval(() => {
        let br = fStream.bytesRead;
        let speed = br - bytesRead;
        let speed_text = filesize(speed) + "/s";
        bytesRead = br;
        ev.emit(EVENT_NAMES.speed, { speed, speed_text });
      }, 1000);
      let step2_post = await this.v1p.kd.POST_WPSFILE_KSYUN(cStream, combiedSize, "multipart/related", `${rs.generate({ length: 5 })}.mht`, parent_id);
      clearInterval(interval_mark);
      ev.emit(EVENT_NAMES.speed, { speed: 0, speed_text: "done" });
      if (!step2_post.ok) {
        ev.emit(EVENT_NAMES.error, `POST_WPSFILE_KSYUN:${step2_post.msg}`)
        return task_finish();
      }
      let upload_ok_info = {
        file_path: rar_path,
        ksyun_store: step2_post.data.store,
        ksyun_key: step2_post.data.key,
        ksyun_etag: step2_post.data.etag,
        ksyun_sha1: step2_post.data.newfilename_sha1,
        ksyun_size: combiedSize,
        create_time: Date.now()
      }
      ev.emit(EVENT_NAMES.upload_finish, upload_ok_info);
      this.cover_store.push({
        file_path: rar_path,
        ksyun_store: step2_post.data.store,
        ksyun_key: step2_post.data.key,
        ksyun_etag: step2_post.data.etag,
        ksyun_sha1: step2_post.data.newfilename_sha1,
        ksyun_size: combiedSize,
        create_time: upload_ok_info.create_time,
        task_ev: ev,
        parent_id: parent_id,
        state: "todo",
        helped_fileids: []
      });
      this.coverEv.emit(COVER_EVENTS.CHECK);
      ev.emit(EVENT_NAMES.state_change, "上传完毕等待生成");
      return task_finish();
    });
    // ev.on(EVENT_NAMES.upload_finish,
    //   /**
    //    * @param {{file_path:String,
    //    *ksyun_store: String,
    //    *ksyun_key: String,
    //    *ksyun_etag: String,
    //    *ksyun_sha1: String,
    //    *create_time: Number
    //    * }}
    //    */
    //   (upload_ok_args) => {
    //     // debugger
    //   });
    this.upload_queue.add(upload_task);
    return ev;
  }

  /**
   * @private
   */
  CHECK_COVER_STORE() {
    let that = this;
    let todos = this.cover_store.filter(e => e.state == "todo");
    if (todos.length) {

      for (let todo of todos) {

        let taskGen = () => new Promise(async task_over => {
          todo.state = "doing";
          if ((Date.now() - todo.create_time) / 1000 / 60 / 60 > 5) {
            //暂定五个小时
            todo.state = "fail";
            todo.task_ev.emit(EVENT_NAMES.state_change, `距离上传时间太久，放弃重来`);
            this.inputRarFile(todo.file_path, todo.parent_id, todo.task_ev);
            return task_over();
            debugger
          }
          let plan_fail_count = 0;
          let api_fail_count = 0;
          while (true) {
            if (plan_fail_count > 100) {
              todo.task_ev.emit(EVENT_NAMES.state_change, `覆盖尝试太多，放弃重来`);
              this.inputRarFile(todo.file_path, todo.parent_id, todo.task_ev);//自动重新上传来
              todo.state = "fail";
              return task_over();
            }
            if (api_fail_count > 100) {
              todo.task_ev.emit(EVENT_NAMES.error, `覆盖时的API调用错误次数太多`);//需要等外面手工重新开始
              todo.state = "fail";
              return task_over();
            }


            let o_listFiles = await this.v1p.kd.APIV5_listfiles(todo.parent_id, 0, 20, "fsize", "ASC");
            if (!o_listFiles.ok) {
              api_fail_count++;
              console.log("APIV5_listfiles FAIL", o_listFiles.msg)
              continue;
            }
            let cloud_files = o_listFiles.data.files.filter(e => e.ftype == "file");
            if (!cloud_files.length) {
              //执行plan：作为完全的新文件

              let succ = await (async function func完全创建新文件() {

                let thefname = todo.ksyun_sha1 + ".mht"
                let o_create = await that.v1p.kd.APIV5_files_file_asNewFile(todo.ksyun_etag, todo.ksyun_key, thefname, todo.ksyun_sha1,
                  todo.ksyun_size, todo.parent_id, todo.ksyun_store);
                if (!o_create.ok) {
                  api_fail_count++;
                  console.log(`APIV5_files_file_asNewFile FAIL`, o_create.msg)
                  return false;
                }
                let other_files = that.cover_store.filter(e => e.state != "fail" && e.ksyun_sha1 != todo.ksyun_sha1);
                other_files = other_files.sort((a, b) => {

                  let va = Math.abs(a.ksyun_size - todo.ksyun_size);
                  let vb = Math.abs(b.ksyun_size - todo.ksyun_size);
                  return va - vb;
                });
                //用其他文件覆盖
                if (other_files.length) {
                  for (let file of other_files) {
                    let try_put = await that.v1p.kd.APIV5_files_file_PUT_as_new_version(o_create.data.file_id,
                      file.ksyun_key, file.ksyun_etag, file.ksyun_sha1, file.ksyun_size, file.ksyun_store);
                    todo.task_ev.emit(EVENT_NAMES.state_change, `::${plan_fail_count}（其他文件cover新文件）`);
                    if (try_put.ok) {
                      file.helped_fileids.push(o_create.data.file_id);
                      let checkHis = await that.checkHistoriesIfIncludeFsha(o_create.data.file_id, todo.ksyun_sha1);
                      if (checkHis.ok && checkHis.data.id) {
                        //完成啦！
                        todo.task_ev.emit(EVENT_NAMES.complete, {
                          full_path: todo.file_path,
                          file_id: o_create.data.file_id,
                          groupid: that.v1p.kd.mycloud_groupid,
                          fver: checkHis.data.fver,
                          history_id: checkHis.data.id,
                          fsha: checkHis.data.fsha,
                          fname: checkHis.data.fname,
                          fsize: todo.ksyun_size
                        })
                        return true;
                      }
                    } else {
                      plan_fail_count++;
                    }
                  }
                }
                //用其他文件覆盖没有成功，采取用mht文件覆盖的方法
                let o_mhtCover = await that.v1p.smallMhtToCoverFile(o_create.data.file_id, o_create.data.parent_id,
                  o_create.data.fname);
                todo.task_ev.emit(EVENT_NAMES.state_change, `::${plan_fail_count}（MHTcover新文件）`);
                if (o_mhtCover.ok) {
                  let checkHis2 = await that.checkHistoriesIfIncludeFsha(o_create.data.file_id, todo.ksyun_sha1);
                  if (checkHis2.ok && checkHis2.data.id) {
                    todo.task_ev.emit(EVENT_NAMES.complete, {
                      full_path: todo.file_path,
                      file_id: o_create.data.file_id,
                      groupid: that.v1p.kd.mycloud_groupid,
                      fver: checkHis2.data.fver,
                      history_id: checkHis2.data.id,
                      fsha: checkHis2.data.fsha,
                      fname: checkHis2.data.fname,
                      fsize: todo.ksyun_size
                    })
                    return true;
                  }
                } else {
                  plan_fail_count++;
                }
                return false;
              })();
              if (succ) {
                todo.state = "done";
                return task_over();
              }
            }
            cloud_files = cloud_files.sort((a, b) => {
              let compare = [1, 1];
              [a, b].map((e, i) => {
                if (todo.helped_fileids.includes(e.id)) {
                  compare[i] *= 1000;
                }
              });
              a.fsize - b.fsize > 0 ? compare[0] += 1 : compare[0] -= 1
              return compare[0] - compare[1];
            });
            //mht思路方案
            let succ = await (async function mht覆盖() {
              for (let cloud_file of cloud_files) {
                let o_put = await that.v1p.kd.APIV5_files_file_PUT_as_new_version(cloud_file.id, todo.ksyun_key,
                  todo.ksyun_etag, todo.ksyun_sha1, todo.ksyun_size, todo.ksyun_store);
                if (o_put.ok) {
                  let o_cover = await that.v1p.smallMhtToCoverFile(cloud_file.id, cloud_file.parentid, cloud_file.fname);
                  todo.task_ev.emit(EVENT_NAMES.state_change, `::${plan_fail_count}（MHTcover旧文件）`);
                  if (o_cover.ok) {
                    let checkHis = await that.checkHistoriesIfIncludeFsha(cloud_file.id, todo.ksyun_sha1, cloud_file.parentid);
                    if (checkHis.ok && checkHis.data.id) {
                      todo.task_ev.emit(EVENT_NAMES.complete, {
                        full_path: todo.file_path,
                        file_id: cloud_file.id,
                        groupid: that.v1p.kd.mycloud_groupid,
                        fver: checkHis.data.fver,
                        history_id: checkHis.data.id,
                        fsha: checkHis.data.fsha,
                        fname: checkHis.data.fname,
                        fsize: todo.ksyun_size
                      });
                      return true;
                    }
                  } else {
                    plan_fail_count++;
                  }
                } else {
                  api_fail_count++;
                  console.log("API FAIL APIV5_files_file_PUT_as_new_version", o_put.msg)
                }
              }
              return false;
            })();
            if (succ) {
              todo.state = "done";
              return task_over();
            }
            succ = await (async function dummy覆盖() {
              for (let cloud_file of cloud_files) {
                let o_put = await that.v1p.kd.APIV5_files_file_PUT_as_new_version(cloud_file.id, todo.ksyun_key,
                  todo.ksyun_etag, todo.ksyun_sha1, todo.ksyun_size, todo.ksyun_store);
                if (o_put.ok) {
                  let o_cover = await that.v1p.smallDummyFileToCoverFile(cloud_file.id, cloud_file.parentid, cloud_file.fname);
                  todo.task_ev.emit(EVENT_NAMES.state_change, `::${plan_fail_count}（DUMMYcover旧文件）`);
                  if (o_cover.ok) {
                    let checkHis = await that.checkHistoriesIfIncludeFsha(cloud_file.id, todo.ksyun_sha1, cloud_file.parentid);
                    if (checkHis.ok && checkHis.data.id) {
                      todo.task_ev.emit(EVENT_NAMES.complete, {
                        full_path: todo.file_path,
                        file_id: cloud_file.id,
                        groupid: that.v1p.kd.mycloud_groupid,
                        fver: checkHis.data.fver,
                        history_id: checkHis.data.id,
                        fsha: checkHis.data.fsha,
                        fname: checkHis.data.fname,
                        fsize: todo.ksyun_size
                      });
                      return true;
                    }
                  } else {
                    plan_fail_count++;
                  }
                } else {
                  api_fail_count++;
                  console.log("API FAIL APIV5_files_file_PUT_as_new_version", o_put.msg)
                }
              }
              return false;
            })();
            if (succ) {
              todo.state = "done";
              return task_over();
            }
          }
        });
        this.cover_queue.add(taskGen);
      }
    }
  }

  /**
   * @returns {Promise<{ok:Boolean,msg:String,data:{
   * fsha:String,
   * fileid:Number,
   * id:Number,
   * parentid:Number,
   * fver:Number,
   * fname:String
   * }}>}
   * @param {Number} fileid 
   * @param {String} fsha 
   */
  async checkHistoriesIfIncludeFsha(fileid, fsha, parent_id = 0) {
    let o_histories = await this.v1p.kd.APIV3_get_file_histories(fileid, 0, 20, parent_id);
    if (!o_histories.ok) {
      return { ok: false, msg: `API_history fail:${o_histories.msg}` }
    }
    let matched_his = o_histories.data.histories.find(e => e.fsha == fsha && e.id);
    if (matched_his) {
      return { ok: true, msg: "ok", data: matched_his }
    }
    return { ok: false, msg: `cant find match history in ${fileid}` }
  }






}


module.exports = ApplicationV2