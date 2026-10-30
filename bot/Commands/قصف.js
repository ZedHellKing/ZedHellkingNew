const { getSharedNewspaperStore } = require("../newspaper-store");

const SPAM_START = `🔮꙰ 𝆺𝅥⃝𝗕𝗢𝗥𝗡 𝗧𝗢 𝗥𝗨𝗟𝗘 ༐ ⦓🧧⦔ 𝗙𝗟꙰𝗔𝗦꙰𝗛 ⃞⃟ ┊ 𝐂𝐑⃘𝐔⃪𝐒𝐇͡𝐈͜𝐍𝐆͠ 𝐇̸⃫𝐔𝐌⃝𝐀𝐍𝐈꙰𝐓𝐘̅ 🪩꙰〙 ┊

         ⏤ᅠᅠ ᅠᅠᅠ⏤͟͟ ✠ 𝐑 𝐔 𝐋 𝐄 𝐑 𝐒 ( 支配者 ) 𓆩𖢘𓆪 ( التشغيل )
         ⌯               .  ⦓🧧⦔  .              ⌯
ᅠᅠᅠᅠᅠᅠᅠᅠ 🌌꙰ [ جَـــارِي بَـــدْءُ إِرْسَـــالِ الـجَـــرَائـــدِ ] 🌌꙰
  ᅠᅠᅠᅠᅠᅠᅠᅠᅠ   ─⃝͎̽𝙈𖤌˖𝘼ɵ𝆭͜͡𝙃͎𝆭̽𝙊𝆭⃟ 𝙍𖤌˖𝘼ɵ𝆭͜͡𝙂͎𝆭̽𝘼𝆭⃟✬
 ᅠ   ⁽ ʿ ⧺   ᚜𝐅⃘𝐋𝐀⃕𝐒𝐇⃫⟢ᚘ⟢𝐋̶ؗ𝐎̲҇͟𝐑͐𝐃 𝐆𝐀̶𝐋̶ؗ𝐀̸𐇽⃜𝐗𝐘̅ ⃞⃟ ᚛ ⧺`;

const SPAM_STOP = `🔮꙰ 𝆺𝅥⃝𝗕𝗢𝗥𝗡 𝗧𝗢 𝗥𝗨𝗟𝗘 ༐ ⦓🧧⦔ 𝗙𝗟꙰𝗔𝗦꙰𝗛 ⃞⃟ ⃞⃟ ┊ 𝐂𝐑⃘𝐔⃪𝐒𝐇͡𝐈͜𝐍𝐆͠ 𝐇̸⃫𝐔𝐌⃝𝐀𝐍𝐈꙰𝐓𝐘̅ 🪩꙰〙 ┊

      ⏤ᅠᅠ ᅠᅠᅠ⏤͟͟ ✠ 𝐑 𝐔 𝐋 𝐄 𝐑 𝐒 ( 支配者 ) 𓆩𖢘𓆪  ( الإيقاف )

ᅠᅠᅠᅠᅠᅠᅠ 🌌꙰ [ تـ٠ــمْ إيـ٠ــقـ٠ــاـ٠ــفْ الـ٠ــجـ٠ــرـ٠ــاـ٠ــئـ٠ــدـ٠ـــ ] 🌌꙰
        ⌯               .  ⦓🧧⦔  .              ⌯
  ᅠᅠᅠᅠᅠᅠᅠᅠᅠ   ─⃝͎̽𝙈𖤌˖𝘼ɵ𝆭͜͡𝙃͎𝆭̽𝙊𝆭⃟ 𝙍𖤌˖𝘼ɵ𝆭͜͡𝙂͎𝆭̽𝘼𝆭⃟✬
 ᅠ  ⁽ ʿ ⧺   ᚜𝐅⃘𝐋𝐀⃕𝐒𝐇⃫ ⟢ᚘ⟢ 𝐋̶ؗ𝐎̲҇͟𝐑͐𝐃 𝐆𝐀̶𝐋̶ؗ𝐀̸𐇽⃜𝐗𝐘̅ ⃞⃟ ᚛ ⧺`;

