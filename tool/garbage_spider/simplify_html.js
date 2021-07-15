const DOMParser = require("xmldom").DOMParser;
let domParser = new DOMParser();

function simplify(text){
  let str = text;
  while(str.match(/\s\s/)){
    // debugger
    str = str.replace(/\s\s/g," ")
  }
  while(str.match(/>\s</)){
    str = str.replace(/>\s</g,"><")
  }
  while(true){
    let matched = str.match(/class=\"[^"]*\"/);
    if(matched&&matched.length){
      // debugger
      str  = str.replace(/class=\"[^"]*\"/g,"")
    }else{
      break;
    }
    // debugger
  }
  // let doc = domParser.parseFromString(str);
  // debugger
  return str;
}

module.exports = simplify