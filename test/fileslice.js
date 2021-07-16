const path = require("path");
const fs = require("fs-extra");

let readPath = path.join(__dirname, "../tmp/real_file/webp.webp");
let outputPath = path.join(__dirname, "../DUMMY/webp");

let rsS = fs.createReadStream(readPath, { start: 0, end: 2 * 1024 });
rsS.pipe(fs.createWriteStream(outputPath));
