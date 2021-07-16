const setCookieParser = require("set-cookie-parser");
const FormData = require("form-data");
// const CombinedStream = require('combined-stream');
const XLSX = require("xlsx");
const events = require("events");
const path = require("path");
const fs = require("fs-extra");
const buffer = require("buffer");
const rn = require("random-number");
const rs = require("randomstring")
const QueuePromise = require("promise-queue");
const Pinyin = require("pinyin");
const filesize = require("filesize");
const Kuroshiro = require("kuroshiro/");
const CombinedStream = require('combined-stream');
const FirefoxUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0"
const Toolbox = require("../tool/toolbox");
const GarbageMht = require("../tool/garbage_mht");
const GarbageEml = require("../tool/garbage_eml");
const CommonAHG = require("../tool/CommonAxerrHandlerGenerator").CommonAxerrHandlerGen;

class KDStore2021 {
  constructor() {
    this.wps_sid = "";
    this.csrf_token = "";
    this.mycloud_groupid = 0;
    this.app = new FuzaApplication(this);
    this.__appendCookies = [
      {
        name: "Default",
        value: "DESC-mtime"
      }, {
        name: "lang",
        value: "zh-CN"
      }, {
        name: "weboffice_cdn",
        value: "3"
      },
      {
        name: "appcdn",
        value: "qn.cache.wpscdn.cn"
      }
    ];
    this.axios = require("axios").default.create({
      adapter: require("axios/lib/adapters/http"),
      headers: {
        "user-agent": FirefoxUA,
        "accept": "application/json, text/plain, */*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      },
      maxContentLength: Number.MAX_SAFE_INTEGER,
      maxRedirects: 0,
      validateStatus: s => s == 200
    });
    let that = this;
    this.PREPARE_FUNCTIONS = {
      /**
              * @description 在cookie都准备好以后才能执行
              * @returns {Promise<{ok:Boolean,msg:String,data:{
              * office_csrf_token:String
              * }}>}
              */
      getOfficeCsrfToken() {
        //废弃 没有了这个WEB API  
      },
      USELESS_GET_REQUEST(link, referer_str) {
        that.axios.get(link, {
          params: {
            // fileids: fileids.join(",")
          },
          headers: {
            cookie: that.cookie_as_header,
            referer: referer_str || "https://www.kdocs.cn/?show=all"
          }
        }).then(axresp => {
          //  debugger
          if (axresp.headers && axresp.headers['set-cookie']) {
            debugger
          }
        }).catch(r => { })
      }
    }
  }

  get cookie_as_header() {
    return `wps_sid=${
      this.wps_sid
      }; csrf=${
      this.csrf_token
      }; ${this.__appendCookies.map(e => `${e.name}=${e.value}`).join('; ')}`
  }

  /**
   * @returns {Promise<{ok:Boolean,msg:String,data:{
   * histories:Array<{
   * parentid:Number,
   * fname:String,
   * fver:Number,
   * id:Number,
   * fileid:Number,
   * fsha:String
   * }>
   * }}>}
   * @param {Number} fileid 
   * @param {Number} offset 
   * @param {Number} count 
   * @param {Number} parent_id 选填 用于referer
   */
  APIV3_get_file_histories(fileid, offset = 0, count = 20, parent_id = 0) {
    return new Promise(resolve => {
      this.axios.get(`https://drive.kdocs.cn/api/v3/files/${fileid}/histories`, {
        params: {
          offset: offset,
          count: count,
          groupid: this.mycloud_groupid,
        },
        headers: {
          cookie: this.cookie_as_header,
          Referer: parent_id ? `https://www.kdocs.cn/mine/${parent_id}` : "https://www.kdocs.cn/?show=all"
        }
      }).then(axresp => {
        if (axresp.data.result == "ok" && Array.isArray(axresp.data.histories)) {
          return resolve({
            ok: true,
            msg: "ok",
            data: {
              histories: axresp.data.histories
            }
          })
        }
        throw axresp.data;
        debugger
      }).catch(axerr => {
        CommonAHG(resolve)(axerr)
      })
    })
  }

  /**
   * @description 新建文件 获取上传需要的各种参数
 * @returns {Promise<{ok:Boolean,msg:String,data:{
  * KSSAccessKeyId: string,
  * Policy: string
  * Signature: string,
  * key: String,
  * url: String
  * "x-kss-newfilename-in-body": String,
  * "x-kss-server-side-encryption": String,
  * store:"ks3"|"ks3sh"
  * }}>}
   * @param {Number} parent_id 
   * @param {String} file_name 
   * @param {Number} size 
   */
  APIV5_files_upload_create(parent_id, file_name, size, contenttype = "application/octet-stream") {
    return new Promise(resolve => {
      this.axios.post(`https://drive.kdocs.cn/api/v5/files/upload/create`, {
        client_stores: "ks3,ks3sh",
        contenttype: contenttype,
        csrfmiddlewaretoken: this.csrf_token,
        groupid: this.mycloud_groupid,
        name: file_name,
        parent_path: [],
        parentid: String(parent_id),
        req_by_internal: false,
        size: size,
        startswithfilename: file_name,
        successactionstatus: 201
      }, {
        headers: {
          cookie: this.cookie_as_header
        }
      }).then(axresp => {
        if (axresp.data && axresp.data.result === "ok" && axresp.data.uploadinfo) {
          return resolve({
            ok: true,
            msg: "ok",
            data: {
              key: axresp.data.uploadinfo.params.key,
              KSSAccessKeyId: axresp.data.uploadinfo.params.KSSAccessKeyId,
              Policy: axresp.data.uploadinfo.params.Policy,
              Signature: axresp.data.uploadinfo.params.Signature,
              url: axresp.data.uploadinfo.url,
              "x-kss-newfilename-in-body": axresp.data.uploadinfo.params["x-kss-newfilename-in-body"],
              "x-kss-server-side-encryption": axresp.data.uploadinfo.params["x-kss-server-side-encryption"],
              store: axresp.data.uploadinfo.store
            }
          })
        }
        throw axresp.data;
        debugger

      }).catch(axerr => {
        CommonAHG(resolve)(axerr);
      })
    })

  }

  /**
   * @returns {Promise<{
   * ok:Boolean,
   * msg:string,
   * data:{
   * ev:import("events").EventEmitter
   * }
   * }>}
   * @param {import("stream").Readable} read_stream 
   * @param {Number} stream_size 
   * @param {String} stream_content_type 
   * @param {String} file_name 
   * @param {Number} folder_id
   */
  POST_WPSFILE_KSYUN_eventMode(read_stream, stream_size, stream_content_type = "application/octet-stream", file_name = "abc.bin", folder_id = 0) {
    return new Promise(async resolve => {
      if (stream_size >= 1024 * 1024 * 1024) {
        return resolve({
          ok: false,
          msg: `文件太大,和头文件加起来超过1GB`
        })
      }
      let o_token = await this.APIV5_files_upload_create(folder_id, file_name, stream_size, stream_content_type);
      if (!o_token.ok) {
        return resolve({
          ok: false,
          msg: `GET TOKEN FAIL:${o_token.msg}`
        })
      }
      let ev = new events.EventEmitter;
      let form = new FormData;
      form.append("KSSAccessKeyId", o_token.data.KSSAccessKeyId);
      form.append("Policy", o_token.data.Policy);
      form.append("Signature", o_token.data.Signature);
      form.append('key', o_token.data.key);
      form.append("x-kss-newfilename-in-body", o_token.data["x-kss-newfilename-in-body"]);
      form.append("x-kss-server-side-encryption", o_token.data["x-kss-server-side-encryption"]);
      form.append("file", read_stream, {
        filename: file_name,
        contentType: stream_content_type,
        knownLength: stream_size
      });
      let parsed = require("url").parse(o_token.data.url);
      console.log(o_token.data.url);
      // let bytesRead = 0;
      // let interval_mark = 0;
      // interval_mark = setInterval(()=>{
      //   let br = read_stream.bytesRead;
      //   debugger
      // },1000)
      form.submit({
        host: parsed.host,
        path: parsed.path,
        headers: {
          Origin: 'https://www.kdocs.cn',
          Referer: folder_id ? `https://www.kdocs.cn/mine/${folder_id}` : "https://www.kdocs.cn/?show=all",
          "User-Agent": FirefoxUA
        },
        protocol: parsed.protocol
      }, (err, response) => {
        if (err) {
          ev.emit("error", `form.submit callback error:${err.message}`)
          return 0;
        }
        if (!response.headers.etag) {
          ev.emit("error", `empty etag`)
          return 0;
        }
        if (!response.headers.newfilename) {
          ev.emit("error", `empty newfilename`);
          return 0;
        }
        let etag = response.headers.etag;
        etag = etag.replace(/"/g, "")
        let newfilename_sha1 = response.headers.newfilename;
        ev.emit("ok", {
          etag: etag,
          newfilename_sha1: newfilename_sha1,
          key: o_token.data.key,
          store: o_token.data.store
        })
      });
      form.on("error", err => {
        ev.emit("error", `form.on(error):${err.message}`)
      });
      // debugger


      return resolve({
        ok: true,
        msg: "ok",
        data: {
          ev: ev
        }
      })

    })
  }

  /**
 * @returns {Promise<{
  * ok:Boolean,
  * msg:string,
  * data:{
  * etag:String,
  * key:String,
  * newfilename_sha1:String,
  * store:"ks3"|"ks3sh"
  * }
  * }>}
  * @param {import("stream").Readable} read_stream 
  * @param {Number} stream_size 
  * @param {String} stream_content_type 
  * @param {String} file_name 
  * @param {Number} folder_id
  */
  POST_WPSFILE_KSYUN(read_stream, stream_size, stream_content_type = "application/octet-stream", file_name = "abc.bin", folder_id = 0) {
    return new Promise(async resolve => {
      let o_eventMode = await this.POST_WPSFILE_KSYUN_eventMode(read_stream, stream_size, stream_content_type,
        file_name, folder_id);
      if (!o_eventMode.ok) {
        return resolve({
          ok: false,
          msg: `eventmode promise fail:${o_eventMode.msg}`
        })
      }
      let ev = o_eventMode.data.ev;
      ev.on("error", (args) => {
        resolve({
          ok: false,
          msg: `event error:${args}`
        })
      });
      ev.on("ok", (args) => {
        resolve({
          ok: true,
          msg: "ok",
          data: {
            key: args.key,
            etag: args.etag,
            newfilename_sha1: args.newfilename_sha1,
            store: args.store
          }
        })
      })
    })
  }

  /**
   * @returns {Promise<{
   * ok:Boolean,
   * msg:string,
   * data:{
   * file_id:Number,
   * parent_id:Number,
   * fver:Number,
   * fsize:Number,
   * fsha:String,
   * fname:String
   * }
   * }>}
   * @param {String} etag 
   * @param {String} key 
   * @param {String} file_name 
   * @param {String} newfilename_sha1 
   * @param {Number} size 
   * @param {Number} parent_id 
   * @param {"ks3"|"ks3sh"} store
   */
  APIV5_files_file_asNewFile(etag, key, file_name, newfilename_sha1, size, parent_id, store = "ks3") {
    return new Promise(resolve => {
      let data = buffer.Buffer.from(JSON.stringify({
        csrfmiddlewaretoken: this.csrf_token,
        etag: etag,
        groupid: this.mycloud_groupid,
        isUpNewVer: false,
        key: key,
        name: file_name,
        parent_path: [],
        parentid: parent_id,
        sha1: newfilename_sha1,
        size: size,
        store: store,
      }));
      this.axios.post(`https://drive.kdocs.cn/api/v5/files/file`, data, {
        headers: {
          cookie: this.cookie_as_header,
          referer: parent_id ? `https://www.kdocs.cn/mine/${parent_id}` : "https://www.kdocs.cn/?show=all",
          origin: 'https://www.kdocs.cn',
          "Content-Length": data.byteLength,
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }).then(axresp => {
        // debugger
        if (axresp.data.result == "ok") {
          return resolve({
            ok: true,
            msg: "ok",
            data: {
              file_id: axresp.data.id,
              parent_id: axresp.data.parentid,
              fver: axresp.data.fver,
              fsize: axresp.data.fsize,
              fsha: axresp.data.fsha,
              fname: axresp.data.fname,
            }
          })
        }
        throw axresp.data
      }).catch(axerr => {
        CommonAHG(resolve)(axerr)
      })
    })
  }

  /**
   * @returns {Promise<{ok:Boolean,msg:String,data:{
   * fsha:String,
   * fver:Number,
   * fileid:Number,
   * parentid:Number,
   * fname:String,
   * fsize:Number
   * }}>}
   * @param {Number} fileid 
   * @param {String} key 
   * @param {String} etag 
   * @param {String} sha1 
   * @param {Number} size 
   */
  APIV5_files_file_PUT_as_new_version(fileid, key, etag, sha1, size, store = "ks3") {
    return new Promise(resolve => {
      this.axios.put(`https://drive.kdocs.cn/api/v5/files/file`, {
        csrfmiddlewaretoken: this.csrf_token,
        etag: etag,
        fileid: String(fileid),
        key: key,
        sha1: sha1,
        size: size,
        store: store
      }, {
        headers: {
          cookie: this.cookie_as_header
        }
      }).then(axresp => {
        if (axresp.data.result == "ok") {
          return resolve({
            ok: true,
            msg: "ok",
            data: {
              fsha: axresp.data.fsha,
              fname: axresp.data.fname,
              fileid: axresp.data.id,
              parentid: axresp.data.parentid,
              fver: axresp.data.fver,
              fsize: axresp.data.fsize
            }
          })
        }
        throw axresp.data;
        debugger
      }).catch(axerr => {
        CommonAHG(resolve)(axerr)
      })
    })
  }

  /**
   * @returns {Promise<{ok:Boolean,msg:String,
   * data:{
   * files:Array<{
   * ctime:Number,
   * fname:String,
   * fsize:Number,
   * ftype:"folder"|"file",
   * fver:Number,
   * id:Number,
   * fsha:Number,
   * parentid:Number
   * }>,
   * next_filter:"file"|"folder",
   * next_offset:Number
   * }}>}
   * @param {Number} parent_id 
   * @param {Number} offset 最好是20的倍数
   * @param {Number} count 最好是20 免得被发现
   * @param {"mtime"|"fname"|"fsize"} orderby 
   * @param {"ASC"|"DESC"} order 
   */
  APIV5_listfiles(parent_id, offset = 0, count = 20, orderby = "mtime", order = "ASC") {
    return new Promise(resolve => {
      this.axios.get(`https://drive.kdocs.cn/api/v5/groups/${this.mycloud_groupid
        }/files?linkgroup=true&include=acl,pic_thumbnail&offset=${offset}&count=${count
        }&orderby=${orderby}&order=${order}&append=false&parentid=${
        parent_id
        }&reset=true`, {
        headers: {
          cookie: this.cookie_as_header,
          Origin: `https://www.kdocs.cn`,
          Referer: parent_id ? `https://www.kdocs.cn/mine/${parent_id}` : "https://www.kdocs.cn/?show=all"
        }
      }).then(axresp => {
        if (axresp.data.result == "ok") {
          return resolve({
            ok: true, msg: "ok",
            data: {
              files: axresp.data.files,
              next_filter: axresp.data.next_filter,
              next_offset: axresp.data.next_offset
            }
          })
        }
        throw axresp.data;
        debugger
      }).catch(axerr => {
        CommonAHG(resolve)(axerr);
      })
    })
  }



}

class FuzaApplication {
  /**
   * 
   * @param {KDStore2021} kd 
   */
  constructor(kd) {
    this.kd = kd;
    this.max_task_limit = 1;
    this.task_queue = new QueuePromise(this.max_task_limit, Infinity);
  }

  /**
   * @returns {Promise<{ok:Boolean,msg:String,data:{
   * fileid:String,
   * fname:String,
   * parent_id:Number
   * }}>}
   * @param {Number} parent_id 
   */
  async getAvailableMhtFileid(parent_id = 0) {
    let o_list = await this.kd.APIV5_listfiles(parent_id, 0, 20, "mtime", "DESC");
    if (!o_list.ok) {
      return { ok: false, msg: `APIV5_listfiles fail:${o_list.msg}` }
    }
    let mhtFiles = o_list.data.files.filter(e => e.ftype == "file" && e.fname.endsWith(".mht"));
    // let mhtFiles = o_list.data.files.filter(e => e.ftype == "file" && e.fname.endsWith(".eml"));
    if (mhtFiles.length) {
      let f = mhtFiles[0];
      return {
        ok: true, msg: "ok",
        data: {
          fileid: f.id,
          fname: f.fname,
          parent_id: f.parentid
        }
      }
    }
    let mhtName = `媒体${rs.generate({ length: 5 })}.mht`
    let o_mhtContent = await GarbageMht.randomMht();

    if (!o_mhtContent.ok) {
      return { ok: false, msg: `GarbageMht.randomMht fail:${o_mhtContent.msg}` }
    }

    let mhtContentBuffer = o_mhtContent.data.buf;
    let cStream = CombinedStream.create();
    cStream.append(mhtContentBuffer);
    let o_post_ksyun = await this.kd.POST_WPSFILE_KSYUN(cStream, mhtContentBuffer.byteLength, "multipart/related",
      mhtName, parent_id);
    if (!o_post_ksyun.ok) {
      return { ok: false, msg: `POST_WPSFILE_KSYUN fail:${o_post_ksyun.msg}` }
    }
    let o_newFile = await this.kd.APIV5_files_file_asNewFile(o_post_ksyun.data.etag,
      o_post_ksyun.data.key, mhtName, o_post_ksyun.data.newfilename_sha1, mhtContentBuffer.byteLength, parent_id, o_post_ksyun.data.store);
    if (!o_newFile.ok) {
      return { ok: false, msg: `APIV5_files_file_asNewFile fail:${o_newFile.msg}` }
    }
    return {
      ok: true, msg: "ok", data: {
        fileid: o_newFile.data.file_id,
        fname: mhtName,
        parent_id: o_newFile.data.parent_id
      }
    }
    // let o_createUploadToken = await this.kd.
  }

  /**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
  * fileid:String,
  * fname:String,
  * parent_id:Number
  * }}>}
  * @param {Number} parent_id 
  */
  async getAvailableEmlFileid(parent_id = 0) {
    let o_list = await this.kd.APIV5_listfiles(parent_id, 0, 20, "mtime", "DESC");
    if (!o_list.ok) {
      return { ok: false, msg: `APIV5_listfiles fail:${o_list.msg}` }
    }
    let emlFiles = o_list.data.files.filter(e => e.ftype == "file" && e.fname.endsWith(".eml"));
    // let mhtFiles = o_list.data.files.filter(e => e.ftype == "file" && e.fname.endsWith(".eml"));
    if (emlFiles.length) {
      let f = emlFiles[0];
      return {
        ok: true, msg: "ok",
        data: {
          fileid: f.id,
          fname: f.fname,
          parent_id: f.parentid
        }
      }
    }
    let emlName = `信件${rs.generate({ length: 5 })}.eml`
    let o_emlContent = await GarbageEml.randomEml()

    if (!o_emlContent.ok) {
      return { ok: false, msg: `GarbageEml.randomEml fail:${o_emlContent.msg}` }
    }

    let emlContentBuffer = o_emlContent.data.buf;
    let cStream = CombinedStream.create();
    cStream.append(emlContentBuffer);
    let o_post_ksyun = await this.kd.POST_WPSFILE_KSYUN(cStream, emlContentBuffer.byteLength, "message/rfc822",
      emlName, parent_id);
    if (!o_post_ksyun.ok) {
      return { ok: false, msg: `POST_WPSFILE_KSYUN fail:${o_post_ksyun.msg}` }
    }
    let o_newFile = await this.kd.APIV5_files_file_asNewFile(o_post_ksyun.data.etag,
      o_post_ksyun.data.key, emlName, o_post_ksyun.data.newfilename_sha1, emlContentBuffer.byteLength, parent_id, o_post_ksyun.data.store);
    if (!o_newFile.ok) {
      return { ok: false, msg: `APIV5_files_file_asNewFile fail:${o_newFile.msg}` }
    }
    return {
      ok: true, msg: "ok", data: {
        fileid: o_newFile.data.file_id,
        fname: emlName,
        parent_id: o_newFile.data.parent_id
      }
    }
    // let o_createUploadToken = await this.kd.
  }

  /**
   * @returns {Promise<{ok:Boolean,msg:String,data:{
    * fileid:String,
    * fname:String,
    * parent_id:Number,
    * fver:Number
    * }}>}
   * @param {Number} fileid 
   * @param {String} fname 可选 如果不输入就产生随机的名字
   * @param {Number} parent_id 可选 最好是能输入fileid对应的parent——id
   */
  async smallMhtToCoverFile(fileid, parent_id = 0, fname = "") {
    let o_mhtContent = await GarbageMht.randomMhtV2();
    let mhtName = fname || `${rn({ integer: true })}.mht`;
    if (!o_mhtContent.ok) {
      return { ok: false, msg: `GarbageMht.randomMht FAIL:${o_mhtContent.msg}` }
    }
    let mhtContentBuffer = o_mhtContent.data.buf;
    let cStream = CombinedStream.create();
    cStream.append(mhtContentBuffer);
    let o_post_ksyun = await this.kd.POST_WPSFILE_KSYUN(cStream, mhtContentBuffer.byteLength, "multipart/related",
      mhtName, parent_id);
    if (!o_post_ksyun.ok) {
      return { ok: false, msg: `POST_WPSFILE_KSYUN fail:${o_post_ksyun.msg}` }
    }
    let o_newVersion = await this.kd.APIV5_files_file_PUT_as_new_version(fileid, o_post_ksyun.data.key,
      o_post_ksyun.data.etag, o_post_ksyun.data.newfilename_sha1, mhtContentBuffer.byteLength, o_post_ksyun.data.store);
    if (!o_newVersion.ok) {
      return { ok: false, msg: `APIV5_files_file_PUT_as_new_version FAIL:${o_newVersion.msg}` }
    }
    return {
      ok: true, msg: "ok",
      data: {
        fileid: o_newVersion.data.fileid,
        fname: o_newVersion.data.fname,
        parent_id: o_newVersion.data.parentid,
        fver: o_newVersion.data.fver
      }
    }
  }

  /**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
  * fileid:String,
  * fname:String,
  * parent_id:Number,
  * fver:Number
  * }}>}
 * @param {Number} fileid 
 * @param {String} fname 可选 如果不输入就产生随机的名字
 * @param {Number} parent_id 可选 最好是能输入fileid对应的parent——id
 */
  async smallDummyFileToCoverFile(fileid, parent_id = 0, fname = "") {
    let NO = rn({ integer: true, min: 1, max: 4 });
    let dummyPath = path.join(__dirname, `../DUMMY/${NO}.txt`);
    let dummyBuffer = await fs.readFile(dummyPath);
    let extendBuffer = buffer.Buffer.from(rs.generate({ length: 135 }));


    // let o_mhtContent = await GarbageMht.randomMhtV2();
    let mhtName = fname || `${rn({ integer: true })}.mht`;


    let cStream = CombinedStream.create();
    cStream.append(dummyBuffer);
    cStream.append(extendBuffer)
    let bufferSize = dummyBuffer.byteLength + extendBuffer.byteLength;
    let o_post_ksyun = await this.kd.POST_WPSFILE_KSYUN(cStream, bufferSize, "application/octet-stream",
      mhtName, parent_id);
    if (!o_post_ksyun.ok) {
      return { ok: false, msg: `POST_WPSFILE_KSYUN fail:${o_post_ksyun.msg}` }
    }
    let o_newVersion = await this.kd.APIV5_files_file_PUT_as_new_version(fileid, o_post_ksyun.data.key,
      o_post_ksyun.data.etag, o_post_ksyun.data.newfilename_sha1, bufferSize, o_post_ksyun.data.store);
    if (!o_newVersion.ok) {
      return { ok: false, msg: `APIV5_files_file_PUT_as_new_version FAIL:${o_newVersion.msg}` }
    }
    return {
      ok: true, msg: "ok",
      data: {
        fileid: o_newVersion.data.fileid,
        fname: o_newVersion.data.fname,
        parent_id: o_newVersion.data.parentid,
        fver: o_newVersion.data.fver
      }
    }
  }

  /**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
  * fileid:String,
  * fname:String,
  * parent_id:Number,
  * fver:Number,
  * fsize:Number
  * }}>}
 * @param {Number} fileid 
 * @param {String} fname 可选 如果不输入就产生随机的名字
 * @param {Number} parent_id 可选 最好是能输入fileid对应的parent——id
 */
  async smallEmlToCoverFile(fileid, parent_id = 0, fname = "") {
    let o_emlContent = await GarbageEml.randomEml()
    let mhtName = fname || `${rn({ integer: true })}.eml`;
    if (!o_emlContent.ok) {
      return { ok: false, msg: `GarbageEml.randomEml FAIL:${o_emlContent.msg}` }
    }
    let emlBuffer = o_emlContent.data.buf;
    let cStream = CombinedStream.create();
    cStream.append(emlBuffer);
    let o_post_ksyun = await this.kd.POST_WPSFILE_KSYUN(cStream, emlBuffer.byteLength, "message/rfc822",
      mhtName, parent_id);
    if (!o_post_ksyun.ok) {
      return { ok: false, msg: `POST_WPSFILE_KSYUN fail:${o_post_ksyun.msg}` }
    }
    let o_newVersion = await this.kd.APIV5_files_file_PUT_as_new_version(fileid, o_post_ksyun.data.key,
      o_post_ksyun.data.etag, o_post_ksyun.data.newfilename_sha1, emlBuffer.byteLength, o_post_ksyun.data.store);
    if (!o_newVersion.ok) {
      return { ok: false, msg: `APIV5_files_file_PUT_as_new_version FAIL:${o_newVersion.msg}` }
    }

    return {
      ok: true, msg: "ok",
      data: {
        fileid: o_newVersion.data.fileid,
        fname: o_newVersion.data.fname,
        parent_id: o_newVersion.data.parentid,
        fver: o_newVersion.data.fver,
        fsize: o_newVersion.data.fsize
      }
    }
  }



  /**
   * @returns {Promise<{ok:Boolean,msg:String,data:{
    * fileid:String,
    * fname:String,
    * parent_id:Number,
    * fver:Number
    * }}>}
   * @param {Number} fileid 
   * @param {String} fname 可选 如果不输入就产生随机的名字
   * @param {Number} parent_id 可选 最好是能输入fileid对应的parent——id
   */
  async smallMhtToCoverFileV2(fileid, parent_id = 0, fname = "") {
    let o_mhtContent = await GarbageMht.randomMhtV2();
    let mhtName = fname || `${rn({ integer: true })}.mht`;
    if (!o_mhtContent.ok) {
      return { ok: false, msg: `GarbageMht.randomMht FAIL:${o_mhtContent.msg}` }
    }
    let mhtContentBuffer = o_mhtContent.data.buf;
    let cStream = CombinedStream.create();
    // let xlsxPath = path.join(__dirname, "../DUMMY/random.xlsx");
    // let o_xlsxStats = await Toolbox.getStats(xlsxPath);
    // if (!o_xlsxStats.ok) {
    //   return { ok: false, msg: `stats error:${o_xlsxStats.msg}` }
    // }
    // cStream.append(fs.createReadStream(xlsxPath));
    cStream.append(mhtContentBuffer);
    // let combiedSize = mhtContentBuffer.byteLength + o_xlsxStats.stats.size
    let o_post_ksyun = await this.kd.POST_WPSFILE_KSYUN(cStream, mhtContentBuffer.byteLength,
      "application/octet-stream",
      mhtName, parent_id);
    if (!o_post_ksyun.ok) {
      return { ok: false, msg: `POST_WPSFILE_KSYUN fail:${o_post_ksyun.msg}` }
    }
    let o_newVersion = await this.kd.APIV5_files_file_PUT_as_new_version(fileid, o_post_ksyun.data.key,
      o_post_ksyun.data.etag, o_post_ksyun.data.newfilename_sha1, mhtContentBuffer.byteLength, o_post_ksyun.data.store);
    if (!o_newVersion.ok) {
      return { ok: false, msg: `APIV5_files_file_PUT_as_new_version FAIL:${o_newVersion.msg}` }
    }
    return {
      ok: true, msg: "ok",
      data: {
        fileid: o_newVersion.data.fileid,
        fname: o_newVersion.data.fname,
        parent_id: o_newVersion.data.parentid,
        fver: o_newVersion.data.fver
      }
    }
  }

  /**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
  * fileid:String,
  * fname:String,
  * parent_id:Number,
  * fver:Number
  * }}>}
 * @param {Number} fileid 
 * @param {String} fname 可选 如果不输入就产生随机的名字
 * @param {Number} parent_id 可选 最好是能输入fileid对应的parent——id
 */
  async useReadmeMdToCoverFile(fileid, parent_id = 0, fname = "") {
    let readmePath = path.join(__dirname, "../READMD.md");
    let o_stats = await Toolbox.getStats(readmePath);
    if (!o_stats.ok) {
      return { ok: false, msg: "stats fail" + o_stats.msg }
    }
    let file_name = fname || "readme.md";
    let fStream = fs.createReadStream(readmePath);
    let o_post_ksyun = await this.kd.POST_WPSFILE_KSYUN(fStream, o_stats.stats.size, "text/plain", file_name, parent_id);
    if (!o_post_ksyun.ok) {
      return { ok: false, msg: `POST_WPSFILE_KSYUN fail:${o_post_ksyun.msg}` }
    }
    let o_newVersion = await this.kd.APIV5_files_file_PUT_as_new_version(fileid, o_post_ksyun.data.key,
      o_post_ksyun.data.etag, o_post_ksyun.data.newfilename_sha1, o_stats.stats.size, o_post_ksyun.data.store);
    if (!o_newVersion.ok) {
      return { ok: false, msg: `APIV5_files_file_PUT_as_new_version FAIL:${o_newVersion.msg}` }
    }
    return {
      ok: true, msg: "ok",
      data: {
        fileid: o_newVersion.data.fileid,
        fname: o_newVersion.data.fname,
        parent_id: o_newVersion.data.parentid,
        fver: o_newVersion.data.fver
      }
    }
  }


  /**
   * @returns {import("events").EventEmitter}
   * @param {String} rar_path 
   * @param {Number} parent_id 
   */
  uploadRarFileTask(rar_path, parent_id = 0) {
    let ev = new events.EventEmitter;
    let EVENT_NAMES = {
      state_change: "state_change",
      error: "error",
      speed: "speed",
      complete: "complete"
    };
    ev.emit(EVENT_NAMES.state_change, "等待任务开始");
    let taskGen = () => new Promise(async task_finish => {
      ev.emit(EVENT_NAMES.state_change, "任务开始");
      let step1 = await this.getAvailableMhtFileid(parent_id);
      if (!step1.ok) {
        ev.emit(EVENT_NAMES.error, `getAvailableMhtFileid(${parent_id}):${step1.msg}`)
        return task_finish();
      }
      ev.emit(EVENT_NAMES.state_change, "已获得fileid");
      let step2_randomMHT = await GarbageMht.randomMht();
      if (!step2_randomMHT.ok) {
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
      cStream.append(step2_randomMHT.data.buf);
      cStream.append(fStream);
      let combined_size = step2_randomMHT.data.buf.byteLength + o_file_stats.stats.size;
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
      let step3_post = await this.kd.POST_WPSFILE_KSYUN(cStream, combined_size, "multipart/related", step1.data.fname,
        step1.data.parent_id);
      clearInterval(interval_mark);
      ev.emit(EVENT_NAMES.speed, { speed: 0, speed_text: "done" });
      if (!step3_post.ok) {
        ev.emit(EVENT_NAMES.error, `POST_WPSFILE_KSYUN:${step3_post.msg}`)
        return task_finish();
      }
      ev.emit(EVENT_NAMES.state_change, "作为新版本");
      // let step4_as_newver = await this.kd.APIV5_files_file_PUT_as_new_version(step1.data.fileid, step3_post.data.key,
      //   step3_post.data.etag, step3_post.data.newfilename_sha1, combined_size, step3_post.data.store);
      let step4_use_post = await this.kd.APIV5_files_file_asNewFile(step3_post.data.etag, step3_post.data.key,
        step1.data.fname, step3_post.data.newfilename_sha1, combined_size, step1.data.parent_id, step3_post.data.store)
      // debugger
      if (!step4_use_post.ok) {
        ev.emit(EVENT_NAMES.error, `PUT_as_new_version:${step4_use_post.msg}`)
        return task_finish();
      }
      // debugger
      console.log("fver", step4_use_post.data.fver, "\n", "fsha", step4_use_post.data.fsha);
      // await new Promise(r => setTimeout(r, 5000))
      let log_his = await this.kd.APIV3_get_file_histories(step1.data.fileid);
      let fetchfetch = await this.kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST('https://drive.kdocs.cn/api/v3/spaces');
      await this.kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST(`https://drive.kdocs.cn/api/v5/groups/${this.kd.mycloud_groupid
        }/files?linkgroup=true&include=acl,pic_thumbnail&offset=0&count=20&orderby=mtime&order=DESC&append=false&parentid=${parent_id}&reset=true`)
      // debugger
      ev.emit(EVENT_NAMES.state_change, "覆盖随机MHT文件");
      let step5_cover = await this.kd.app.smallMhtToCoverFile(step1.data.fileid,
        step1.data.parent_id, step1.data.fname);
      if (!step5_cover.ok) {
        ev.emit(EVENT_NAMES.error, `app.smallMhtToCoverFile:${step5_cover.msg}`)
        return task_finish();
      }
      let step6_his = await this.kd.APIV3_get_file_histories(step1.data.fileid);
      if (!step6_his.ok) {
        ev.emit(EVENT_NAMES.error, `APIV3_get_file_histories:${step6_his.msg}`)
        return task_finish();
      }
      let my_fver = step4_use_post.data.fver;
      let my_history = step6_his.data.histories.find(e => {
        if (e.fver == my_fver) {
          // debugger
          return true
        }
        if (step4_use_post.data.fsha === e.fsha) {
          // debugger
          return true;
        }
        return false;
      });
      let my_history_id = 0;
      if (my_history) {
        my_history_id = my_history.id;
        ev.emit(EVENT_NAMES.complete, {
          full_path: rar_path,
          file_id: step1.data.fileid,
          groupid: this.kd.mycloud_groupid,
          fver: my_fver,
          history_id: my_history_id,
          fsha: step4_use_post.data.fsha,
          fname: step4_use_post.data.fname,
          fsize: combined_size
        });
        return task_finish();

      }
      debugger
      console.log("没有对应history");
      let count = 1;
      while (true) {
        console.log("第", count, "次尝试")
        let o_put = await this.kd.APIV5_files_file_PUT_as_new_version(step1.data.fileid, step3_post.data.key,
          step3_post.data.etag, step3_post.data.newfilename_sha1, combined_size, step3_post.data.store);
        if (!o_put.ok) {
          debugger
        }
        let my_fsha = o_put.data.fsha;
        let o_cover = null;
        if (count < 20) {
          o_cover = await this.kd.app.smallMhtToCoverFile(step1.data.fileid,
            step1.data.parent_id, step1.data.fname);
            console.log("--使用Mht思路")
        } else {
          o_cover = await this.kd.app.smallDummyFileToCoverFile(step1.data.fileid,
            step1.data.parent_id, step1.data.fname)
            console.log("--使用dummyFile")
        }

        if (!o_cover.ok) {
          debugger
        }
        let o_history = await this.kd.APIV3_get_file_histories(step1.data.fileid);
        if (!o_history.ok) {
          debugger
        }
        let found = o_history.data.histories.find(e => e.fsha == my_fsha && e.id)
        if (found) {
          debugger
          "终于成功了"
          let my_history_id = found.id;
          ev.emit(EVENT_NAMES.complete, {
            full_path: rar_path,
            file_id: step1.data.fileid,
            groupid: this.kd.mycloud_groupid,
            fver: found.fver,
            history_id: my_history_id,
            fsha: my_fsha,
            fname: step4_use_post.data.fname,
            fsize: combined_size
          });
          return task_finish();
        }
        // debugger
        count++;
        
      }
      // my_history = 0;
      ev.emit(EVENT_NAMES.error, `没有对应history？`)

      return task_finish();



    });
    this.task_queue.add(taskGen);

    return ev;
  }





}

/**
 * 
 * @returns {string} 得到一个客户端生成的CSRF TOKEN
 */
function CreateCsrfToken() {
  let e = "";
  for (var n = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678", r = n.length, i = 0; i < 32; i++) {
    e += n.charAt(Math.floor(Math.random() * r));
  }
  return e;
}

/**
 * @returns {Promise<{ok:Boolean,msg:String,
  * data:{
  * kdv2021:KDStore2021
  * }}>}
 * @param {String} wps_sid 
 */
function GetKdstoreByWpssid(wps_sid) {
  return new Promise(resolve => {
    let kd = new KDStore2021;
    kd.axios.get('https://www.kdocs.cn/?show=all', {
      headers: {
        cookie: `wps_sid=${wps_sid}`,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
      }
    }).then(async axresp => {
      if (axresp.headers && axresp.headers["set-cookie"]) {
        let parsed = setCookieParser.parse(axresp.headers['set-cookie']);
        if (parsed && parsed.length) {
          let hasValue = parsed.filter(e => !!e.value);
          hasValue.forEach(e => {
            kd.__appendCookies.push({
              name: e.name,
              value: e.value
            })
          })
        }
      }
      let matched_groupid = axresp.data.match(/"myCloud":{"id":([0-9]+),/);
      if (matched_groupid && matched_groupid.length == 2) {
        let groupid = Number(matched_groupid[1]);
        kd.mycloud_groupid = groupid;
      } else {
        return resolve({
          ok: false,
          msg: `cant't get groupid from HTML`
        })
      }
      kd.wps_sid = wps_sid;
      kd.csrf_token = CreateCsrfToken();
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST('https://plus.kdocs.cn/ops/opsd/api/v1/policy?window_key=web_application_list');
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST('https://plus.kdocs.cn/sysadmin/api/v1/me/operations/strategies?positions=web_left_enterprise_entrance');
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://drive.kdocs.cn/api/v3/tags/2/items?offset=0&count=20");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://drive.kdocs.cn/api/v3/userinfo");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://drive.kdocs.cn/api/v3/groups/special");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://drive.kdocs.cn/api/v3/groups/tmp");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://drive.kdocs.cn/api/v5/groups/special/files?linkgroup=true&include=pic_thumbnail&offset=0&count=20&orderby=mtime&order=DESC&append=false");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://drive.kdocs.cn/api/v3/spaces");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST('https://open.kdocs.cn/serviceapi/third/menu');
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST('https://www.kdocs.cn/kd/api/scenes?types=pcWebNewPage,pcWebRecent');
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://www.kdocs.cn/3rd/plus/sysadmin/api/v1/me/operations/strategies?positions=web_left_enterprise_below_entrance");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://www.kdocs.cn/kd/api/configure/list?idList=operationPositionConfig");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://www.kdocs.cn/kd/api/configure/list?idList=BrowserNoticeGuide");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://www.kdocs.cn/kd/api/user/config?key=shareGuide");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST('https://www.kdocs.cn/kd/api/user/config?key=jinxiaomenghello');
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST('https://www.kdocs.cn/kd/api/user/config?key=spaceFull');
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://www.kdocs.cn/kdg/api/v1/cards/new-page?scenes=new_page");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://www.kdocs.cn/kdg/api/v1/cards/new-page?scenes=folder_right_menu");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://www.kdocs.cn/kdg/api/v1/cards/new-page?scenes=documents_list_top");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://www.kdocs.cn/kdg/api/v1/configure?idList=forbidSider&urlParams=c2hvdz1hbGw=");
      kd.PREPARE_FUNCTIONS.USELESS_GET_REQUEST("https://www.kdocs.cn/kdg/api/v1/whitelist/OutlineWhitelistConfigure");
      return resolve({
        ok: true,
        msg: "ok",
        data: {
          kdv2021: kd
        }
      })


    }).catch(axerr => {
      if (axerr.response && axerr.response.status == 302) {
        return resolve({
          ok: false,
          msg: `HTTP 302:${axerr.response.headers.location}`
        })
      }

      return CommonAHG(resolve)(axerr);
    })
  })
}


module.exports = {
  GetKdstoreByWpssid
}