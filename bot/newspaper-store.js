const fs = require("fs");
const path = require("path");

function createNewspaperStore(filePath) {
  const resolvedPath = path.resolve(filePath);
  let currentText = null;
  let writeNumber = 0;

  if (fs.existsSync(resolvedPath)) {
    const saved = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    if (typeof saved.text !== "string" || !saved.text.trim()) {
      throw new Error("Saved newspaper must contain non-empty text.");
    }
    currentText = saved.text;
  }

  return {
    get() {
      return currentText;
    },

    set(text) {
      if (typeof text !== "string" || !text.trim()) {
        throw new Error("Newspaper text cannot be empty.");
      }

      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      const temporaryPath = `${resolvedPath}.${process.pid}.${++writeNumber}.tmp`;
      try {
        fs.writeFileSync(
          temporaryPath,
          JSON.stringify({ text }, null, 2),
          "utf8",
        );
        fs.renameSync(temporaryPath, resolvedPath);
      } catch (error) {
        try {
          fs.unlinkSync(temporaryPath);
        } catch {}
        throw error;
      }

      currentText = text;
      return currentText;
    },
  };
}

module.exports = { createNewspaperStore };
