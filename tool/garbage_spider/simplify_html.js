const DOMParser = require("xmldom").DOMParser;
let domParser = new DOMParser();
const xpath = require("xpath");

function simplify(htmlText) {
  let str = htmlText;
  str = tupianCaozuo(str);
  while (str.match(/\s\s/)) {
    // debugger
    str = str.replace(/\s\s/g, " ")
  }
  while (str.match(/>\s</)) {
    str = str.replace(/>\s</g, "><")
  }
  while (true) {
    let matched = str.match(/class=\"[^"]*\"/);
    if (matched && matched.length) {
      // debugger
      str = str.replace(/class=\"[^"]*\"/g, "")
    } else {
      break;
    }
    // debugger
  }
  // let doc = domParser.parseFromString(str);
  // debugger

  return str;
}

function tupianCaozuo(htmlText) {
  let doc = domParser.parseFromString(htmlText);
  let scripts = xpath.select('//script', doc);
  if(scripts.length){
    for(let sc of scripts){
      sc.parentNode.removeChild(sc)
      // debugger
    }
  }
  // debugger
  let tuniuNodes = xpath.select('//div[@data-img]', doc);
  for (let tn of tuniuNodes) {
    let imageLink = tn.getAttribute("data-img")
      .replace("https://", "http://").replace("?imageView2/2/w/640/h/0", "");
    // let img = doc.createElement("img");
    // img.setAttribute("src",imageLink);
    for (let c of Array.from(tn.childNodes)) {
      tn.removeChild(c);
    }
    tn.tagName = "img";
    tn.setAttribute("src", imageLink);
    tn.setAttribute("width", 800)
    // tn.appendChild(img)
    tn.removeAttribute("data-img")
    // debugger
  }
  // 
  let mafengwoNodes = xpath.select('//*[@data-img_url]', doc);
  if (mafengwoNodes.length) {
    for (let mfw of mafengwoNodes) {
      let imageLink = mfw.getAttribute("data-img_url");
      imageLink = imageLink.replace("https://", "http://").replace(/\?.*/, "");
      mfw.tagName = "img";
      for (let attr of Array.from(mfw.attributes).map(e => e.nodeName)) {
        mfw.removeAttribute(attr)
      }
      mfw.setAttribute("src", imageLink);
      mfw.setAttribute("width", 800)
      for (let c of Array.from(mfw.childNodes)) {
        mfw.removeChild(c);
      }
      // debugger
    }
    debugger
    // debugger
  }
  let sohuNodes = xpath.select('//img[@data-src]', doc);
  debugger
  if (sohuNodes.length) {
    for (let node of sohuNodes) {
      for (let c of Array.from(sohuNodes.childNodes)) {
        debugger
        if (c.tagName == "script") {
          debugger
        }
      }

    }
  }
  debugger


  //删除除了src href data-url外的所有属性
  let deleteAttrs = (root) => {
    let safeAttrs = ['src', 'href', 'data-url', 'width']
    if (root.attributes) {
      let attrs = Array.from(root.attributes).map(e => e.nodeName).filter(e => !safeAttrs.includes(e));
      if (attrs.length) {
        // debugger
        for (let attr of attrs) {
          root.removeAttribute(attr)
        }
      }



      // return;
    }
    try {
      for (let c of Array.from(root.childNodes)) {
        deleteAttrs(c)
      }
    } catch (meiyou_child) {
      return
    }


  }
  deleteAttrs(doc);

  return doc.toString()
}

module.exports = simplify