const axios = require("axios").default;//后面要注释掉
const CommonAHG = require("../CommonAxerrHandlerGenerator").CommonAxerrHandlerGen;

/**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
 * html_content:String
 * }}>}
 * @param {import("axios").AxiosInstance} axios_i
 */
function getContent(axios_i, link) {
  return new Promise(resolve => {
    axios_i.get(link).then(axresp => {
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