const NEWSPAPER_1 = `𝐀⃥𝐔̈𝐓҈᪾𝐎̲҇͟ 𝗥̶𝗘̶𝐏⃕𝐋𝐘

   ⋟❪ 𝐓⃕𝐡⃪e 𝐒𝐭𝐚𝐫︭𝐬︭ ❫ ‹ 𝖐̶𝖎̶𝖓̶𝖌̶𝖘̶ ›

      ➟ 𝗙𝗟꙰𝗔𝗦꙰𝗛┊  𝐑⃝̄𝐔⃥𝐋̲̅𝐄⃩𝐑͐𝐒͈̎ •  ❪ ✦ ❫

╰┈𝐓𝐇𝐄 𝐒𝐏𝐄𝐄𝐃𝐒𝐓𝐄𝐑 𝐏𝐔𝐏𝐏𝐄𝐓 𝐗.. 🎁


⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
╰➤ ⌯『 𝐑𝐔̅𝐋𝐈⃫̷𝐍͡𝐆͜ 𝐓͝͡𝐇𝐄 𝐆𝐀̶𝐋̶ؗ𝐀̸𐇽⃜𝐗𝐘̅ 』⁽🌪⁾

〖𝐅⃘𝐋𝐀⃕𝐒𝐇⃫ 〗─〘 𝐋̶ؗ𝐎̲҇͟𝐑͐𝐃 𝐆𝐀̶𝐋̶ؗ𝐀̸𐇽⃜𝐗𝐘̅ 🌌 〙

 ᅠᅠ⏤͟͟ ✠ 𝐑⃝̄𝐔⃥𝐋̲̅𝐄⃩𝐑͐𝐒͈̎ ( 支配者 ) 𓆩𖤐𓆪

  ᅠᅠᅠᅠᅠᅠ￤⌯.❪ 🏴󠁧󠁢󠁷󠁬󠁳󠁿∶ ❫.⌯￤`;

const NEWSPAPER_2 = `𝐀⃥𝐔̈𝐓҈᪾𝐎̲҇͟ 𝗥̶𝗘̶𝐏⃕𝐋𝐘

   ⋟❪ 𝐓⃕𝐡⃪e 𝐒𝐭𝐚𝐫︭𝐬︭ ❫ ‹ 𝖐̶𝖎̶𝖓̶𝖌̶𝖘̶ ›

      ➟ 𝗙𝗟꙰𝗔𝗦꙰𝗛┊  𝐑⃝̄𝐔⃥𝐋̲̅𝐄⃩𝐑͐𝐒͈̎ •  ❪ ✦ ❫

╰┈𝐓𝐇𝐄 𝐒𝐏𝐄𝐄𝐃𝐒𝐓𝐄𝐑 𝐏𝐔𝐏𝐏𝐄𝐓 𝐗.. 🎁


⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
⏤͟͞꙰🌌꙰ -𝐆꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐋꙰- ‹⚪꙰› ៹࣪🌌꙰ -𝐀꙰- ‹⚪꙰› ៹࣪🪩꙰ -𝐗꙰- ‹⚪꙰› ៹࣪🔮꙰ -𝐘꙰- ‹⚪꙰› ៹࣪🌌꙰ ⏤͟͞꙰
╰➤ ⌯『 𝐑𝐔̅𝐋𝐈⃫̷𝐍͡𝐆͜ 𝐓͝͡𝐇𝐄 𝐆𝐀̶𝐋̶ؗ𝐀̸𐇽⃜𝐗𝐘̅ 』⁽🌪⁾

〖𝐅⃘𝐋𝐀⃕𝐒𝐇⃫ 〗─〘 𝐋̶ؗ𝐎̲҇͟𝐑͐𝐃 𝐆𝐀̶𝐋̶ؗ𝐀̸𐇽⃜𝐗𝐘̅ 🌌 〙

 ᅠᅠ⏤͟͟ ✠ 𝐑⃝̄𝐔⃥𝐋̲̅𝐄⃩𝐑͐𝐒͈̎ ( 支配者 ) 𓆩𖤐𓆪

  ᅠᅠᅠᅠᅠᅠ￤⌯.❪ 🏴󠁧󠁢󠁷󠁬󠁳󠁿∶ ❫.⌯￤`;

// Cycle: 4 messages (1-3 use NEWSPAPER_1, 4 uses NEWSPAPER_2)
// Msg1: 20-22s, Msg2: 27-28s, Msg3: 31-33s, Msg4: 35s
function getDelayForCycle(index) {
  const cycleIndex = index % 4;
  if (cycleIndex === 0) {
    return 20000 + Math.floor(Math.random() * 3000);
  } else if (cycleIndex === 1) {
    return 27000 + Math.floor(Math.random() * 1000);
  } else if (cycleIndex === 2) {
    return 31000 + Math.floor(Math.random() * 3000);
  } else {
    return 35000;
  }
}

function getDefaultTextForCycle(index) {
  const cycleIndex = index % 4;
  return cycleIndex === 3 ? NEWSPAPER_2 : NEWSPAPER_1;
}

