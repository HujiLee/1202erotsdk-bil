#!/usr/bin/env node
const args = require("args");
const path = require("path");
const fs = require("fs");
const process = require("process");
const runParallel = require("run-parallel-limit");
const getUploadPaths = require("./get_upload_paths.js").getUploadPaths;
let cwd = process.cwd()
console.log("cwd :", cwd);
let flags = args.parse(process.argv);
let sub = args.sub;
const LIB = require("../lib");


getUploadPaths(cwd, sub).then(async avai_paths => {
  let o_kd = await LIB.GetKdstoreByWpssid('V02STM1ligb43rsiOc7StUsChFaOj-I00aced2b5003d18ab1d');
  if (!o_kd.ok) {
    console.log("kd get fail:" + o_kd.msg)
    return process.exit(0);
  }
  let kd = o_kd.data.kdv2021;
  let tasks = avai_paths.map(ap => async cb => {
    let ev = kd.app.uploadRarFileTask(ap.full_path, 124664194208);
    let pp = ap.full_path;
    ev.on("error", (args) => {
      console.log(pp, "error", args)
      cb();
    });
    ev.on("speed", (args) => {
      // debugger
      console.log(pp, args.speed_text)
    });
    ev.on("complete", (args) => {
      console.log(pp, JSON.stringify(args))
      cb();
    });
    ev.on("state_change", (msg) => {
      console.log(pp, msg)
    })
  });
  runParallel(tasks,3,()=>{
    console.log("kdocs --done")
    process.exit(0);
  })
})