"use strict";

// مخزن مشترك لمدد إرسال قصف وماهوراغا — يمكن تعديلها في وقت التشغيل
const DEFAULTS = {
  qasf: 60 * 1000,       // دقيقة افتراضية لقصف
  mahoraga: 60 * 1000,   // دقيقة افتراضية لماهوراغا
};

const timings = { ...DEFAULTS };

function get(key) {
  return timings[key] ?? DEFAULTS[key];
}

function set(key, ms) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) return false;
  const value = Number(ms);
  if (!Number.isFinite(value) || value < 1000) return false;
  timings[key] = value;
  return true;
}

module.exports = { get, set, DEFAULTS };
