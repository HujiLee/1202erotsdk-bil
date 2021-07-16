const { Buffer } = require("buffer");
const rs = require("randomstring");
const rn = require("random-number");


function zuzhuangV2(htmlcontent) {
  let next_part = `----=_NextPart_${rs.generate({ length: 12 })}`
  let headers = ["Subject: 愉♂悦研究会.mht341",
    "MIME-Version: 1.0",
    "Content-Type:multipart/related;",
    "	charset=\"utf-8\"",
    "	type=\"text/html\";",
    `	boundary="${next_part}"`,
    "",
    `--${next_part}`,
    "Content-Type: text/html",
    "Content-Transfer-Encoding:7bit",
    "",
    "<html xmlns=\"http://www.w3.org/1999/xhtml\"><head>",
    "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />",
    "<title>QQ Message</title>",
    "<style type=\"text / css\">body{font-size:12px; line-h…ize:12px; line-height:22px;}</style></head><body>"
  ];
  let str = headers.join('\n');
  let suijishazi = `<br>${rs.generate({ length: 100 })}<hr>`
  str = str + `${htmlcontent}${suijishazi}</body></html>`
  str = str + `\n\n--${next_part}\n\r`
  // str = suijishazi + str;
  // str = suijishazi;
  return Buffer.from(str);
}



/**
 * @returns {Promise<{ok:Boolean,msg:String,data:{
  * buf:Buffer
  * }}>}
  */
async function randomEml() {
  let libs = [require("./garbage_spider/cctv"),
  require("./garbage_spider/huanqiu"),
  require("./garbage_spider/tuniu"),
  require("./garbage_spider/soyoung"),
  // require("./garbage_spider/sohu")
  ];

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
  let mhtBuffer2 = zuzhuangV2(rs.generate({ length: 6000 }));
  return { ok: true, msg: "ok", data: { buf: mhtBuffer2 } }

}




module.exports = {
  randomEml: randomEml
}