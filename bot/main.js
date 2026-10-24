const fs = require("fs");
const path = require("path");
const { createRemoteControl } = require("./remote-control");
const {
  deleteBotMessageOnAngryReaction,
} = require("./message-reactions");

const ADMINS = new Set(["61595712753723"]);
const commands = new Map();

// عداد الرسائل لكل جروب — كل 568 رسالة يتفاعل البوت
const msgCounters = new Map();
const REACTION_EMOJIS = ["🖤", "🥒", "☠️", "💀", "🔥"];
const REACTION_MILESTONE = 568;

const BOT_NICKNAME = "⋯⌁⟖ 𝒁𝑬𝑫 𝑯𝑬𝑳𝑳𝑲𝑰𝑵𝑮 𝑩𝑶𝑻 ⃞⃟ ❞ ⟕⌁⋯";

function isAdmin(senderID) {
  return ADMINS.has(String(senderID));
}

const remoteControl = createRemoteControl({ isAdmin });

function loadCommands() {
  const commandsPath = path.join(__dirname, "Commands");
  const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));
  commands.clear();
  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(commandsPath, file))];
      const cmd = require(path.join(commandsPath, file));
      commands.set(cmd.name, cmd);
      console.log(`[الأسطورة جان] ✅ تم تحميل: ${cmd.name}`);
    } catch (e) {
      console.error(`[الأسطورة جان] ❌ خطأ في تحميل ${file}:`, e.message);
    }
  }
  console.log(`[الأسطورة جان] تم تحميل ${commands.size} أمر.`);
}

async function handleMessage(api, event) {
  if (!event) return;

  const body = (event.body || "").trim();
  const threadID = String(event.threadID);
  const senderID = String(event.senderID || "");

  console.log(
    `[الأسطورة جان] 📩 رسالة من ${senderID} في ${threadID}: "${body.substring(0, 60)}"`,
  );

  if (isAdmin(senderID)) {
    const handled = await remoteControl
      .handleMessage(api, event, commands)
      .catch((e) => {
        console.error("[الأسطورة جان] خطأ في التحكم عن بُعد:", e.message || e);
        return true;
      });
    if (handled) return;
  }

  if (body === "اوامر" || body === "أوامر") {
    if (!isAdmin(senderID)) return;
    remoteControl
      .startMenu(api, event, commands)
      .catch((e) =>
        console.error("[الأسطورة جان] خطأ في قائمة الأوامر:", e.message || e),
      );
    return;
  }

  if (body === "حالة") {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("حالة");
    if (cmd) {
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في أمر حالة:", e.message || e));
    }
    return;
  }

  // سجّل الرسالة فور وصولها حتى يكون عدّاد الأربع ثوانٍ مبنياً
  // على ترتيب وصول الرسائل، وليس على وقت انتهاء أي رد تلقائي آخر.
  const mahoragaCmd = commands.get("ماهوراغا");
  const isMahoragaControl =
    body === "ماهوراغا" ||
    body === "ماهوراغا ايقاف" ||
    body === "ماهوراغا إيقاف";
  if (
    mahoragaCmd &&
    mahoragaCmd.handleIncomingMessage &&
    (!isMahoragaControl || !isAdmin(senderID))
  ) {
    mahoragaCmd.handleIncomingMessage(api, event);
  }

  // عداد 568 — يتفاعل على الرسالة رقم 568 وكل مضاعفاتها
  if (event.messageID && event.isGroup !== false) {
    const prev = msgCounters.get(threadID) || 0;
    const next = prev + 1;
    msgCounters.set(threadID, next);
    if (next % REACTION_MILESTONE === 0) {
      const emoji =
        REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
      console.log(
        `[الأسطورة جان] 🎯 رسالة #${next} في ${threadID} — تفاعل بـ ${emoji}`,
      );
      try {
        await api.setMessageReaction(emoji, event.messageID);
      } catch (e) {
        console.error("[الأسطورة جان] خطأ في التفاعل:", e.message || e);
      }
    }
  }

  // الرد التلقائي — يعمل دائماً قبل فحص الأوامر (ليس بالإدمن فقط)
  const replyCmd = commands.get("رد");
  if (replyCmd && replyCmd.checkAutoReply) {
    await replyCmd
      .checkAutoReply(api, event)
      .catch((e) => console.error("[الأسطورة جان] خطأ في checkAutoReply:", e.message));
  }

  // أوامر محمية: يستخدمها الإدمن فقط
  if (/^تغير جريدة(?:\s|$)/u.test(body)) {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("تغير جريدة");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) =>
          console.error("[الأسطورة جان] خطأ في تغير جريدة:", e.message || e),
        );
    return;
  }

  if (body === "قصف" || body === "قصف ايقاف" || body === "قصف إيقاف") {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("قصف");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في قصف:", e.message));
    return;
  }

  if (
    body.startsWith("كاتش ") ||
    body.startsWith("مجموعة ") ||
    body.startsWith("جروب ")
  ) {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("كاتش");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في كاتش/مجموعة:", e.message));
    return;
  }

  if (
    body === "ماهوراغا" ||
    body === "ماهوراغا ايقاف" ||
    body === "ماهوراغا إيقاف"
  ) {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("ماهوراغا");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في ماهوراغا:", e.message || e));
    return;
  }

  if (body === "حذف كاتش") {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("حذف كاتش");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في حذف كاتش:", e.message || e));
    return;
  }

  if (body.startsWith("رد ") || body === "رد قائمة") {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("رد");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في رد:", e.message));
    return;
  }

  if (body === "بانكاي" || body.startsWith("بانكاي ")) {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("بانكاي");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في بانكاي:", e.message || e));
    return;
  }

  if (body === "السياجين") {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("السياجين");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في السياجين:", e.message || e));
    return;
  }

  if (body === "تثبيت" || body === "تثبيت ايقاف" || body === "تثبيت إيقاف") {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("تثبيت");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في تثبيت:", e.message || e));
    return;
  }

  if (
    body === "ايقاف يوت" ||
    body === "إيقاف يوت" ||
    body === "تشغيل يوت"
  ) {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get("يوت");
    if (!cmd || typeof cmd.setEnabled !== "function") {
      await api.sendMessage("❌ تعذر تحميل إعدادات أمر يوت.", threadID);
      return;
    }
    const enabled = body === "تشغيل يوت";
    cmd.setEnabled(api, event, enabled).catch(async (e) => {
      console.error("[الأسطورة جان] خطأ في تغيير حالة يوت:", e.message || e);
      await api
        .sendMessage("❌ لم أستطع حفظ حالة أمر يوت.", threadID)
        .catch(() => {});
    });
    return;
  }

  if (body.startsWith("يوت ")) {
    const cmd = commands.get("يوت");
    if (cmd)
      cmd
        .execute(api, event)
        .catch((e) => console.error("[الأسطورة جان] خطأ في يوت:", e.message));
    return;
  }
}

