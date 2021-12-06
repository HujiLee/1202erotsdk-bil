const LIB = require("../lib");
const toolbox = require("../tool/toolbox");
const path = require("path");
const fs = require("fs-extra");
const CombinedStream = require('combined-stream');
const rs = require("randomstring");
const buffer = require("buffer");

LIB.GetKdstoreByWpssid("V02S2W_2E4DqgA19ZhRJs2B7EAW4NtY00a1449b3004da54f06").then(async x => {
  // debugger
  let kd = x.data.kdv2021;
  let i_test = await kd.app.v2.uploadUploadifiedDir(path.join(__dirname, "../tmp/1206"))
  // let otestest = await kd.APIV5_history_set_tag(145218513035,1,"");
  debugger
  let dist_dir = path.join(__dirname, "../tmp/real_file/RARs");
  let list_files = await toolbox.safeListDir(dist_dir);
  let myfiles = list_files.filter(e => e.stats.isFile())
  let tasks = myfiles.map(pp => {
    let ev = kd.app.v2.inputRarFile(pp.full_path, 124772302450);
    ev.on("error", (args) => {
      debugger
    });
    ev.on("speed", (args) => {
      // debugger
      // console.log(pp,args.speed_text)
    });
    ev.on("complete", (args) => {
      console.log(pp.relative_path, JSON.stringify(args))
    });
    ev.on("state_change", (msg) => {
      console.log(pp.relative_path, msg)
    })
  })


  // let otest = await kd.APIV5_files_upload_create(0,"123.rar",555)
  // let otest2 = await kd.POST_WPSFILE_KSYUN()

  let ff = async () => {
    let p1 = path.join(__dirname, "../tmp/tmp8.ra")
    let p2 = path.join(__dirname, "../tmp/90.zip");
    let tasks = [p1, p2].map(pp => {
      let ev = kd.app.v2.inputRarFile(pp, 124760483195);
      ev.on("error", (args) => {
        debugger
      });
      ev.on("speed", (args) => {
        // debugger
        // console.log(pp,args.speed_text)
      });
      ev.on("complete", (args) => {
        console.log(pp, JSON.stringify(args))
      });
      ev.on("state_change", (msg) => {
        console.log(pp, msg)
      })
    });


    let o_test789 = await kd.app.getAvailableEmlFileid(124698039528);
    let hiostories = [];
    // let oCover = await kd.app.smallEmlToCoverFile(o_test789.data.fileid, o_test789.data.parent_id, o_test789.data.fname);
    for (let i = 1; i <= 60; i++) {
      let o_history = await kd.APIV3_get_file_histories(o_test789.data.fileid);
      for (let his of o_history.data.histories.reverse()) {
        // debugger
        if (his.id) {
          if (!hiostories.find(e => e.fver == his.fver)) {
            hiostories.push(his);
          }
        }
      }
      console.log(hiostories.map(e => e.fver).join(","));
      let coverx = await kd.app.smallMhtToCoverFile(o_test789.data.fileid, o_test789.data.parent_id, o_test789.data.fname);
      // console.log(coverx.data.fver, coverx.data.fsize)
    }
    await fs.writeFile(path.join(__dirname, "./abcd.json"), JSON.stringify(hiostories));
    debugger
  }

  // let o_his = await kd.APIV3_get_file_histories(o_test789.data.fileid)
  // debugger
  // let oCpver = await kd.app.smallMhtToCoverFile(o_test789.data.fileid, o_test789.data.parent_id,
  //   o_test789.data.fname);
  // debugger
  // return
  let f = async () => {
    let cStream = CombinedStream.create();
    let p1 = path.join(__dirname, "../tmp/02.rar")
    let p2 = path.join(__dirname, "../tmp/90.mht")
    let o_statsHead = await toolbox.getStats(p1);
    let o_statsFile = await toolbox.getStats(p2);
    let combinedSize = o_statsFile.stats.size + o_statsHead.stats.size;
    let f1 = fs.createReadStream(p1);
    let f2 = fs.createReadStream(p2);
    cStream.append(f1).append(f2);
    cStream.
      // let otest3 = await kd.POST_WPSFILE_KSYUN(cStream, combinedSize, "multipart/related", Math.random() + ".mht", 0)
      debugger
    // let o_test = await kd.APIV5_files_file_asNewFile(otest3.data.etag,otest3.data.key,Math.random() + ".mht",otest3.data.newfilename_sha1,combinedSize,0);
    let dbgFolder = "124514263372";
    let otestest = await kd.APIV5_listfiles(dbgFolder);
    let onefile = otestest.data.files.filter(e => e.ftype == "file" && e.fname.endsWith("txt"))[0]
    let oup = await kd.POST_WPSFILE_KSYUN(cStream, combinedSize, 'application/octet-stream', onefile.fname, onefile.parentid);
    let onewver = await kd.APIV5_files_file_PUT_as_new_version(onefile.id, oup.data.key, oup.data.etag,
      oup.data.newfilename_sha1, combinedSize, oup.data.store);
    for (let i = 1; i <= 50; i++) {
      let st = CombinedStream.create();
      let buf = buffer.Buffer.from(rs.generate({ length: 8000 }));
      st.append(buf);
      let upup = await kd.POST_WPSFILE_KSYUN(st, buf.byteLength, "application/octet-stream", onefile.fname, onefile.parentid);

      let newversion = await kd.APIV5_files_file_PUT_as_new_version(onefile.id, upup.data.key, upup.data.etag, upup.data.newfilename_sha1, buf.byteLength,
        upup.data.store);
      if (upup.data.store == "ks3sh") {
        debugger
      }
      // debugger
    }
    debugger
  };

})