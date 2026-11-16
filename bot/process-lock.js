const fs = require("fs");
const path = require("path");

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function readLockPid(lockPath) {
  try {
    const pid = Number.parseInt(fs.readFileSync(lockPath, "utf8"), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function acquireLock(lockPath, { pid = process.pid, isAlive = isProcessAlive } = {}) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      try {
        fs.writeSync(fd, String(pid));
      } finally {
        fs.closeSync(fd);
      }
      return () => {
        if (readLockPid(lockPath) === pid) fs.rmSync(lockPath, { force: true });
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const holder = readLockPid(lockPath);
      if (holder && holder !== pid && isAlive(holder)) {
        throw new Error(`يوجد نسخة أخرى من البوت تعمل بالفعل (PID ${holder})`);
      }
      fs.rmSync(lockPath, { force: true });
    }
  }

  throw new Error("تعذر الحصول على قفل تشغيل البوت");
}

module.exports = { acquireLock, isProcessAlive };
