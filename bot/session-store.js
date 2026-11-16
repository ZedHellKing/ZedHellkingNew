const crypto = require("crypto");
const fs = require("fs");
const { writeFileAtomic } = require("./atomic-file");

const REQUIRED_COOKIES = ["c_user", "xs"];
const BACKUP_COUNT = 3;

function validateAppState(state) {
  if (!Array.isArray(state) || state.length === 0) {
    return { ok: false, reason: "الجلسة فارغة أو بصيغة غير صحيحة" };
  }
  for (const item of state) {
    if (!item || typeof item !== "object" || typeof item.key !== "string" ||
        typeof item.value !== "string" || item.value === "") {
      return { ok: false, reason: "يحتوي هذا الملف على عنصر جلسة غير صالح" };
    }
  }
  const names = new Set(state.map((item) => item.key));
  const missing = REQUIRED_COOKIES.filter((name) => !names.has(name));
  if (missing.length > 0) {
    return { ok: false, reason: "الجلسة لا تحتوي على بيانات الحساب المطلوبة" };
  }
  return { ok: true };
}

function hashState(state) {
  return crypto.createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

function readValidState(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return { ok: false, reason: error.code === "ENOENT" ? "missing" : "unreadable" };
  }
  let state;
  try {
    state = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  const check = validateAppState(state);
  if (!check.ok) return { ok: false, reason: check.reason };
  return { ok: true, state, hash: hashState(state) };
}

function createSessionStore({ filePath, log }) {
  const backupPath = (index) => `${filePath}.bak.${index}`;
  let lastHash = null;

  function rotateBackups() {
    fs.rmSync(backupPath(BACKUP_COUNT), { force: true });
    for (let i = BACKUP_COUNT - 1; i >= 1; i--) {
      if (fs.existsSync(backupPath(i))) fs.renameSync(backupPath(i), backupPath(i + 1));
    }
    fs.copyFileSync(filePath, backupPath(1));
    fs.chmodSync(backupPath(1), 0o600);
  }

  return {
    load() {
      const candidates = [filePath, ...Array.from({ length: BACKUP_COUNT }, (_, i) => backupPath(i + 1))];
      for (const candidate of candidates) {
        const result = readValidState(candidate);
        if (result.ok) {
          lastHash = result.hash;
          if (candidate !== filePath) {
            log.warn("session", "الملف الرئيسي للجلسة غير صالح، تم استخدام نسخة احتياطية", {
              source: candidate === filePath ? "main" : "backup",
            });
          }
          return result.state;
        }
        if (result.reason !== "missing") {
          log.warn("session", "ملف جلسة غير صالح تم تجاهله", { file: candidate, reason: result.reason });
        }
      }
      return null;
    },

    save(state) {
      const check = validateAppState(state);
      if (!check.ok) throw new Error(check.reason);
      const hash = hashState(state);
      if (hash === lastHash && fs.existsSync(filePath)) return false;

      if (fs.existsSync(filePath) && readValidState(filePath).ok) rotateBackups();
      writeFileAtomic(filePath, JSON.stringify(state, null, 2));
      lastHash = hash;
      return true;
    },
  };
}

module.exports = { createSessionStore, validateAppState };
