#!/usr/bin/env node
const args = require("args");
const path = require("path");
const fs = require("fs-extra");
const jsonBeautify = require("json-beautify");
const process = require("process");
const runParallel = require("run-parallel-limit");
const getUploadPaths = require("./get_upload_paths.js").getUploadPaths;
let cwd = process.cwd();
const Toolbox = require("../tool/toolbox")
console.log("cwd :", cwd);
let flags = args.parse(process.argv);
let sub = args.sub;
const LIB = require("../lib");


getUploadPaths(cwd, sub).then(async avai_paths => {
  let aps = avai_paths.filter(e => e.stats.isDirectory());
  let allCmds = []
  for (let ap of aps) {
    let olist = await Toolbox.safeListDir(ap.full_path);
    // let notMp4 = olist.filter(e => e.stats.isDirectory() || !e.relative_path.endsWith(".mp4"));
    // if (notMp4.length) {
    //   console.log("必须只包含MP4file", ap.full_path);
    // }
    olist = olist.filter(e => {
      return e.relative_path.endsWith(".mp4")
        || e.relative_path.endsWith(".mkv")
        || e.relative_path.endsWith(".flv")
    })
    let sorted = olist.sort((a, b) => a.relative_path.localeCompare(b.relative_path));
    let MkvName = 'Merged' + sorted[0].relative_path.substr(sorted[0].relative_path.length - 20, 16) + ".mkv";
    let commandStr = `mkvmerge -o '${path.join(ap.full_path, MkvName)}' ${sorted.map(e => "'" + e.full_path + "'").join(" + ")};`
    allCmds.push(commandStr);
  }
  // debugger
  fs.writeFile(path.join(cwd, "allMerge" + Date.now() + ".sh"), allCmds.join("\n"));

})