const xpath = require("xpath");
const setCookieParser = require("set-cookie-parser");
const DOMParser = require("xmldom").DOMParser;
let domParser = new DOMParser();
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
 * feed_list:Array<{
 * data:{
 * id:String
 * }
 * }>
 * }
 * }>}
 * @param {Number} page 
 */
function indexAjaxFeed(page = 1) {
  return new Promise(resolve => {
    axios.get(`https://trips.tuniu.com/travels/index/ajax-list`, {
      params: {
        sortType: 1,
        page: page,
        limit: 10,
        _: Date.now()
      },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        referer: 'https://trips.tuniu.com/',
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
      if (axresp.data.data.rows) {
        return resolve({
          ok: true, msg: "ok",
          data: {
            feed_list: axresp.data.data.rows
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
    let o_feed = await indexAjaxFeed(rn({ integer: true, min: 1, max: 6 }));
    if (!o_feed.ok) {
      return resolve({
        ok: false,
        msg: `get feed list fail:${o_feed.msg}`
      })
    }
    let item = o_feed.data.feed_list[0];
    let link = `https://m.tuniu.com/trips/${item.id}/`
    let o_HTML_TEXT_RAW = await axiosGetContent(axios, link);
    if (!o_HTML_TEXT_RAW.ok) {
      return resolve({
        ok: false,
        msg: `GET HTML FAIL:${o_HTML_TEXT_RAW.msg}`
      })
    }
    try {
      let doc = domParser.parseFromString(o_HTML_TEXT_RAW.data.html_content);
      let nodes = xpath.select('//article', doc);
      if (!nodes.length) {
        return resolve({
          ok: false,
          msg: `xpath select fail`
        })
      }
      let ctts = [];
      let images_tag = `<img src="${item.authorHeadImg.replace("https://", "http://")}">` + `<img src="${item.picUrl.replace("https://", "http://")}">`
      ctts.push(images_tag);
      ctts.push(simplifyHtml(nodes[0].toString()));
      return resolve({
        ok: true,
        msg: "ok",
        data: {
          content: ctts.join("\n<br>")
        }
      })
      debugger
    } catch (e) {
      return resolve({
        ok: false,
        msg: e
      })
    }

  })
}



module.exports = {
  indexAjaxFeed,
  getContent
}