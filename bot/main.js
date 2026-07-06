const fs = require('fs');
const path = require('path');

const ADMINS = new Set(['61589338087096','61590712893190',]);
const commands = new Map();

// عداد الرسائل لكل جروب — كل 568 رسالة يتفاعل البوت
const msgCounters = new Map();
const REACTION_EMOJIS = ['🖤', '🥒', '☠️', '💀', '🔥'];
const REACTION_MILESTONE = 568;

const BOT_NICKNAME = `⏤͟͟ ✠ 𝐒 𝐇 𝐄 𝐍`;

function isAdmin(senderID) {
  return ADMINS.has(String(senderID));
}

function loadCommands() {
  const commandsPath = path.join(__dirname, 'Commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  commands.clear();
  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(commandsPath, file))];
      const cmd = require(path.join(commandsPath, file));
      commands.set(cmd.name, cmd);
      console.log(`[مستر] ✅ تم تحميل: ${cmd.name}`);
    } catch (e) {
      console.error(`[مستر] ❌ خطأ في تحميل ${file}:`, e.message);
    }
  }
  console.log(`[مستر] تم تحميل ${commands.size} أمر.`);
}

async function handleMessage(api, event) {
  if (!event || !event.body) return;

  const body = (event.body || '').trim();
  const threadID = String(event.threadID);
  const senderID = String(event.senderID || '');

  console.log(`[مستر] 📩 رسالة من ${senderID} في ${threadID}: "${body.substring(0, 60)}"`);

  // عداد 568 — يتفاعل على الرسالة رقم 568 وكل مضاعفاتها
  if (event.messageID && event.isGroup !== false) {
    const prev = msgCounters.get(threadID) || 0;
    const next = prev + 1;
    msgCounters.set(threadID, next);
    if (next % REACTION_MILESTONE === 0) {
      const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
      console.log(`[مستر] 🎯 رسالة #${next} في ${threadID} — تفاعل بـ ${emoji}`);
      try { await api.setMessageReaction(emoji, event.messageID); } catch (e) {
        console.error('[مستر] خطأ في التفاعل:', e.message || e);
      }
    }
  }

  // الرد التلقائي — يعمل دائماً قبل فحص الأوامر (ليس بالإدمن فقط)
  const replyCmd = commands.get('رد');
  if (replyCmd && replyCmd.checkAutoReply) {
    await replyCmd.checkAutoReply(api, event).catch(e =>
      console.error('[مستر] خطأ في checkAutoReply:', e.message)
    );
  }

  // أوامر محمية: يستخدمها الإدمن فقط
  if (body === 'قصف' || body === 'قصف ايقاف' || body === 'قصف إيقاف') {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get('قصف');
    if (cmd) cmd.execute(api, event).catch(e =>
      console.error('[مستر] خطأ في قصف:', e.message)
    );
    return;
  }

  if (body.startsWith('كاتش ') || body.startsWith('مجموعة ') || body.startsWith('جروب ')) {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get('كاتش');
    if (cmd) cmd.execute(api, event).catch(e =>
      console.error('[مستر] خطأ في كاتش/مجموعة:', e.message)
    );
    return;
  }

  if (body.startsWith('رد ') || body === 'رد قائمة') {
    if (!isAdmin(senderID)) return;
    const cmd = commands.get('رد');
    if (cmd) cmd.execute(api, event).catch(e =>
      console.error('[مستر] خطأ في رد:', e.message)
    );
    return;
  }

  if (body.startsWith('يوت ')) {
    const cmd = commands.get('يوت');
    if (cmd) cmd.execute(api, event).catch(e =>
      console.error('[مستر] خطأ في يوت:', e.message)
    );
    return;
  }
}

function handleEvent(api, event) {
  if (!event) return;

  // طباعة الحدث للتشخيص
  const logType = event.logMessageType || event.type || '';
  if (logType !== 'read_receipt') {
    console.log(`[مستر] 📌 حدث: type=${event.type} | logType=${logType}`);
  }

  const catchCmd = commands.get('كاتش');
  if (!catchCmd) return;

  // حماية الكنيات — حدث تغيير الكنية
  if (logType === 'log:user-nickname') {
    catchCmd.handleNicknameEvent(api, event);
  }

  // حماية اسم المجموعة — حدث تغيير الاسم
  if (logType === 'log:thread-name') {
    catchCmd.handleGroupNameEvent(api, event);
  }

  // بوت التحق بالمجموعة — حدث انضمام
  if (logType === 'log:subscribe') {
    const threadID = String(event.threadID);
    const logData = event.logMessageData || {};
    const addedParticipants = logData.addedParticipants || [];
    const botID = api.getCurrentUserID ? api.getCurrentUserID() : null;

    if (botID && addedParticipants.some(p => String(p.userFbId || p.userID || p.id || '') === String(botID))) {
      console.log(`[مستر] ✅ تمت إضافتي إلى المجموعة ${threadID} — جاري تعيين الكنية...`);
      setTimeout(async () => {
        try {
          await api.nickname(BOT_NICKNAME, threadID, String(botID));
          console.log(`[مستر] ✅ تم تعيين الكنية في المجموعة ${threadID}`);
        } catch (e) {
          console.error(`[مستر] خطأ في تعيين الكنية بعد الانضمام:`, e.message || e);
        }
      }, 2000);
    }
  }
}

module.exports = { loadCommands, handleMessage, handleEvent, commands };
