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
  let tasks = avai_paths.filter(e => e.stats.isDirectory()).map(ap => async cb => {
    let olist = await Toolbox.safeListDir();
    let pics = olist.filter(e => {
      let picpath = e.relative_path.toLowerCase();
      if (picpath.startsWith("保留-")) {
        return false;
      }
      if (picpath.endsWith(".png")
        || picpath.endsWith(".jpg")
        || picpath.endsWith(".jpeg")
        || picpath.endsWith(".bmp")
      ) {
        return true;
      }
    });
    if (pics.length > 4) {
      for (let i = 3; i <= pics.length - 1; i++) {
        let toDelPath = pics[i].full_path;
        await fs.unlink(toDelPath);
      }
    }
    cb();
  });
  runParallel(tasks, 1, () => {
    console.log("kdocs --done")
    process.exit(0);
  })
})