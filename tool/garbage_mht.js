const { Buffer } = require("buffer");
const rs = require("randomstring");

function zuzhuang(htmlcontent) {
  let headers = ['MIME-Version: 1.0'
    , 'Content-Type: text/html;'
    , 'charset="utf-8"'
    , 'Content-Transfer-Encoding: 7bit'
    , 'Content-Location: '
    , 'X-MimeOLE: Produced By Microsoft MimeOLE V6.00.2900.5931'
    , '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">', '', '<HTML><HEAD>',
    '<META http-equiv=Content-Type content="text/html; charset=utf-8">',
    '<META content="MSHTML 6.00.2900.5583" name=GENERATOR></HEAD>'];
  let str = headers.join('\n');
  str = str + `\n<BODY>${htmlcontent}</BODY></HTML>`
  return Buffer.from(str);
}




module.exports = {
  zuzhuang
}