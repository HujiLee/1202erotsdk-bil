const axios = require("axios").default;//后面要注释掉
const CommonAHG = require("../CommonAxerrHandlerGenerator").CommonAxerrHandlerGen;

/**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
 * html_content:String
 * }}>}
 * @param {import("axios").AxiosInstance} axios_i
 * @param {"PC"|"Phone"} type
 */
function getContent(axios_i, link, type = "Phone") {
  let ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 OPR/76.0.4017.154'
  if (type == "Phone") {
    ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
  }
  return new Promise(resolve => {
    axios_i.get(link,{
      headers:{
        'User-Agent':ua
      }
    }).then(axresp => {
      // debugger
      if (axresp.headers["content-type"] && axresp.headers["content-type"].includes("html")) {
        return resolve({
          ok: true, msg: "ok",
          data: {
            html_content: axresp.data
          }
        })
      } else {
        return resolve({
          ok: false,
          msg: `content-type is ${axresp.headers["content-type"]}`
        })
      }
    }).catch(axerr => {
      CommonAHG(resolve)(axerr);
    })
  })
}


module.exports = getContent