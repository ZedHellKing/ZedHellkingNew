const GROUP_PAGE_SIZE = 15;
const THREAD_PAGE_SIZE = 100;
const MAX_THREAD_PAGES = 20;
const SESSION_TTL_MS = 10 * 60 * 1000;

const REMOTE_ACTIONS = [
  {
    title: "قصف — تشغيل",
    moduleName: "قصف",
    body: "قصف",
  },
  {
    title: "ماهوراغا — تشغيل",
    moduleName: "ماهوراغا",
    body: "ماهوراغا",
  },
  {
    title: "كاتش — تغيير كنيات المجموعة",
    moduleName: "كاتش",
    inputType: "nickname",
    inputPrompt: "رد بالكنية الجديدة التي تريد وضعها للأعضاء.",
  },
  {
    title: "حذف كاتش — مسح الكنيات وإيقاف حمايتها",
    moduleName: "حذف كاتش",
    body: "حذف كاتش",
  },
  {
    title: "مجموعة — تغيير اسم المجموعة وحمايته",
    moduleName: "كاتش",
    inputType: "groupName",
    inputPrompt: "رد باسم المجموعة الجديد.",
  },
  {
    title: "جروب — تغيير الاسم بحماية مؤجلة",
    moduleName: "كاتش",
    inputType: "delayedGroupName",
    inputPrompt:
      "رد بالصيغة: أقل مدة|أكثر مدة اسم المجموعة — المدد بالثواني، مثال: 6|9 اسم المجموعة.",
  },
  {
    title: "بانكاي — تشغيل على عضو",
    moduleName: "بانكاي",
    inputType: "bankaiTarget",
    inputPrompt: "رد بـ ID رقمي صحيح أو اعمل منشن للعضو المستهدف.",
    bodyPrefix: "بانكاي",
  },
  {
    title: "السياجين — إضافة الأعضاء من الملف إلى المجموعة",
    moduleName: "السياجين",
    body: "السياجين",
  },
  {
    title: "تثبيت — تعيين صورة المجموعة",
    moduleName: "تثبيت",
    body: "تثبيت",
    awaitImage: true,
  },
  {
    title: "قصف ايقاف — إيقاف الرسائل المتتابعة",
    moduleName: "قصف",
    body: "قصف ايقاف",
  },
  {
    title: "ماهوراغا ايقاف — إيقاف إرسال الجريدة",
    moduleName: "ماهوراغا",
    body: "ماهوراغا ايقاف",
  },
  {
    title: "بانكاي ايقاف — إيقاف التبديل مع العضو",
    moduleName: "بانكاي",
    body: "بانكاي ايقاف",
  },
  {
    title: "تثبيت ايقاف — إيقاف حماية الصورة",
    moduleName: "تثبيت",
    body: "تثبيت ايقاف",
  },
  {
    title: "رد — إضافة رد أو حذفه أو عرض القائمة",
    moduleName: "رد",
    inputType: "replyRule",
    inputPrompt:
      "رد بأحد الخيارات:\n• كلمة » الرد\n• حذف كلمة\n• قائمة",
  },
  {
    title: "يوت — البحث عن مقطع صوتي وإرساله",
    moduleName: "يوت",
    inputType: "youtubeQuery",
    inputPrompt: "رد باسم المقطع الذي تريد البحث عنه وإرساله.",
  },
  {
    title: "حالة — إرسال حالة البوت إلى الخاص",
    moduleName: "حالة",
    body: "حالة",
    destination: "admin",
  },
  {
    title: "إيقاف يوت — منع الجميع من البحث عن الأغاني",
    moduleName: "يوت",
    destination: "admin",
    youtubeEnabled: false,
  },
  {
    title: "تشغيل يوت — السماح للجميع بالبحث عن الأغاني",
    moduleName: "يوت",
    destination: "admin",
    youtubeEnabled: true,
  },
];

