const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const rs = require("randomstring");
const rn = require("random-number");

function getRandomWsData() {
  let n = rn({ integer: true, min: 0, max: 5 });
  switch (n) {
    case 0: return [
      ["序号", "收益", "VX", "密码", "是否成功", rs.generate()],
      ...(_ => {
        return (new Array(rn({ integer: true, min: 5, max: 20 }))).fill(0).map($ => [
          rn({ integer: true, max: 250, min: 0 }),
          rn({ integer: true, max: 2500, min: -100 }),
          rs.generate({ length: 13, charset: "0123456789" }),
          rs.generate({ length: rn({ integer: true, min: 10, max: 20 }) }),
          rs.generate({ length: 1, charset: "YNNY" }),
          rs.generate({ length: 3, charset: "13.25641257Π鎃" })
        ])
      })()
    ];
    case 1: return [
      ["#", "新增确诊病例", "新增死亡病例", "新增治愈康复出院", "疑似病例或者无症状病例"],
      ...(_ => {
        return (new Array(rn({ integer: true, min: 5, max: 20 }))).fill(0).map($ => [
          rn({ integer: true, max: 20, min: 0 }),
          rn({ integer: true, max: 250, min: 1 }),
          rn({ integer: true, max: 50, min: 1 }),
          rn({ integer: true, max: 2000, min: 30 }),
          rn({ integer: true, max: 500, min: 10 }),
        ])
      })()
    ];
    case 2: return [
      ["学生QQ号", "家长微信号"],
      ...(_ => {
        return (new Array(rn({ integer: true, min: 5, max: 20 }))).fill(0).map($ => [
          rn({ integer: true, min: 1043534522, max: 2043530606 }),
          rs.generate({ length: rn({ integer: true, min: 5, max: 10 }), charset: "Zhaoqiansunlizhouwuzhengwangpulishe" })
        ])
      })()
    ];
    case 3: return [
      ["商品代号", "时间", "销量(件)", "单价"],
      ...(_ => {
        return (new Array(rn({ integer: true, min: 2, max: 15 }))).fill(0).map($ => [
          rs.generate({ length: 8 }),
          (new Date(rn({ integer: true, min: Date.now() - (10 ** 9) * 2, max: Date.now() }))).toLocaleDateString(),
          rn({ integer: true, min: 0, max: 900 }),
          rn({ integer: true, min: 1, max: 90 }),
        ])
      })()
    ];
    case 4: return [
      ["#热品代号", "统计时间", "销售量", "最低单价"],
      ...(_ => {
        return (new Array(rn({ integer: true, min: 5, max: 15 }))).fill(0).map($ => [
          rs.generate({ length: 8, charset: "123456789" }),
          (new Date(rn({ integer: true, min: Date.now() - (10 ** 9) * 2, max: Date.now() }))).toLocaleDateString(),
          rn({ integer: true, min: 0, max: 900 }),
          rn({ integer: true, min: 1, max: 90 }),
        ])
      })()
    ];
    case 5: return [
      ["#员工代号", "离职时间", "工时", "结付单日工资"],
      ...(_ => {
        return (new Array(rn({ integer: true, min: 5, max: 10 }))).fill(0).map($ => [
          rs.generate({ length: 3, charset: "123456789" }),
          (new Date(rn({ integer: true, min: Date.now() - (10 ** 9) * 2, max: Date.now() }))).toLocaleDateString(),
          rn({ integer: true, min: 0, max: 900 }),
          rn({ integer: true, min: 100, max: 400, }),
        ])
      })()
    ];
  }
  return [
    ["序号", "收益", "VX", "密码", "是否成功", rs.generate()],
    ...(_ => {
      return (new Array(rn({ integer: true, min: 5, max: 20 }))).fill(0).map($ => [
        rn({ integer: true, max: 250, min: 0 }),
        rn({ integer: true, max: 2500, min: -100 }),
        rs.generate({ length: 13, charset: "0123456789" }),
        rs.generate({ length: rn({ integer: true, min: 10, max: 20 }) }),
        rs.generate({ length: 4, charset: "YNNY" }),
        rs.generate({ length: 3, charset: "13.25641257Π鎃" })
      ])
    })()
  ];
}

/**
 * @returns {String} xlsx path
 */
function generateXlsx() {
  let wb = XLSX.utils.book_new();
  let ws_data = getRandomWsData();
  let ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "sheet1");
  let xlsxPath = path.join(__dirname, "../DUMMY/random.xlsx");
  // XLSX.write
  XLSX.writeFile(wb, xlsxPath, {
    compression: true
  });
  return xlsxPath;
}



module.exports = {
  generateXlsx
}