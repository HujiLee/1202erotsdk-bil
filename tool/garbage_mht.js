const { Buffer } = require("buffer");
const rs = require("randomstring");
const rn = require("random-number");

function zuzhuangV1(htmlcontent) {
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
  let suijishazi = `<br>${rs.generate({ length: 100 })}<hr>`
  str = str + `\n<BODY>${htmlcontent}${suijishazi}</BODY></HTML>`
  return Buffer.from(str);
}
function zuzhuangV2(htmlcontent) {
  let next_part = `----=_NextPart_${rs.generate({ length: 12 })}`
  let headers = ['From: <Save by Tencent MsgMgr>'
    , 'Subject: Tencent IM Message'
    , 'MIME-Version: 1.0'
    , 'Content-Type:multipart/related;'
    , '\tcharset=\"utf-8\"'
    , '\ttype=\"text/html\";'
    , `\tboundary=\"${next_part}\"`,
    '',
    `--${next_part}`,
    'Content-Type: text/html',
    'Content-Transfer-Encoding:7bit',
    '',
  ];
  let str = headers.join('\n');
  let suijishazi = `<br>${rs.generate({ length: 1000 })}<hr>`
  str = str + `\n<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; 
  charset=UTF-8" /><title>QQ Message</title><style type="text/css">body{font-size:12px; line-height:22px; margin:2px;}td{font-size:12px; line-height:22px;}</style></head><body>${htmlcontent}</BODY></HTML>`
  str = str + `\n\n--${next_part}\n\r`
  // str = suijishazi + str;
  str = suijishazi;
  return Buffer.from(str);
}

/**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
 * buf:Buffer
 * }}>}
 */
async function randomMht() {
  let libs = [
    require("./garbage_spider/cctv"),
    require("./garbage_spider/huanqiu"),
    // require("./garbage_spider/tuniu"),
    require("./garbage_spider/soyoung"),
    require("./garbage_spider/sohu")
  ];
  let ramArray = [1, 2, 3, 4, 5].map(_ => {
    let num = rn({ integer: true, min: 0, max: libs.length - 1 });
    return num
  })
  for (let libPachongIndex of ramArray) {
    let libPachong = libs[libPachongIndex];
    let o_get = await libPachong.getContent();
    if (o_get.ok) {
      let mhtBuffer = zuzhuangV1(o_get.data.content);
      return { ok: true, msg: "ok", data: { buf: mhtBuffer } }
    }
  }
  let mhtBuffer2 = zuzhuangV1(rs.generate({ length: 600 }))
  return { ok: true, msg: "ok", data: { buf: mhtBuffer2 } }
}

/**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
  * buf:Buffer
  * }}>}
  */
async function randomMhtV2() {
  let libs = [require("./garbage_spider/cctv"),
  require("./garbage_spider/huanqiu"),
  require("./garbage_spider/tuniu"),
  require("./garbage_spider/soyoung"),
  require("./garbage_spider/sohu")
  ];
  let mhtBuffer2 = zuzhuangV2(rs.generate({ length: 6000 }));
  return { ok: true, msg: "ok", data: { buf: mhtBuffer2 } }
  let ramArray = [1, 2, 3, 4, 5].map(_ => {
    let num = rn({ integer: true, min: 0, max: libs.length - 1 });
    return num
  })
  for (let libPachongIndex of ramArray) {
    let libPachong = libs[libPachongIndex];
    let o_get = await libPachong.getContent();
    if (o_get.ok) {
      let mhtBuffer = zuzhuangV2(o_get.data.content);
      return { ok: true, msg: "ok", data: { buf: mhtBuffer } }
    }
  }


}




module.exports = {
  zuzhuang: zuzhuangV1,
  randomMht,
  randomMhtV2
}