const newspaperStore = getSharedNewspaperStore();

function createNewspaperTextProvider(store) {
  return {
    get(index) {
      return store.get() ?? getDefaultTextForCycle(index);
    },
    setNewspaperText(text) {
      return store.set(text);
    },
  };
}

const newspaperTextProvider = createNewspaperTextProvider(newspaperStore);

function getTextForCycle(index) {
  return newspaperTextProvider.get(index);
}

const activeLoops = new Map();
let _reqCounter = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// دالة مخصصة للكتابة — تُجبر is_group_thread=1 لأن ws3-fca يكشف الجروب بطول >= 16
// لكن جروباتنا 15 رقم فيُرسلها كـ private خطأً
async function sendTyping(api, threadID, isTyping) {
  try {
    const mqttClient = api.ctx && api.ctx.mqttClient;
    if (!mqttClient) {
      // fallback للدالة الأصلية
      await api.sendTypingIndicator(isTyping, threadID);
      return;
    }
    const wsContent = {
      app_id: 2220391788200892,
      payload: JSON.stringify({
        label: 3,
        payload: JSON.stringify({
          thread_key: String(threadID),
          is_group_thread: 1, // ← دائماً 1 لأننا نشتغل في جروبات
          is_typing: isTyping ? 1 : 0,
          attribution: 0,
        }),
        version: 5849951561777440,
      }),
      request_id: ++_reqCounter,
      type: 4,
    };
    await new Promise((resolve, reject) =>
      mqttClient.publish("/ls_req", JSON.stringify(wsContent), {}, (err) =>
        err ? reject(err) : resolve(),
      ),
    );
  } catch (e) {
    console.error(`[قصف] خطأ typing:`, e.message || e);
  }
}

async function spamLoop(api, threadID) {
  let cycleIndex = 0;
  while (activeLoops.get(threadID)) {
    try {
      const delay = getDelayForCycle(cycleIndex);

      // محاكاة الكتابة البشرية (3-6 ثواني)
      const typingTime = 3000 + Math.floor(Math.random() * 3000);
      await sendTyping(api, threadID, true);
      await sleep(typingTime);
      await sendTyping(api, threadID, false);

      const text = getTextForCycle(cycleIndex);
      await api.sendMessage(text, threadID);
      console.log(
        `[قصف] ✍️ جريدة #${cycleIndex + 1} (كتابة ${(typingTime / 1000).toFixed(1)}ث) | تأخير ${(delay / 1000).toFixed(0)}ث`,
      );
      await sleep(delay);
      cycleIndex++;
    } catch (e) {
      console.error(`[قصف] خطأ في الإرسال:`, e.message || e);
      await sendTyping(api, threadID, false);
      await sleep(5000);
    }
  }
  console.log(`[قصف] توقف الحلقة في ${threadID}`);
}

module.exports = {
  name: "قصف",
  createNewspaperTextProvider,

  setNewspaperText(text) {
    return newspaperTextProvider.setNewspaperText(text);
  },

  async execute(api, event) {
    const threadID = String(event.threadID);
    const body = (event.body || "").trim();

    if (body === "قصف ايقاف" || body === "قصف إيقاف") {
      if (activeLoops.get(threadID)) {
        activeLoops.set(threadID, false);
        try {
          await api.sendMessage(SPAM_STOP, threadID);
        } catch (e) {}
      } else {
        try {
          await api.sendMessage("⚠️ لا يوجد إرسال جاري حالياً.", threadID);
        } catch (e) {}
      }
      return;
    }

    if (body === "قصف") {
      if (activeLoops.get(threadID)) {
        try {
          await api.sendMessage("⚠️ الجرائد تعمل بالفعل!", threadID);
        } catch (e) {}
        return;
      }
      try {
        await api.sendMessage(SPAM_START, threadID);
      } catch (e) {}
      activeLoops.set(threadID, true);
      spamLoop(api, threadID);
    }
  },

  isActive(threadID) {
    return activeLoops.get(String(threadID)) || false;
  },

  getNewspaperText(index) {
    return getTextForCycle(index);
  },

  getStartMessage() {
    return SPAM_START;
  },

  getStopMessage() {
    return SPAM_STOP;
  },

  resumeAll(api) {
    for (const [threadID, active] of activeLoops.entries()) {
      if (active) {
        console.log(`[قصف] استئناف الحلقة في ${threadID} بعد الاتصال`);
        spamLoop(api, threadID);
      }
    }
  },
};
