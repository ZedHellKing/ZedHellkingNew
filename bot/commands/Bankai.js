module.exports.config = {
  name: "bankai",
  aliases: ["بانكاي"],
  version: "1.0.0",
  hasPermssion: 0,
  credits: "SAZO",
  description: "يطرد ويضيف العضو بالتناوب لمدة 15 ثانية",
  usages: "بانكاي <uid>",
  cooldowns: 5,
  usePrefix: false
};

module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;
  const targetID = (args[0] || "").trim();
  const botID = api.getCurrentUserID();

  if (!/^\d+$/.test(targetID)) {
    return api.sendMessage("اكتب ID صحيح: بانكاي <uid>", threadID);
  }

  const threadInfo = await new Promise((resolve) => {
    api.getThreadInfo(threadID, (err, info) => resolve(err ? null : info));
  });

  if (!threadInfo || !threadInfo.isGroup) {
    return api.sendMessage("هذا الأمر يعمل داخل المجموعات فقط.", threadID);
  }

  if (targetID === botID) {
    return api.sendMessage("ما أقدر أستهدف نفسي.", threadID);
  }

  const startMsg = " _ جــاري بـداء مـراســم البـانڪـاي 𝑆𝐴𝑍𝑂 _ ";
  const endMsg = " _ تـم انهـاء بـانكـاي 𝑆𝐴𝑍𝑂 _ ";

  const removeUser = (uid) =>
    new Promise((resolve) => api.removeUserFromGroup(uid, threadID, () => resolve()));

  const addUser = (uid) =>
    new Promise((resolve) => api.addUserToGroup(uid, threadID, () => resolve()));

  api.sendMessage(startMsg, threadID);

  let flip = false;
 
