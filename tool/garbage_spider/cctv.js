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
    axios.get(`https://news.cctv.com/2019/07/gaiban/cmsdatainterface/page/tech_1.jsonp?cb=tech`, {
      params: {

      },
      headers: {
        // 'x-requested-with': 'XMLHttpRequest',
        referer: 'https://news.cctv.com/tech/mobile/?spm=C96370.PW8IYPX3ODYg.EEESJDxf23zq.9',
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
      let tech = (x) => {
        // debugger
        return resolve({
          ok: true,
          msg: "ok",
          data: {
            feed_list: x.data.list
          }
        })
      }
      try {
        eval(axresp.data);
      } catch (err) {
        return resolve({
          ok: false,
          msg: `jsonp eval fail:${err}`
        })
      }

      // debugger


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
    let item = o_feed.data.feed_list[rn({ integer: true, min: 0, max: o_feed.data.feed_list.length - 1 })];
    // debugger
    let link = item.url;
    let o_HTML_TEXT_RAW = await axiosGetContent(axios, link);
    if (!o_HTML_TEXT_RAW.ok) {
      return resolve({
        ok: false,
        msg: `GET HTML FAIL:${o_HTML_TEXT_RAW.msg}`
      })
    }
    try {
      let doc = domParser.parseFromString(o_HTML_TEXT_RAW.data.html_content);
      let nodes = xpath.select('//*[@id="content_area"]', doc);
      if (!nodes.length) {
        return resolve({
          ok: false,
          msg: `xpath select fail`
        })
      }
      let ctts = [];
      let images_tag = `<img src="${item.image.replace("https://", "http://")}">`
      ctts.push(`<h2>${item.title}</h2>`);
      ctts.push(images_tag);
      ctts.push(nodes[0].textContent);
      return resolve({
        ok: true,
        msg: "ok",
        data: {
          content: ctts.join("\n<br>")
        }
      })
    } catch (e) {
      return resolve({
        ok: false,
        msg: e
      })
    }

    debugger
  })
}



module.exports = {
  indexAjaxFeed,
  getContent
}