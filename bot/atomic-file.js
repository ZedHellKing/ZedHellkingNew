const fs = require("fs");
const path = require("path");

function writeFileAtomic(filePath, content, { mode = 0o600 } = {}) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    const fd = fs.openSync(tmpPath, "w", mode);
    try {
      fs.writeSync(fd, content);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    fs.rmSync(tmpPath, { force: true });
    throw error;
  }
}

module.exports = { writeFileAtomic };