function handleEvent(api, event) {
  if (!event) return;

  if (event.type === "message_reaction") {
    deleteBotMessageOnAngryReaction(api, event, isAdmin)
      .then((deleted) => {
        if (deleted) {
          console.log(
            `[الأسطورة جان] 🗑️ حُذفت رسالتي بعد تفاعل المشرف بـ😡 في ${event.threadID}`,
          );
        }
      })
      .catch((e) =>
        console.error(
          "[الأسطورة جان] تعذّر حذف الرسالة بعد التفاعل:",
          e.message || e,
        ),
      );
  }

  // طباعة الحدث للتشخيص
  const logType = event.logMessageType || event.type || "";
  if (logType !== "read_receipt") {
    console.log(`[الأسطورة جان] 📌 حدث: type=${event.type} | logType=${logType}`);
  }

  const catchCmd = commands.get("كاتش");
  const pinCmd = commands.get("تثبيت");

  // حماية الكنيات — حدث تغيير الكنية
  if (catchCmd && logType === "log:user-nickname") {
    catchCmd.handleNicknameEvent(api, event);
  }

  // حماية اسم المجموعة — حدث تغيير الاسم
  if (catchCmd && logType === "log:thread-name") {
    catchCmd.handleGroupNameEvent(api, event);
  }

  // حماية صورة المجموعة — حدث تغيير صورة المجموعة
  const normalizedLogType = String(logType).toLowerCase();
  const eventDetails = [
    event.type,
    event.logMessageType,
    event.logMessageBody,
    JSON.stringify(event.logMessageData || {}),
  ]
    .join(" ")
    .toLowerCase();
  const isGroupImageEvent =
    /image|photo|picture|change_thread_image|thread_image|threadimage/.test(
      `${normalizedLogType} ${eventDetails}`,
    );
  if (isGroupImageEvent && pinCmd && pinCmd.handleGroupImageEvent) {
    pinCmd.handleGroupImageEvent(api, event);
  }

  // بوت التحق بالمجموعة — حدث انضمام
  if (logType === "log:subscribe") {
    const threadID = String(event.threadID);
    const logData = event.logMessageData || {};
    const addedParticipants = logData.addedParticipants || [];
    const botID = api.getCurrentUserID ? api.getCurrentUserID() : null;

    if (
      botID &&
      addedParticipants.some(
        (p) => String(p.userFbId || p.userID || p.id || "") === String(botID),
      )
    ) {
      console.log(
        `[الأسطورة جان] ✅ تمت إضافتي إلى المجموعة ${threadID} — جاري تعيين الكنية...`,
      );
      setTimeout(async () => {
        try {
          await api.nickname(BOT_NICKNAME, threadID, String(botID));
          console.log(`[الأسطورة جان] ✅ تم تعيين الكنية في المجموعة ${threadID}`);
        } catch (e) {
          console.error(
            `[الأسطورة جان] خطأ في تعيين الكنية بعد الانضمام:`,
            e.message || e,
          );
        }
      }, 2000);
    }
  }
}

module.exports = { loadCommands, handleMessage, handleEvent, commands };
