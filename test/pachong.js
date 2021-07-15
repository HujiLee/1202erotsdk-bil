const lib = require("../tool/garbage_spider/mafengwo");
const fs = require("fs-extra");
const path = require("path");
const {Buffer} = require("buffer")

lib.getContent().then(async xxx=>{
  debugger
  // console.log(xxx.data.content)
  let MHT_CONTENT = `MIME-Version: 1.0\nContent-Type: text/html;\ncharset="utf-8"\nContent-Transfer-Encoding: 7bit\nContent-Location: \nX-MimeOLE: Produced By Microsoft MimeOLE V6.00.2900.5931`+
  `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">`+  
  `<HTML><HEAD>
  <META http-equiv=Content-Type content="text/html; charset=utf-8">
  <META content="MSHTML 6.00.2900.5583" name=GENERATOR></HEAD>
  <BODY>${xxx.data.content}</BODY></HTML>`;
  await fs.writeFile(path.join(__dirname,"../tmp/test.mht"),Buffer.from(MHT_CONTENT));
  // let t2 = await lib.getContent()
  debugger
})