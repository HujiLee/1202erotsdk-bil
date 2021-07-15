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
    axios.get(`https://m.soyoung.com/site/index-ajax-feed`, {
      params: {
        page: page,
        menu_id: 0,
        menu_name: '推荐',
        part: 2,
        cityId: 0,
        newFeed: 1
      },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        referer: 'https://m.soyoung.com/?cityId=218&cityName=%E8%B5%A3%E5%B7%9E%E5%B8%82',
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
      if (axresp.data.feed_list) {
        return resolve({
          ok: true, msg: "ok",
          data: {
            feed_list: axresp.data.feed_list
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
    let link = `https://m.soyoung.com/p${item.data.id}/`
    let o_HTML_TEXT_RAW = await axiosGetContent(axios, link);
    if (!o_HTML_TEXT_RAW.ok) {
      return resolve({
        ok: false,
        msg: `GET HTML FAIL:${o_HTML_TEXT_RAW.msg}`
      })
    }
    try {
      let doc = domParser.parseFromString(o_HTML_TEXT_RAW.data.html_content);//这里可能parse失败？
      let nodes = xpath.select('//*[@id="contentBox"]', doc);
      if (!nodes.length) {
        return resolve({
          ok: false,
          msg: `xpath select fail`
        })
      }
      let ctts = [];
      let images_tag = item.data.img_list.map(e => `<img src="${e.u_z.replace("https://", "http://")}">`).join("\n<br>");
      ctts.push(images_tag);
      ctts.push(nodes[0].toString());
      return resolve({
        ok: true,
        msg: "ok",
        data: {
          content: ctts.join("\n<br>")
        }
      })
    } catch (e) {
      debugger
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