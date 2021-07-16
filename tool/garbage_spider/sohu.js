const xpath = require("xpath");
const setCookieParser = require("set-cookie-parser");
const DOMParser = require("xmldom").DOMParser;
let domParser = new DOMParser({
  errorHandler: {
    error: () => { },
    warning: () => { },
    fatalError: () => { }
  }
});
const axios = require("axios").default.create({
  headers: {
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
  }
});
const rn = require("random-number");
const CommonAHG = require("../CommonAxerrHandlerGenerator").CommonAxerrHandlerGen;
const axiosGetContent = require("./get_html_content");
const simplifyHtml = require("./simplify_html");
const BingganPool = {
  ccks: {},
  get cookies_as_header() {
    let arr = [];
    for (let h in this.ccks) {
      // debugger
      arr.push(`${h}=${this.ccks[h]}`)
    }
    return arr.join("; ")
  }
}

/**
 * @return {Promise<{
 * ok:Boolean,msg:String,
 * data:{
 * feed_list:Array<{}>
 * }
 * }>}
 * @param {Number} page 
 */
function indexAjaxFeed(page = 1) {
  return new Promise(resolve => {
    axios.get(`https://v2.sohu.com/integration-api/mix/region/90`, {
      params: {
        secureScore: 50,
        page: page,
        size: 24,
        pvId: 0,
        mpId: 0,
        adapter: 'default',
        refer: '',
        spm: '',
        channel: 8
      },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        referer: 'https://m.sohu.com/ch/8?pvid=000115_3w_c&ivk_sa=1024320u',
        cookie: BingganPool.cookies_as_header
      }
    }).then(axresp => {
      if (axresp.headers && axresp.headers["set-cookie"]) {
        let parsed = setCookieParser.parse(axresp.headers['set-cookie']);
        if (parsed && parsed.length) {
          let hasValue = parsed.filter(e => !!e.value);
          hasValue.forEach(e => {
            BingganPool.ccks[e.name] = e.value
          })
        }
        BingganPool.cookies_as_header
        // debugger
      }
      // debugger
      if (axresp.data.data) {
        return resolve({
          ok: true, msg: "ok",
          data: {
            feed_list: axresp.data.data
          }
        })
      }
      throw axresp.data;
    }).catch(axerr => {
      CommonAHG(resolve)(axerr);
    })
  })
}

/**
 * @description 用于生成内容填充到MHT文件中
 * @returns {Promise<{ok:Boolean,msg:String,data:{
 * content:String
 * }}>}
 */
function getContent() {
  return new Promise(async resolve => {
    let o_feed = await indexAjaxFeed(rn({ integer: true, min: 1, max: 8 }));
    if (!o_feed.ok) {
      return resolve({
        ok: false,
        msg: `get feed list fail:${o_feed.msg}`
      })
    }
    let ok_list = o_feed.data.feed_list.filter(x => {
      if (x.adType) return false;
      if (!x.url) return false;
      if (x.imageInfoList.length&&x.type==2) {
        if (x.title && x.brief) {
          return true
        }
      }
      return false;
    })
    let item = ok_list[rn({integer:true,min:0,max:ok_list.length-1})];
    let link = `https://m.sohu.com${item.url}/`
    let o_HTML_TEXT_RAW = await axiosGetContent(axios, link);
    if (!o_HTML_TEXT_RAW.ok) {
      return resolve({
        ok: false,
        msg: `GET HTML FAIL:${o_HTML_TEXT_RAW.msg}`
      })
    }
    try {
      let doc = domParser.parseFromString(o_HTML_TEXT_RAW.data.html_content);//这里可能parse失败？
      let nodes = xpath.select('//article', doc);
      if (!nodes.length) {
        return resolve({
          ok: false,
          msg: `xpath select fail`
        })
      }
      let ctts = [];
      // let images_tag = item.data.img_list.map(e => `<img width=800 src="${e.u_z.replace("https://", "http://")}">`).join("\n<br>");
      // ctts.push(images_tag);
      ctts.push(`<h4>${item.title}</h4>`)
      if (Array.isArray(item.imageInfoList)) {
        let images_tag = item.imageInfoList.map(e => `<img width="800" src="${e.url.replace('https://', 'http://')}">`).join("\n<br>");
        ctts.push(images_tag);
      }
      ctts.push(simplifyHtml(nodes[0].toString()));
      // ctts.push(nodes[0].textContent)
      return resolve({
        ok: true,
        msg: "ok",
        data: {
          content: ctts.join("\n<br>")
        }
      })
    } catch (e) {
      debugger
      console.log(e);
      return resolve({
        ok: false,
        msg: e
      })
    }

    // debugger
  })
}



module.exports = {
  indexAjaxFeed,
  getContent
}