const MAIN_MENU = [
  "⋯⌁⟖ 𝒁𝑬𝑫 𝑯𝑬𝑳𝑳𝑲𝑰𝑵𝑮 𝑩𝑶𝑻 ⃞⃟ ❞ ⟕⌁⋯",
  "",
  "╭━━━「 لوحة تحكم البوت 」━━━╮",
  "1 — قائمة الأوامر",
  "2 — التحكم عن بُعد",
  "╰━━━━━━━━━━━━━━━━━━━━━━╯",
  "↩️ اختر بالرد على هذه الرسالة بالرقم 1 أو 2.",
].join("\n");

const REMOTE_MENU = [
  "╭━━━「 التحكم عن بُعد 」━━━╮",
  ...REMOTE_ACTIONS.map((action, index) => `${index + 1} — ${action.title}`),
  "╰━━━━━━━━━━━━━━━━━━━━━━╯",
  "↩️ اختر رقم الأمر بالرد على هذه الرسالة.",
].join("\n");

function normalizeDigits(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .trim();
}

function parseNumber(value) {
  const normalized = normalizeDigits(value);
  if (!/^\d+$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) ? number : null;
}

function makeSessionKey(adminID, threadID) {
  return JSON.stringify([String(adminID), String(threadID)]);
}

async function fetchGroups(api) {
  if (typeof api.getThreadList !== "function") {
    throw new Error("مكتبة البوت لا توفر جلب قائمة المحادثات.");
  }

  const groupsByID = new Map();
  let truncated = false;

  for (const tag of ["INBOX", "ARCHIVED"]) {
    let before = null;
    let reachedPageLimit = true;

    try {
      for (let pageIndex = 0; pageIndex < MAX_THREAD_PAGES; pageIndex += 1) {
        const threads = await api.getThreadList(THREAD_PAGE_SIZE, before, [tag]);
        if (!Array.isArray(threads) || threads.length === 0) {
          reachedPageLimit = false;
          break;
        }

        for (const thread of threads) {
          if (thread && thread.isGroup && thread.threadID) {
            groupsByID.set(String(thread.threadID), {
              ...thread,
              threadID: String(thread.threadID),
            });
          }
        }

        if (threads.length < THREAD_PAGE_SIZE) {
          reachedPageLimit = false;
          break;
        }

        const nextBefore = Number(threads[threads.length - 1].timestamp);
        if (
          !Number.isSafeInteger(nextBefore) ||
          nextBefore <= 0 ||
          nextBefore === Number(before)
        ) {
          reachedPageLimit = false;
          break;
        }
        before = nextBefore;
      }
    } catch (error) {
      if (tag === "INBOX" || groupsByID.size === 0) throw error;
      console.warn("[التحكم عن بُعد] تعذر تحميل المجموعات المؤرشفة:", error.message || error);
      reachedPageLimit = false;
    }

    if (reachedPageLimit) truncated = true;
  }

  const groups = [...groupsByID.values()]
    .map((group) => ({
      ...group,
      threadName:
        String(group.threadName || group.name || "").replace(/\s+/g, " ").trim() ||
        `مجموعة بدون اسم (${String(group.threadID).slice(-5)})`,
    }))
    .sort((a, b) => a.threadName.localeCompare(b.threadName, "ar"));

  return { groups, truncated };
}

function groupListMessage(session, pageIndex) {
  const start = pageIndex * GROUP_PAGE_SIZE;
  const end = Math.min(start + GROUP_PAGE_SIZE, session.groups.length);
  const lines = [
    "╭━━━「 اختر المجموعة 」━━━╮",
    `المجموعات ${start + 1}–${end} من ${session.groups.length}:`,
    "",
  ];

  for (let index = start; index < end; index += 1) {
    lines.push(`${index + 1} — ${session.groups[index].threadName}`);
  }

  if (start > 0) lines.push("", "للصفحة السابقة، رد بكلمة: السابق");
  if (end < session.groups.length) lines.push("للمزيد، رد بكلمة: التالي");
  if (session.groupsTruncated) {
    lines.push("", "ملاحظة: القائمة طويلة؛ تم عرض الحد الأقصى المتاح من المحادثات.");
  }
  lines.push("╰━━━━━━━━━━━━━━━━━━━━━━╯", "↩️ اختر رقم المجموعة بالرد على هذه الرسالة.");
  return lines.join("\n");
}

