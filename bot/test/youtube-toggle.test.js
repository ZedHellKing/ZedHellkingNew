const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createYoutubeCommand } = require("../Commands/يوت");

test("stopping song search blocks downloads and enabling it restores search across command instances", async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mister-youtube-test-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const statePath = path.join(tempDir, "youtube-state.json");
  const downloadedQueries = [];
  const sentMessages = [];
  const api = {
    async sendMessage(message, threadID) {
      sentMessages.push({ message, threadID });
      if (message && typeof message === "object" && message.attachment) {
        await new Promise((resolve, reject) => {
          message.attachment.once("error", reject);
          message.attachment.once("end", resolve);
          message.attachment.resume();
        });
      }
    },
  };
  const commandOptions = {
    statePath,
    async downloadAudio(query, outFile) {
      downloadedQueries.push(query);
      fs.writeFileSync(outFile, Buffer.from("test audio"));
    },
  };
  const command = createYoutubeCommand(commandOptions);
  const adminEvent = { threadID: "admin-dm" };

  assert.equal(command.isEnabled(), true, "song search is enabled by default");
  await command.setEnabled(api, adminEvent, false);
  assert.equal(command.isEnabled(), false);

  const afterRestart = createYoutubeCommand(commandOptions);
  assert.equal(afterRestart.isEnabled(), false, "the disabled state persists");
  await afterRestart.execute(api, {
    body: "يوت اسم أغنية",
    threadID: "group-1",
  });
  assert.deepEqual(downloadedQueries, [], "no search starts while disabled");
  assert.match(String(sentMessages.at(-1).message), /متوقف/);

  await afterRestart.setEnabled(api, adminEvent, true);
  assert.equal(command.isEnabled(), true);
  await command.execute(api, {
    body: "يوت اسم أغنية",
    threadID: "group-2",
  });
  assert.deepEqual(downloadedQueries, ["اسم أغنية"]);
  assert.ok(
    sentMessages.some(
      ({ message }) =>
        message && typeof message === "object" && message.attachment,
    ),
    "a song file is sent after enabling search",
  );
});
