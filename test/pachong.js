const lib = require("../tool/garbage_spider/tuniu");
const fs = require("fs-extra");
const path = require("path");
const {Buffer} = require("buffer");
const garbage_mht = require("../tool/garbage_mht");

lib.getContent().then(async xxx=>{
  // debugger
  // console.log(xxx.data.content)
  let MHT_CONTENT = garbage_mht.zuzhuang(xxx.data.content);
  await fs.writeFile(path.join(__dirname,"../tmp/test.mht"),MHT_CONTENT);
  // let t2 = await lib.getContent()
  debugger
})