function inputResult(action, event) {
  const text = String(event.body || "").trim();
  if (!text) return { error: "الرد فارغ. أرسل قيمة غير فارغة." };

  switch (action.inputType) {
    case "nickname":
      return { body: `كاتش ${text}` };
    case "groupName":
      return { body: `مجموعة ${text}` };
    case "delayedGroupName": {
      const value = normalizeDigits(text);
      const match = value.match(/^(\d+)\|(\d+)\s+(.+)$/);
      if (!match || Number(match[1]) >= Number(match[2])) {
        return {
          error: "الصيغة غير صحيحة. اكتب مثلًا: 6|9 اسم المجموعة، ويجب أن يكون الحد الأول أصغر.",
        };
      }
      return { body: `جروب ${value}` };
    }
    case "bankaiTarget": {
      const mentions = event.mentions || {};
      const mentionedID = Object.keys(mentions)[0];
      if (mentionedID) {
        return { body: `${action.bodyPrefix} ${text}`, mentions };
      }
      const targetID = normalizeDigits(text);
      if (!/^\d+$/.test(targetID)) {
        return { error: "أرسل ID رقميًا صحيحًا أو اعمل منشن للعضو." };
      }
      return { body: `${action.bodyPrefix} ${targetID}`, mentions: {} };
    }
    case "replyRule": {
      const value = text.toLowerCase();
      if (value === "قائمة") return { body: "رد قائمة" };
      if (value.startsWith("حذف ")) {
        const trigger = text.slice("حذف ".length).trim();
        return trigger ? { body: `رد حذف ${trigger}` } : { error: "اكتب الكلمة بعد «حذف»." };
      }
      const separator = text.indexOf("»");
      if (separator > 0 && text.slice(separator + 1).trim()) {
        return { body: `رد ${text}` };
      }
      return {
        error: "الصيغة غير صحيحة. اكتب: كلمة » الرد، أو حذف كلمة، أو قائمة.",
      };
    }
    case "youtubeQuery":
      return { body: `يوت ${text}` };
    default:
      return { error: "نوع الإدخال غير معروف." };
  }
}

