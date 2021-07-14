const LIB = require("../lib");
const toolbox = require("../tool/toolbox");
const path = require("path");
const fs = require("fs");
const CombinedStream = require('combined-stream');

LIB.GetKdstoreByWpssid("V02STM1ligb43rsiOc7StUsChFaOj-I00aced2b5003d18ab1d").then(async x => {
  // debugger
  let kd = x.data.kdv2021;
  // let otest = await kd.APIV5_files_upload_create(0,"123.rar",555)
  // let otest2 = await kd.POST_WPSFILE_KSYUN()
  let cStream = CombinedStream.create();
  let p1 = path.join(__dirname, "../tmp/90.mht")
  let p2 = path.join(__dirname, "../tmp/02.rar")
  let o_statsHead = await toolbox.getStats(p1);
  let o_statsFile = await toolbox.getStats(p2);
  let combinedSize = o_statsFile.stats.size + o_statsHead.stats.size;
  let f1 = fs.createReadStream(p1);
  let f2 = fs.createReadStream(p2);
  cStream.append(f1).append(f2);
  let otest3 = await kd.POST_WPSFILE_KSYUN(cStream, combinedSize, "multipart/related", Math.random() + ".mht", 0)
  otest3.data.ev.on("error", (args) => {
    debugger
  })
  otest3.data.ev.on("ok", (args) => {
    debugger
  })
  debugger
})