const fs = require("fs");

const marker = process.env.FIXTURE_MARKER;
if (!fs.existsSync(marker)) {
  fs.writeFileSync(marker, "crashed once");
  process.exit(1);
}

process.on("SIGTERM", () => process.exit(0));
setInterval(() => {}, 1000);
