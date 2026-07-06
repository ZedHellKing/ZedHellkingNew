const protectedNicknames = new Map();
const protectedGroupNames = new Map();
const protectedGroupNames2 = new Map(); // key: threadID, value: { name, minMs, maxMs }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  name: '\u0643\u0627\u062a\u0634',

  getProtectedNicknames() { return protectedNicknames; },
  getProtectedGroupNames() { return protectedGroupNames; },
  getProtectedGroupNames2() { return protectedGroupNames2; },

  async execute(api, event) {
    const threadID = String(event.threadID);
    const body = (event.body || '').trim();

    if (body.startsWith('\u0643\u0627\u062a\u0634 ')) {
      const nickname = body.slice('\u0643\u0627\u062a\u0634 '.length).trim();
      if (!nickname) {
        try { await api.sendMessage('\u26a0\ufe0f \u0645\u062b\u0627\u0644: \u0643\u0627\u062a\u0634 \u0645\u0633\u062a\u0631', threadID); } catch (e) {}
        return;
      }

      try { await api.sendMessage(`\u23f3 \u062c\u0627\u0631\u064a \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0643\u0646\u064a\u0627\u062a \u0625\u0644\u0649: ${nickname}`, threadID); } catch (e) {}

      try {
        const info = await api.getThreadInfo(threadID);
        const participants = info.participantIDs || [];
        console.log(`[\u0643\u0627\u062a\u0634] ${participants.length} \u0639\u0636\u0648 \u0641\u064a \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629`);

        protectedNicknames.set(threadID, nickname);

        let successCount = 0;
        for (const uid of participants) {
          try {
            await api.nickname(nickname, threadID, String(uid));
            successCount++;
            console.log(`[\u0643\u0627\u062a\u0634] \u2705 \u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0643\u0646\u064a\u0629 ${uid}`);
          } catch (e) {
            console.error(`[\u0643\u0627\u062a\u0634] \u062e\u0637\u0623 \u0641\u064a \u0643\u0646\u064a\u0629 ${uid}:`, e.message || e);
          }
          await sleep(1500);
        }

        try {
          await api.sendMessage(
            `\u2705 \u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0643\u0646\u064a\u0627\u062a ${successCount}/${participants.length} \u0639\u0636\u0648 \u0625\u0644\u0649: ${nickname}\n\ud83d\udee1\ufe0f \u0627\u0644\u062d\u0645\u0627\u064a\u0629 \u0645\u0641\u0639\u0651\u0644\u0629 \u2014 \u0623\u064a \u062a\u063a\u064a\u064a\u0631 \u0633\u064a\u064f\u0639\u0627\u062f \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b`,
            threadID
          );
        } catch (e) {}

      } catch (e) {
        console.error('[\u0643\u0627\u062a\u0634] \u062e\u0637\u0623:', e.message || e);
        try { await api.sendMessage('\u274c \u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0643\u0646\u064a\u0627\u062a.', threadID); } catch (_) {}
      }
      return;
    }

    // New pattern: \u0645\u062c\u0645\u0648\u0639\u0629 2 \u00bb9|10 "\u0627\u0644\u0627\u0633\u0645"
    // Regex: \u0645\u062c\u0645\u0648\u0639\u0629 2 \u00bb\d+|\d+ "\u0627\u0644\u0627\u0633\u0645"
    const group2Match = body.match(/^\u0645\u062c\u0645\u0648\u0639\u0629\s+2\s+\u00bb(\d+)\|(\d+)\s+(.+)$/);
    if (group2Match) {
      const minSec = parseInt(group2Match[1], 10);
      const maxSec = parseInt(group2Match[2], 10);
      const groupName = group2Match[3].trim();
      if (!groupName || isNaN(minSec) || isNaN(maxSec) || minSec >= maxSec) {
        try { await api.sendMessage('\u26a0\ufe0f \u0645\u062b\u0627\u0644: \u0645\u062c\u0645\u0648\u0639\u0629 2 \u00bb9|10 \u0645\u0633\u062a\u0631', threadID); } catch (e) {}
        return;
      }
      const minMs = minSec * 1000;
      const maxMs = maxSec * 1000;
      protectedGroupNames2.set(threadID, { name: groupName, minMs, maxMs });
      // Remove old immediate protection
      protectedGroupNames.delete(threadID);
      try {
        await api.gcname(groupName, threadID);
        await api.sendMessage(
          `\u2705 \u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0627\u0633\u0645 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629 \u0625\u0644\u0649: ${groupName}\n\ud83d\udee1\ufe0f \u0627\u0644\u062d\u0645\u0627\u064a\u0629 \u0645\u0641\u0639\u0651\u0644\u0629 (\u0628\u0627\u0639\u062a\u062f \u0627\u0644\u0631\u062c\u0639 \u0628\u064a\u0646 ${minSec}-${maxSec}\u062b) \u2014 \u0623\u064a \u062a\u063a\u064a\u064a\u0631 \u0633\u064a\u064f\u0639\u0627\u062f \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b`,
          threadID
        );
        console.log(`[\u0645\u062c\u0645\u0648\u0639\u0629 2] \u2705 \u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0627\u0633\u0645 \u0625\u0644\u0649 "${groupName}" \u0641\u064a ${threadID}`);
      } catch (e) {
        console.error('[\u0645\u062c\u0645\u0648\u0639\u0629 2] \u062e\u0637\u0623:', e.message || e);
        try { await api.sendMessage('\u274c \u062d\u062f\u062b \u062e\u0637\u0623 \u0641\u064a \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0627\u0633\u0645.', threadID); } catch (_) {}
      }
      return;
    }

    // Old pattern: \u0645\u062c\u0645\u0648\u0639\u0629 "\u0627\u0644\u0627\u0633\u0645"
    if (body.startsWith('\u0645\u062c\u0645\u0648\u0639\u0629 ')) {
      const groupName = body.slice('\u0645\u062c\u0645\u0648\u0639\u0629 '.length).trim();
      if (!groupName) {
        try { await api.sendMessage('\u26a0\ufe0f \u0645\u062b\u0627\u0644: \u0645\u062c\u0645\u0648\u0639\u0629 \u0645\u0633\u062a\u0631', threadID); } catch (e) {}
        return;
      }

      // Remove delayed protection if it exists
      protectedGroupNames2.delete(threadID);
      protectedGroupNames.set(threadID, groupName);

      try {
        await api.gcname(groupName, threadID);
        await api.sendMessage(
          `\u2705 \u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0627\u0633\u0645 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629 \u0625\u0644\u0649: ${groupName}\n\ud83d\udee1\ufe0f \u0627\u0644\u062d\u0645\u0627\u064a\u0629 \u0645\u0641\u0639\u0651\u0644\u0629 \u2014 \u0623\u064a \u062a\u063a\u064a\u064a\u0631 \u0633\u064a\u064f\u0639\u0627\u062f \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b`,
          threadID
        );
        console.log(`[\u0645\u062c\u0645\u0648\u0639\u0629] \u2705 \u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0627\u0633\u0645 \u0625\u0644\u0649 "${groupName}" \u0641\u064a ${threadID}`);
      } catch (e) {
        console.error('[\u0645\u062c\u0645\u0648\u0639\u0629] \u062e\u0637\u0623:', e.message || e);
        try { await api.sendMessage('\u274c \u062d\u062f\u062b \u062e\u0637\u0623 \u0641\u064a \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0627\u0633\u0645.', threadID); } catch (_) {}
      }
      return;
    }
  },

  // \u062d\u062f\u062b \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0643\u0646\u064a\u0629
  handleNicknameEvent(api, event) {
    const threadID = String(event.threadID);
    const protectedName = protectedNicknames.get(threadID);
    if (!protectedName) return;

    const data = event.logMessageData || {};
    const changedUID = String(data.participant_id || data.participantID || event.userID || '');
    const newNickname = data.nickname || data.newNickname || '';

    if (!changedUID) return;
    if (newNickname === protectedName) return;

    console.log(`[\u062d\u0645\u0627\u064a\u0629 \u0643\u0646\u064a\u0627\u062a] \u0631\u0635\u062f \u062a\u063a\u064a\u064a\u0631 "${newNickname}" \u0644\u0644\u0639\u0636\u0648 ${changedUID} \u2014 \u0625\u0639\u0627\u062f\u0629 \u0625\u0644\u0649 "${protectedName}"...`);

    setTimeout(async () => {
      try {
        await api.nickname(protectedName, threadID, changedUID);
        console.log(`[\u062d\u0645\u0627\u064a\u0629 \u0643\u0646\u064a\u0627\u062a] \u2705 \u0623\u064f\u0639\u064a\u062f\u062a \u0643\u0646\u064a\u0629 ${changedUID} \u0625\u0644\u0649 "${protectedName}"`);
      } catch (e) {
        console.error('[\u062d\u0645\u0627\u064a\u0629 \u0643\u0646\u064a\u0627\u062a] \u062e\u0637\u0623:', e.message || e);
      }
    }, 300);
  },

  // \u062d\u062f\u062b \u062a\u063a\u064a\u064a\u0631 \u0627\u0633\u0645 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629
  handleGroupNameEvent(api, event) {
    const threadID = String(event.threadID);
    const protectedName = protectedGroupNames.get(threadID);
    const delayedConfig = protectedGroupNames2.get(threadID);

    if (delayedConfig) {
      // Delayed protection (\u0645\u062c\u0645\u0648\u0639\u0629 2)
      const data = event.logMessageData || {};
      const newName = data.name || data.threadName || event.name || '';
      if (!newName || newName === delayedConfig.name) return;

      const delayMs = delayedConfig.minMs + Math.floor(Math.random() * (delayedConfig.maxMs - delayedConfig.minMs));
      console.log(`[\u062d\u0645\u0627\u064a\u0629 \u0645\u062c\u0645\u0648\u0639\u0629 2] \u0631\u0635\u062f \u062a\u063a\u064a\u064a\u0631 \u0625\u0644\u0649 "${newName}" \u2014 \u0625\u0639\u0627\u062f\u0629 \u0628\u0639\u062f ${delayMs/1000}\u062b...`);

      setTimeout(async () => {
        try {
          await api.gcname(delayedConfig.name, threadID);
          console.log(`[\u062d\u0645\u0627\u064a\u0629 \u0645\u062c\u0645\u0648\u0639\u0629 2] \u2705 \u0623\u064f\u0639\u064a\u062f \u0627\u0644\u0627\u0633\u0645 \u0625\u0644\u0649 "${delayedConfig.name}"`);
        } catch (e) {
          console.error('[\u062d\u0645\u0627\u064a\u0629 \u0645\u062c\u0645\u0648\u0639\u0629 2] \u062e\u0637\u0623:', e.message || e);
        }
      }, delayMs);
      return;
    }

    if (!protectedName) return;
    const data = event.logMessageData || {};
    const newName = data.name || data.threadName || event.name || '';
    if (!newName || newName === protectedName) return;

    console.log(`[\u062d\u0645\u0627\u064a\u0629 \u0645\u062c\u0645\u0648\u0639\u0629] \u0631\u0635\u062f \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0627\u0633\u0645 \u0625\u0644\u0649 "${newName}" \u2014 \u0625\u0639\u0627\u062f\u0629 \u0625\u0644\u0649 "${protectedName}"...`);

    setTimeout(async () => {
      try {
        await api.gcname(protectedName, threadID);
        console.log(`[\u062d\u0645\u0627\u064a\u0629 \u0645\u062c\u0645\u0648\u0639\u0629] \u2705 \u0623\u064f\u0639\u064a\u062f \u0627\u0644\u0627\u0633\u0645 \u0625\u0644\u0649 "${protectedName}"`);
      } catch (e) {
        console.error('[\u062d\u0645\u0627\u064a\u0629 \u0645\u062c\u0645\u0648\u0639\u0629] \u062e\u0637\u0623:', e.message || e);
      }
    }, 300);
  }
};
