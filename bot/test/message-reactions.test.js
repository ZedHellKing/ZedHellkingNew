const test = require("node:test");
const assert = require("node:assert/strict");
const {
  deleteBotMessageOnAdminReaction,
} = require("../message-reactions");

function createHarness(historyPages) {
  const calls = { history: [], unsent: [] };
  let pageIndex = 0;
  const api = {
    getCurrentUserID: () => "bot-1",
    async getThreadHistory(threadID, amount, timestamp) {
      calls.history.push({ threadID, amount, timestamp });
      return historyPages[pageIndex++] || [];
    },
    async unsent(messageID, threadID) {
      calls.unsent.push({ messageID, threadID });
    },
  };

  return {
    calls,
    api,
    isAdmin: (id) => id === "admin-1",
  };
}

test("unsends the bot's message after an admin reacts with 🪯", async () => {
  const h = createHarness([
    [{ messageID: "bot-message", senderID: "bot-1", timestamp: "1000" }],
  ]);

  const deleted = await deleteBotMessageOnAdminReaction(
    h.api,
    {
      type: "message_reaction",
      reaction: "🪯",
      senderID: "admin-1",
      threadID: "thread-1",
      messageID: "bot-message",
    },
    h.isAdmin,
  );

  assert.equal(deleted, true);
  assert.deepEqual(h.calls.unsent, [
    { messageID: "bot-message", threadID: "thread-1" },
  ]);
});

test("does not unsend a message written by another participant", async () => {
  const h = createHarness([
    [{ messageID: "member-message", senderID: "member-1", timestamp: "1000" }],
  ]);

  const deleted = await deleteBotMessageOnAdminReaction(
    h.api,
    {
      type: "message_reaction",
      reaction: "🪯",
      senderID: "admin-1",
      threadID: "thread-1",
      messageID: "member-message",
    },
    h.isAdmin,
  );

  assert.equal(deleted, false);
  assert.deepEqual(h.calls.unsent, []);
});

test("ignores non-admin reactions and emojis other than 🪯", async () => {
  const h = createHarness([
    [{ messageID: "bot-message", senderID: "bot-1", timestamp: "1000" }],
  ]);
  const event = {
    type: "message_reaction",
    reaction: "🪯",
    senderID: "member-1",
    threadID: "thread-1",
    messageID: "bot-message",
  };

  assert.equal(
    await deleteBotMessageOnAdminReaction(h.api, event, h.isAdmin),
    false,
  );
  assert.equal(
    await deleteBotMessageOnAdminReaction(
      h.api,
      { ...event, senderID: "admin-1", reaction: "❤️" },
      h.isAdmin,
    ),
    false,
  );
  assert.deepEqual(h.calls.history, []);
  assert.deepEqual(h.calls.unsent, []);
});

test("finds and unsends a bot message in an older history page", async () => {
  const recentPage = Array.from({ length: 100 }, (_, index) => ({
    messageID: `recent-${index}`,
    senderID: "member-1",
    timestamp: String(1000 - index),
  }));
  const h = createHarness([
    recentPage,
    [{ messageID: "older-bot-message", senderID: "bot-1", timestamp: "500" }],
  ]);

  const deleted = await deleteBotMessageOnAdminReaction(
    h.api,
    {
      type: "message_reaction",
      reaction: "🪯",
      senderID: "admin-1",
      threadID: "thread-1",
      messageID: "older-bot-message",
    },
    h.isAdmin,
  );

  assert.equal(deleted, true);
  assert.equal(h.calls.history.length, 2);
  assert.equal(h.calls.history[1].timestamp, 900);
  assert.deepEqual(h.calls.unsent, [
    { messageID: "older-bot-message", threadID: "thread-1" },
  ]);
});
