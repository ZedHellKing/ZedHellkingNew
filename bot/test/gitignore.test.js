const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8").split(/\r?\n/);

const REQUIRED_LINES = [
  "/bot/appstate.json",
  "/bot/appstate.json.bak.*",
  "/bot/account.txt",
  "/bot/data/bot.lock",
  "/bot/data/crash-history.json",
  ".env",
  ".env.*",
  "!.env.example",
];

test("gitignore excludes session, lock, history, and env files", () => {
  for (const line of REQUIRED_LINES) {
    assert.ok(gitignore.includes(line), `missing rule: ${line}`);
  }
});

test("env negation comes after the env wildcard so the example stays tracked", () => {
  assert.ok(gitignore.indexOf("!.env.example") > gitignore.indexOf(".env.*"));
});

test(".env.example exists and holds no secret values", () => {
  const example = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
  for (const line of example.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    assert.match(line, /^[A-Z_]+=/, `unexpected line format: ${line.split("=")[0]}`);
  }
  const secretKeys = /(TOKEN|SECRET|PASSWORD|COOKIE|APPSTATE|KEY)=(.+)$/m;
  assert.equal(secretKeys.test(example), false);
});
