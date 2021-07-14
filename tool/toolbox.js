const fs = require("fs");
const path = require("path");


class Toolbox {
  /**
   * @returns {Promise<{ok:Boolean,msg:string,stats:import("fs").Stats}>}
   * @param {String} full_path 
   */
  static getStats(full_path) {
    return new Promise(resolve => {
      fs.stat(full_path, (err, stats) => {
        if (err) {
          return resolve({
            ok: false,
            msg: err.message
          })
        }
        resolve({
          ok: true,
          msg: "ok",
          stats: stats
        })
      })
    })
  }

  /**
   * @description 返回文件夹下单层的子文件(夹)路径及其stats
 * @returns {Promise<Array<{relative_path:String,full_path:String,stats:import("fs").Stats}>>}
 * @param {String} full_Path_to_dir must be a dir
 */
  static safeListDir(full_Path_to_dir) {
    return new Promise(resolve => {
      fs.readdir(full_Path_to_dir, async (err, files) => {
        if (err) {
          console.error(err.message);
          return resolve([])
        }
        let o_getStats = await Promise.all(files.map(file => this.getStats(path.join(full_Path_to_dir, file))));
        let results = o_getStats.map((o, i) => {
          return {
            relative_path: files[i],
            o_get_stats: o,
            full_path: path.join(full_Path_to_dir, files[i])
          }
        });
        results = results.filter(r => r.o_get_stats.ok);
        let stats_results = results.map(e => {
          return {
            relative_path: e.relative_path,
            full_path: e.full_path,
            stats: e.o_get_stats.stats
          }
        })
        resolve(stats_results);
      })
    })
  }

  /**
   * @description 遍历到底,返回所有层次的子文件和文件夹及其stats,根据fullpath排了序
   * @returns {Promise<Array<{full_path:String,stats:import("fs").Stats}>>}
   * @param {String} full_Path_to_dir 
   */
  static safeListAllInDir(full_Path_to_dir) {
    return new Promise(async resolve => {
      /**@type {Array<{full_path:String,stats:import("fs").Stats}>} */
      let results = [];
      let o_listParent = await Toolbox.safeListDir(full_Path_to_dir);
      for (let ps of o_listParent) {
        results.push({
          full_path: ps.full_path,
          stats: ps.stats
        })
        if (ps.stats.isDirectory()) {
          let o_res = await Toolbox.safeListAllInDir(ps.full_path);
          results = results.concat(o_res);
        }
      }
      // debugger
      results = results.sort((a,b)=>a.full_path.localeCompare(b.full_path));
      resolve(results);

    })
  }

  /**
   * @description 返回文件结构树的最深层次文件的路径
   * @returns {Promise<Array<string>>}
   * @param {String} full_Path_to_dir 
   */
  static safeListAllFilesIn(full_Path_to_dir) {
    return new Promise(async resolve => {
      /**@type {string[]} */
      let results = [];
      let o_ld = await Toolbox.safeListDir(full_Path_to_dir);
      for (let ps of o_ld) {
        if (ps.stats.isFile()) {
          results.push(ps.full_path)
        } else if (ps.stats.isDirectory()) {
          let o_re = await Toolbox.safeListAllFilesIn(ps.full_path);
          results = results.concat(o_re)
        }
      }
      resolve(results);
    })
  }
}


module.exports = Toolbox