const DELETE_REACTION = "🪯";
const MESSAGE_HISTORY_PAGE_SIZE = 100;

async function findMessageInHistory(api, threadID, messageID) {
  let before = null;

  while (true) {
    const messages = await api.getThreadHistory(
      threadID,
      MESSAGE_HISTORY_PAGE_SIZE,
      before,
    );
    if (!Array.isArray(messages) || messages.length === 0) return null;

    const target = messages.find(
      (message) => String(message.messageID) === messageID,
    );
    if (target) return target;

    const timestamps = messages
      .map((message) => Number(message.timestamp))
      .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0);
    if (timestamps.length === 0) return null;

    const nextBefore = Math.min(...timestamps) - 1;
    if (before !== null && nextBefore >= before) return null;
    before = nextBefore;

    if (messages.length < MESSAGE_HISTORY_PAGE_SIZE) return null;
  }
}

async function deleteBotMessageOnAdminReaction(api, event, isAdmin) {
  if (
    !event ||
    event.type !== "message_reaction" ||
    event.reaction !== DELETE_REACTION ||
    typeof isAdmin !== "function" ||
    !isAdmin(String(event.senderID || ""))
  ) {
    return false;
  }

  const threadID = String(event.threadID || "");
  const messageID = String(event.messageID || "");
  if (!threadID || !messageID) return false;

  if (
    typeof api.getCurrentUserID !== "function" ||
    typeof api.getThreadHistory !== "function" ||
    typeof api.unsent !== "function"
  ) {
    throw new Error("Messenger API is missing message history or unsend support.");
  }

  const botID = String(api.getCurrentUserID() || "");
  if (!botID) return false;

  const target = await findMessageInHistory(api, threadID, messageID);

  if (!target || String(target.senderID) !== botID) return false;

  await api.unsent(messageID, threadID);
  return true;
}

module.exports = { deleteBotMessageOnAdminReaction };
