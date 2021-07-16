const glob = require("glob");
const union = require("lodash.union");
const path = require("path");
const Toolbox = require("../tool/toolbox");


/**
 * @param {String} cwd
 * @param {String[]} args_sub
 * @returns {Promise<Array<{full_path:String,stats:import("fs").Stats}>>}
 */
function getUploadPaths(cwd,args_sub) {
    let sub = args_sub;
    return new Promise(async resolve => {
      let find_files_by_glob = sub.map(p => new Promise((resolve, reject) => {
        glob(p, (err, matches) => {
          if (err) {
            return reject(err);
          } else {
            resolve(matches);
          }
        })
      }));
      let find_files_by_raw = sub.map(p => new Promise((resolve, reject) => {
        if (path.isAbsolute(p)) {
          resolve([path.resolve(p)]);
        } else {
          resolve([path.resolve(cwd, p)])
        }
      }));
      let all_mathches = await Promise.all([...find_files_by_glob, ...find_files_by_raw]);
      all_mathches = all_mathches.reduce((a, b) => a.concat(b));
      all_mathches = all_mathches.map(p => {
        let pp = path.resolve(cwd, p);
        return pp;
      });
      all_mathches = union(all_mathches);
      // debugger
      /**@type {Array<{full_path:String,stats:import("fs").Stats}> }*/
      let results = [];
      for (let p of all_mathches) {
        let o_stats = await Toolbox.getStats(p);
        if (o_stats.ok &&
          (o_stats.stats.isFile() || o_stats.stats.isDirectory())) {
          results.push({
            full_path: p,
            stats: o_stats.stats
          })
        }
      }
      resolve(results);
    })
  }


  module.exports = {
      getUploadPaths
  }