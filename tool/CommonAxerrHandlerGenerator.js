const util = require("util");
const CommonAxerrHandlerGen = (resolve) => (axerr) => {
  if (axerr.response) {
    resolve({
      ok: false,
      msg: `HTTP ${axerr.response.status} ${axerr.response.statusText} : ${axerr.response.data ?
        axerr.response.data['err'] ? util.inspect(axerr.response.data['err']) :
          ((axerr.response.data['message'] ? util.inspect(axerr.response.data['message']) : util.inspect(axerr.response.data))) :
        "!NO HTTP RESPONSE DATA"}`
    })
  } else {
    resolve({
      ok: false,
      msg: axerr.message ? axerr.message : seemsLikeAxerr(axerr) ? stringfyAxerr(axerr) : util.inspect(axerr)
    });
  }
};

function seemsLikeAxerr(axerr) {
  return axerr.status && axerr.headers
    && axerr.config
}

function stringfyAxerr(axerr) {
  let data = '';
  if (axerr.data) {
    data = axerr.data;
  }
  if (!util.isString(data)) {
    data = util.inspect(data);
  }
  let status = axerr.status;
  let statusText = axerr.statusText;
  let headers = axerr.headers;
  let config = {
    url: axerr.config['url'],
    method: axerr.config['method'],
    data: axerr.config['data'],
    headers:axerr.config['headers']
  }
  return util.inspect({
    req: config,
    res: {
      status,
      statusText,
      headers,
      data
    }
  })
}



module.exports = {
  CommonAxerrHandlerGen: CommonAxerrHandlerGen
}