function createRemoteControl({ isAdmin, getGroups = fetchGroups }) {
  const sessions = new Map();

  async function sendPrompt(api, session, message) {
    const result = await api.sendMessage(message, session.controlThreadID);
    if (!result || !result.messageID) {
      throw new Error("لم تُرجع مكتبة البوت رقم رسالة القائمة.");
    }
    session.promptMessageID = String(result.messageID);
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    sessions.set(session.key, session);
  }

  async function startMenu(api, event, commands) {
    const adminID = String(event.senderID || "");
    if (!isAdmin(adminID)) return false;

    const controlThreadID = String(event.threadID || "");
    if (!controlThreadID) return false;

    const helpCommand = commands.get("أوامر");
    if (!helpCommand || typeof helpCommand.getCommandsMessage !== "function") {
      throw new Error("قائمة الأوامر غير محمّلة.");
    }

    const session = {
      key: makeSessionKey(adminID, controlThreadID),
      adminID,
      controlThreadID,
      controlIsGroup: event.isGroup !== false,
      helpMessage: helpCommand.getCommandsMessage(),
      phase: "main-menu",
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    sessions.set(session.key, session);
    try {
      const groupNotice = session.controlIsGroup
        ? "\n\n🔒 القائمة ظاهرة لأعضاء المجموعة، لكن المشرف الذي بدأها فقط يستطيع متابعة التحكم."
        : "";
      await sendPrompt(api, session, `${MAIN_MENU}${groupNotice}`);
    } catch (error) {
      sessions.delete(session.key);
      throw error;
    }
    return true;
  }

  async function showRemoteActions(api, session) {
    session.phase = "remote-action";
    await sendPrompt(api, session, REMOTE_MENU);
  }

  async function showGroups(api, session) {
    const result = await getGroups(api);
    const groups = Array.isArray(result) ? result : result.groups;
    if (!Array.isArray(groups) || groups.length === 0) {
      sessions.delete(session.key);
      await api.sendMessage(
        "لم أجد مجموعات في قائمة الوارد أو المؤرشف. تأكد أن البوت عضو في المجموعات ثم أعد المحاولة.",
        session.controlThreadID,
      );
      return;
    }

    session.groups = groups;
    session.groupsTruncated = !Array.isArray(result) && !!result.truncated;
    session.groupPage = 0;
    session.phase = "group-select";
    await sendPrompt(api, session, groupListMessage(session, session.groupPage));
  }

  async function executeAction(api, session, commands, group) {
    const action = session.action;
    const command = commands.get(action.moduleName);
    if (
      !command ||
      typeof command.execute !== "function" ||
      (action.youtubeEnabled !== undefined &&
        typeof command.setEnabled !== "function")
    ) {
      throw new Error(`الأمر «${action.moduleName}» غير محمّل.`);
    }

    const targetThreadID =
      action.destination === "admin" ? session.controlThreadID : group.threadID;
    const remoteEvent = {
      body: session.commandBody || action.body || "",
      threadID: targetThreadID,
      senderID: session.adminID,
      isGroup: action.destination !== "admin",
      participantIDs: [],
      mentions: session.mentions || {},
      messageID: session.inputMessageID,
    };
    if (session.imageReply) remoteEvent.messageReply = session.imageReply;

    sessions.delete(session.key);
    if (action.youtubeEnabled !== undefined) {
      await command.setEnabled(api, remoteEvent, action.youtubeEnabled);
      return;
    }
    await command.execute(api, remoteEvent);

    if (action.destination === "admin") return;
    const groupName = group.threadName || group.threadID;
    await api.sendMessage(
      `✅ تم إرسال «${action.title}» إلى مجموعة «${groupName}».`,
      session.controlThreadID,
    );
  }

  async function handleMessage(api, event, commands) {
    const adminID = String(event.senderID || "");
    if (!isAdmin(adminID)) return false;

    const controlThreadID = String(event.threadID || "");
    const sessionKey = makeSessionKey(adminID, controlThreadID);
    const session = sessions.get(sessionKey);
    if (!session) return false;

    const replyID = event.messageReply && event.messageReply.messageID;
    const isExpectedReply =
      controlThreadID === session.controlThreadID &&
      replyID &&
      String(replyID) === session.promptMessageID;
    if (!isExpectedReply) return false;

    if (Date.now() > session.expiresAt) {
      sessions.delete(session.key);
      await api.sendMessage(
        "انتهت صلاحية جلسة التحكم. اكتب «اوامر» لبدء جلسة جديدة.",
        session.controlThreadID,
      );
      return true;
    }

    session.expiresAt = Date.now() + SESSION_TTL_MS;
    const body = String(event.body || "").trim();

    try {
      if (session.phase === "main-menu") {
        const choice = parseNumber(body);
        if (choice === 1) {
          sessions.delete(session.key);
          await api.sendMessage(session.helpMessage, session.controlThreadID);
          return true;
        }
        if (choice === 2) {
          await showRemoteActions(api, session);
          return true;
        }
        await sendPrompt(
          api,
          session,
          `${MAIN_MENU}\n\n⚠️ الاختيار غير صحيح. رد بالرقم 1 أو 2.`,
        );
        return true;
      }

      if (session.phase === "remote-action") {
        const choice = parseNumber(body);
        const action = choice && REMOTE_ACTIONS[choice - 1];
        if (!action) {
          await sendPrompt(
            api,
            session,
            `${REMOTE_MENU}\n\n⚠️ اختر رقمًا من القائمة.`,
          );
          return true;
        }

        session.action = action;
        if (action.destination === "admin") {
          session.commandBody = action.body;
          await executeAction(api, session, commands, null);
          return true;
        }
        if (action.inputType) {
          session.phase = "input";
          await sendPrompt(api, session, `${action.inputPrompt}\n\n↩️ أرسل ردك على هذه الرسالة.`);
          return true;
        }
        session.commandBody = action.body;
        if (action.awaitImage) session.awaitImage = true;
        await showGroups(api, session);
        return true;
      }

      if (session.phase === "input") {
        const result = inputResult(session.action, event);
        if (result.error) {
          await sendPrompt(
            api,
            session,
            `⚠️ ${result.error}\n\n${session.action.inputPrompt || "أرسل قيمة صحيحة."}\n\n↩️ أعد الرد على هذه الرسالة.`,
          );
          return true;
        }
        session.commandBody = result.body;
        session.mentions = result.mentions || {};
        session.inputMessageID = event.messageID;
        await showGroups(api, session);
        return true;
      }

      if (session.phase === "group-select") {
        const normalized = normalizeDigits(body);
        const pageCount = Math.ceil(session.groups.length / GROUP_PAGE_SIZE);
        if (normalized === "التالي" && session.groupPage + 1 < pageCount) {
          session.groupPage += 1;
          await sendPrompt(api, session, groupListMessage(session, session.groupPage));
          return true;
        }
        if (normalized === "السابق" && session.groupPage > 0) {
          session.groupPage -= 1;
          await sendPrompt(api, session, groupListMessage(session, session.groupPage));
          return true;
        }

        const choice = parseNumber(normalized);
        const start = session.groupPage * GROUP_PAGE_SIZE;
        const end = Math.min(start + GROUP_PAGE_SIZE, session.groups.length);
        if (!choice || choice < start + 1 || choice > end) {
          await sendPrompt(
            api,
            session,
            `${groupListMessage(session, session.groupPage)}\n\n⚠️ اختر رقمًا ظاهرًا في هذه الصفحة.`,
          );
          return true;
        }

        session.selectedGroup = session.groups[choice - 1];
        if (session.awaitImage) {
          session.phase = "image";
          await sendPrompt(
            api,
            session,
            `تم اختيار «${session.selectedGroup.threadName}».\nأرسل الصورة كرد على هذه الرسالة لتعيينها صورةً للمجموعة.\n\n↩️ يجب أن يحتوي ردك على صورة.`,
          );
          return true;
        }
        await executeAction(api, session, commands, session.selectedGroup);
        return true;
      }

      if (session.phase === "image") {
        const image = (Array.isArray(event.attachments) ? event.attachments : []).find(
          (attachment) =>
            attachment &&
            (attachment.type === "photo" || attachment.type === "image") &&
            (attachment.url || attachment.largePreviewUrl || attachment.previewUrl),
        );
        if (!image) {
          await sendPrompt(
            api,
            session,
            "لم أستلم صورة. أرسل الصورة كرد على هذه الرسالة.",
          );
          return true;
        }
        session.imageReply = {
          messageID: String(event.messageID || ""),
          senderID: adminID,
          body: String(event.body || ""),
          attachments: [image],
          timestamp: event.timestamp,
        };
        await executeAction(api, session, commands, session.selectedGroup);
        return true;
      }
    } catch (error) {
      sessions.delete(session.key);
      console.error("[التحكم عن بُعد] خطأ:", error.message || error);
      await api.sendMessage(
        `❌ تعذر إكمال التحكم عن بُعد: ${error.message || "خطأ غير معروف"}\nاكتب «اوامر» للبدء من جديد.`,
        session.controlThreadID,
      );
      return true;
    }

    sessions.delete(session.key);
    await api.sendMessage(
      "انتهت هذه الخطوة. اكتب «اوامر» لبدء التحكم من جديد.",
      session.controlThreadID,
    );
    return true;
  }

  return { startMenu, handleMessage };
}

module.exports = { createRemoteControl, REMOTE_ACTIONS };
