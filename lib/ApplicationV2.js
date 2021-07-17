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
     *create_time: Number,
     *parent_id:Number,
     *task_ev:import("events").EventEmitter,
     *state:"todo"|"doing"|"done"|"fail"
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
        create_time: Date.now()
      }
      ev.emit(EVENT_NAMES.upload_finish, upload_ok_info);
      this.cover_store.push({
        file_path: rar_path,
        ksyun_store: step2_post.data.store,
        ksyun_key: step2_post.data.key,
        ksyun_etag: step2_post.data.etag,
        ksyun_sha1: step2_post.data.newfilename_sha1,
        create_time: upload_ok_info.create_time,
        task_ev: ev,
        parent_id: parent_id,
        state: "todo"
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
          let try_count = 0;


        });
        this.cover_queue.add(taskGen);
      }
    }
  }

  /**
   * @returns {Promise<{ok:Boolean,msg:String,data:{
   * fsha:String
   * }}>}
   * @param {Number} fileid 
   * @param {String} fsha 
   */
  checkHistoriesIfIncludeFsha(fileid, fsha) {

  }






}


module.exports = ApplicationV2