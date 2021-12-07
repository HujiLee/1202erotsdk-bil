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
  // let o_kd = await LIB.GetKdstoreByWpssid('V02S2W_2E4DqgA19ZhRJs2B7EAW4NtY00a1449b3004da54f06');
  // process.env['KdocsUserZhushi'] = "长沙王牌沙雕测试"
  // const PARENT_ID = 145458924596;
  let o_kd = await LIB.GetKdstoreByWpssid('V02Slsu21U9o4HXsTgfiy_XTvNpxYvM00a07e2cb003d18ab1d');
  process.env['KdocsUserZhushi'] = "会员号ID 1025026845绑定小米6336839973"
  const PARENT_ID = 145473224641;
  if (!o_kd.ok) {
    console.log("kd get fail:" + o_kd.msg)
    return process.exit(0);
  }
  let kd = o_kd.data.kdv2021;
  let tasks = avai_paths.filter(e => e.stats.isDirectory()).map(ap => async cb => {
    console.log("尝试上传文件夹", ap.full_path)
    let upload = await kd.app.v2.uploadUploadifiedDir(ap.full_path, PARENT_ID);
    if (upload.ok) {
      console.log("OKDONE", ap.full_path)
    } else {
      console.log("FAIL=", ap.full_path, upload.msg)
    }
    cb();
  });
  runParallel(tasks, 1, () => {
    console.log("kdocs --done")
    process.exit(0);
  })
})