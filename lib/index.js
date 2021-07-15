const setCookieParser = require("set-cookie-parser");
const FormData = require("form-data");
const XLSX = require("xlsx");
const events = require("events");
const path = require("path");
const fs = require("fs");
const buffer = require("buffer");
const rn = require("random-number");
const QueuePromise = require("promise-queue");
const Pinyin = require("pinyin");
const Kuroshiro = require("kuroshiro/");
const CombinedStream = require('combined-stream');
const FirefoxUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0"
const Toolbox = require("../tool/toolbox");
const CommonAHG = require("../tool/CommonAxerrHandlerGenerator").CommonAxerrHandlerGen;

class KDStore2021 {
  constructor() {
    this.wps_sid = "";
    this.csrf_token = "";
    this.mycloud_groupid = 0;
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
            newfilename_sha1: args.newfilename_sha1
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
   * parent_id:Number
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
              parent_id: axresp.data.parentid
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
   * fname:String
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
              fver: axresp.data.fver
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