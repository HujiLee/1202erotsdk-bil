const lib = require("../tool/garbage_spider/tuniu");

lib.getContent().then(async xxx=>{
  debugger
  console.log(xxx.data.content)
  let t2 = await lib.getContent()
  debugger
})