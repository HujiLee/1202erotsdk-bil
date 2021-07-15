const lib = require("../tool/garbage_spider/mafengwo");

lib.getContent().then(async xxx=>{
  debugger
  console.log(xxx.data.content)
  let t2 = await lib.getContent()
  debugger
})