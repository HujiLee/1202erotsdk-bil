const { Buffer } = require("buffer");
const rs = require("randomstring");
const rn = require("random-number");

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
/**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
 * buf:Buffer
 * }}>}
 */
async function randomMht() {
  let libs = [require("./garbage_spider/cctv"),
  require("./garbage_spider/huanqiu"),
  require("./garbage_spider/tuniu"),
  require("./garbage_spider/soyoung"),
  ];
  let ramArray = [1, 2, 3, 4, 5].map(_ => {
    let num = rn({ integer: true, min: 0, max: libs.length - 1 });
    return num
  })
  for (let libPachongIndex of ramArray) {
    let libPachong = libs[libPachongIndex];
    let o_get = await libPachong.getContent();
    if (o_get.ok) {
      let mhtBuffer = zuzhuang(o_get.data.content);
      return { ok: true, msg: "ok", data: { buf: mhtBuffer } }
    }
  }
  let mhtBuffer2 = zuzhuang(rs.generate({ length: 600 }))
  return { ok: true, msg: "ok", data: { buf: mhtBuffer2 } }
}




module.exports = {
  zuzhuang,
  randomMht
}