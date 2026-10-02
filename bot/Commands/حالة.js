function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const number = (value) => new Intl.NumberFormat("ar-EG").format(value);

  return `${number(days)} يوم  •  ${number(hours)} ساعة  •  ${number(minutes)} دقيقة  •  ${number(remainingSeconds)} ثانية`;
}

module.exports = {
  name: "حالة",

  async execute(api, event) {
    const threadID = String(event.threadID);
    const requestedAt = new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());
    const uptime = formatDuration(process.uptime());

    const message = [
      "━━━━━━━━(楽)┊ 𝗕𝗢𝗥𝗡 𝗧𝗢 𝗥𝗨𝗟𝗘 ༐ 𝆺𝅥 𝗭𝗘𝗗 ┊ (楽)━━━━━━━━",
      "༐ 𝆺𝅥 𝗕𝗢𝗧 𝗦𝗬𝗦𝗧𝗘𝗠 𝗦𝗧𝗔𝗧𝗨𝗦 𝆺𝅥 ༐",
      "╭━━━━━━━━━━━━━━━━━━╮",
      "🔌┊ حالة الاتصال: 🟢 متصل — تم استلام الأمر",
      "⚙️┊ حالة البوت: 🟢 نشط ويعمل الآن",
      `⏱️┊ مدة التشغيل: ${uptime}`,
      "📡┊ الخدمة: Facebook Messenger",
      `🕒┊ وقت الاستعلام: ${requestedAt}`,
      "╰━━━━━━━━━━━━━━━━━━╯",
      "━━━━━━━(楽)┊ 𝗭𝗘𝗗 𝗕𝗢𝗧 ┊ (楽)━━━━━━━",
    ].join("\n");

    await api.sendMessage(message, threadID);
  },
};