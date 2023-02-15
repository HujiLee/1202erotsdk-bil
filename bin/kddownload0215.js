#!/usr/bin/env node
const args = require("args");
const path = require("path");
const process = require("process");
const readline = require("readline");
const rl = readline.createInterface({
  output: process.stdout,
  input: process.stdin
});
const fs = require("fs-extra");
const runParallel = require("run-parallel-limit");
const nwget = require("wget-improved");
const getUploadPaths = require("./get_upload_paths.js").getUploadPaths;
let cwd = process.cwd()
console.log("cwd :", cwd);
let flags = args.parse(process.argv);
let sub = args.sub;
const LIB = require("../lib");

getUploadPaths(cwd, sub).then(async avai_paths => {
  let o_kd = await LIB.GetKdstoreByWpssid('V02Slsu21U9o4HXsTgfiy_XTvNpxYvM00a07e2cb003d18ab1d');
  process.env['KdocsUserZhushi'] = "会员号ID 1025026845绑定小米6336839973"
  const PARENT_ID = 145473224641;
  if (!o_kd.ok) {
    console.log("kd get fail:" + o_kd.msg)
    return process.exit(0);
  }
  let kd = o_kd.data.kdv2021;
  let tasks = avai_paths.filter(e => e.stats.isFile()).map(ap => async Lv1CB => {
    console.log("尝试下载KDSAVE", ap.full_path);
    let datakdsaved = null;
    try {
      datakdsaved = await fs.readJson(ap.full_path);
    } catch (e) {
      if (e.message && e.message.includes("Unexpected token : in JSON at position")) {
        console.log("不合法的json", ap.full_path);
        return Lv1CB();
      }
      console.log(e.stack);
      return Lv1CB();
      debugger
    }
    rl.write(`dirname is ${datakdsaved.dir_name}\n`);
    rl.write(`files count:${datakdsaved.files.length}\n`);
    await download(datakdsaved);
    // debugger
    Lv1CB();
  });
  runParallel(tasks, 1, () => {
    console.log("kdoc-dl --done")
    process.exit(0);
  });
  function download(datakdsaved) {
    return new Promise(async resolve => {
      let dir_name = datakdsaved.dir_name;
      let files = datakdsaved.files;
      let target_dir = path.join(cwd, dir_name)
      try {
        let mkdired = await fs.mkdir(target_dir);
      } catch (e) {
      }
      let existed = await fs.pathExists(target_dir);
      if (!existed) {
        target_dir = cwd;
      }
      let dltasks = files.map((file, fileIndex) => async Lv2CB => {
        file, fileIndex;
        // debugger
        let o_dllink = await kd.APIV3_get_history_download_FILES(file.cloud_file_id, file.cloud_history_id);
        if (!o_dllink.ok) {
          console.log("get dllink fail:", file.realname, o_dllink.msg);
          return Lv2CB();
        }
        let dlmachine = nwget.download(o_dllink.data.link, path.join(target_dir, file.realname), {
          headers: {
            referer: 'https://www.kdocs.cn/mine/' + PARENT_ID,
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5163.147 Safari/537.36',
            'cookie': `wpsua=V1BTVUEvMS4wICh3ZWIta2RvY3M6Q2hyb21lXzEwOC4wLjUxNjMuMTQ3OyBtYWM6T1MgWCBZb3NlbWl0ZTsgUWVjYUJkbjNRWi02T01URDEwMmQzUT09OlRXRmphVzUwYjNOb0lDQT0pIE1hY2ludG9zaC8=; csrf=awhf7XzywnYC4TRsJATK5jakB7jbrJdk; wps_sid=${kd.wps_sid}`
          }
        });
        dlmachine.on("error", (err) => {
          // debugger
          console.log(file.realname, err);
          Lv2CB();
        })
        dlmachine.on("start", (err) => {
          // console.log(file.realname, "finished!");
          process.stdout.write(`${file.realname}:`, 'utf-8')
        });
        dlmachine.on("end", (err) => {
          console.log(file.realname, "finished!");
          Lv2CB();
        });
        dlmachine.on("progress", (progress) => {
          // rl.write(file.realname + "\n");
          // rl.c
          // debugger
          let progressStr = `${parseFloat(progress).toFixed(5)}`
          // debugger
          rl.cursor
          // readline.clearLine(process.stdout,-1);
          
          // readline.cursorTo(process.stdout, 0, fileIndex + 5);
          process.stdout.write(`${progressStr}`, 'utf-8');
          readline.moveCursor(process.stdout, 0-progressStr.length, 0);
          // console.log()
        });

        // debugger
      });
      runParallel(dltasks, 1, () => {
        resolve();
      })
      // debugger
    })
  }
});

