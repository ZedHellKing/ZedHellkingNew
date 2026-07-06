const SPAM_START = `🇦🇱 𝆺𝅥⃝𝗕𝗢𝗥𝗡 𝗧𝗢 𝗥𝗨𝗟𝗘 ༐ ୨ৎ⃝ ˖ 🇦🇱 𝆺𝅥⃝𝗭𝗘𝗗 ┊ 𝗕𝗘𝗬𝗢𝗡𝗗 𝗟𝑰𝑴𝑰𝑻𝑺 ┊

                 ⏤͟͟ ✠ 𝐌 𝐀 𝐇 𝐎 𝐑 𝐀 𝐆 𝐀 ( التشغيل )

ᅠᅠᅠᅠᅠᅠᅠᅠ  🇦🇱 ⚡️ [ جَـــارِي بَـــدْءُ إِرْسَـــالِ الـجَـــرَائـــدِ ] ⚡️ 🇦🇱
  ᅠᅠᅠᅠᅠᅠᅠᅠᅠ   ─⃝͎̽𝙈𖤌˖𝘼ɵ𝆭͜͡𝙃͎𝆭̽𝙊𝆭⃟ 𝙍𖤌˖𝘼ɵ𝆭͜͡𝙂͎𝆭̽𝘼𝆭⃟✬
 ᅠᅠᅠᅠᅠ     ⁽ ʿ ᶠˑᴶ🇦🇱 ᴛʜᴇ ᴅ𝒆𝒗𝒊𝒍 𝒉𝒊𝒎𝒔𝒆𝒍𝒇 ʾ ⁾`;

const SPAM_STOP = `🇦🇱 𝆺𝅥⃝𝗕𝗢𝗥𝗡 𝗧𝗢 𝗥𝗨𝗟𝗘 ༐ ୨ৎ⃝ ˖ 🇦🇱 𝆺𝅥⃝𝗭𝗘𝗗 ┊ 𝗕𝗘𝗬𝗢𝗡𝗗 Л𝑰𝑴𝑰𝑻𝑺 ┊

                 ⏤͟͟ ✠ 𝐌 𝐀 𝐇 𝐎 𝐑 𝐀 𝐆 𝐀 ( الإيقاف )

ᅠᅠᅠᅠᅠᅠᅠᅠ  🇦🇱 ⚡️ [ تـ٠ــمْ إيـ٠ــقـ٠ــاـ٠ــفْ الـ٠ــجـ٠ــرـ٠ــاـ٠ــئـ٠ــدـ٠ـــ ] ⚡️ 🇦🇱
  ᅠᅠᅠᅠᅠᅠᅠᅠᅠ   ─⃝͎̽𝙈𖤌˖𝘼ɵ𝆭͜͡𝙃͎𝆭̽𝙊𝆭⃟ 𝙍𖤌˖𝘼ɵ𝆭͜͡𝙂͎𝆭̽𝘼𝆭⃟✬
 ᅠᅠᅠᅠᅠ     ⁽ ʿ ᶠˑᴶ🇦🇱 ᴛʜᴇ ᴅ𝒆𝒗𝒊𝒍 𝒉𝒊𝒎𝒔𝒆𝒍𝒇 ʾ ⁾`;

const NEWSPAPER_1 = `⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠
 ⇣ . 
ㅤ 𝐼𝑡'𝑠 𝑑𝑎𝑛𝑔𝑒𝑟𝑜𝑢𝑠 𝑡𝑜 𝑔𝑒𝑡 𝑡𝑜𝑜 𝑖𝑛𝑣𝑜𝑙𝑣𝑒𝑑...
 ⇣ . 
⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱س𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠
  ⇣ .
柱 ︐ㅤ𓅖ㅤ ｜   .  𝐏 𝐎 𝐒 𝐀 𝐃 𝐀  - 𝐖 𝐀 𝐍 𝐒 𝐇 𝐔 𝐍 𝐆   ៶
  ⇣ . 
⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠

🇦🇱 𝆺𝅥⃝𝗕𝗢𝗥𝗡 𝗧𝗢 𝗥𝗨𝗟𝗘 ༐ ୨ৎ⃝ ˖ 🇦🇱 𝆺𝅥⃝𝗭𝗘𝗗 ┊ 𝗕𝗘𝗬𝗢𝗡𝗗 𝗟𝗜𝗠𝗜𝗧𝗦 ┊

                 ⏤͟͟ ✠ 𝐃 𝐄 𝐀 𝐓 𝐇 ( 处理 )

ᅠᅠᅠᅠᅠᅠᅠᅠ  𝗧𝗵𝗲 𝗞𝗶𝗻𝗴 𝗼𝗳 𝗛𝗲𝗹𝗹 𝗛𝗮𝘀 𝗥𝗲𝘁𝘂𝗿𝗻𝗲𝗱
  ᅠᅠᅠᅠᅠᅠᅠᅠᅠ   ─⃝͎̽𝙃𖤌˖𝙀ɵ𝆭͜͡L͎𝆭̽L𝆭⃟ 𝙆𖤌˖𝙄ɵ𝆭͜͡N͎𝆭̽𝙂𝆭⃟✬
 ᅠᅠᅠᅠᅠ     ⁽ ʿ ᶠˑᴶᴬᴺ ᴛʜᴇ ᴅᴇᴠɪʟ ʜɪᴍsᴇʟꜰ ʾ ⁾
`;

const NEWSPAPER_2 = `⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠
 ⇣ . 
ㅤ 𝐼𝑡'𝑠 𝑑𝑎𝑛𝑔𝑒𝑟𝑜𝑢𝑠 𝑡𝑜 𝑔𝑒𝑡 𝑡𝑜𝑜 𝑖𝑛𝑣𝑜𝑙𝑣𝑒𝑑...
 ⇣ . 
⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱س𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠
  ⇣ .
柱 ︐ㅤ𓅖ㅤ ｜   .  𝐏 𝐎 𝐒 𝐀 𝐃 𝐀  - 𝐖 𝐀 𝐍 𝐒 𝐇 𝐔 𝐍 𝐆   ៶
  ⇣ . 
⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠”𝑫卍𓃵 𐎠” ⋆⃟🇦🇱𝑬卍𓃵⋆⃟🇦🇱𝑬卍𓃵 𐎠” ⋆⃟🇦🇱𝑴卍𓃵 𐎠” ⋆⃟🇦🇱𝐕卍𓃵 𐎠”⋆⃟🇦🇱𝐈卍𓃵𐎠” ⋆⃟🇦🇱𝐋卍𓃵 𐎠

🇦🇱 𝆺𝅥⃝𝗕𝗢𝗥𝗡 𝗧𝗢 𝗥𝗨𝗟𝗘 ༐ ୨ৎ⃝ ˖ 🇦🇱 𝆺𝅥⃝𝗭𝗘𝗗 ┊ 𝗕𝗘𝗬𝗢𝗡𝗗 𝗟𝗜𝗠𝗜𝗧𝗦 ┊

                 ⏤͟͟ ✠ 𝐃 𝐄 𝐀 𝐓 𝐇 ( 处理 )

ᅠᅠᅠᅠᅠᅠᅠᅠ  𝗧𝗵𝗲 𝗞𝗶𝗻𝗴 𝗼𝗳 𝗛𝗲𝗹𝗹 𝗛𝗮𝘀 𝗥𝗲𝘁𝘂𝗿𝗻𝗲𝗱
  ᅠᅠᅠᅠᅠᅠᅠᅠᅠ   ─⃝͎̽𝙃𖤌˖𝙀ɵ𝆭͜͡L͎𝆭̽L𝆭⃟ 𝙆𖤌˖𝙄ɵ𝆭͜͡N͎𝆭̽𝙂𝆭⃟✬
 ᅠᅠᅠᅠᅠ     ⁽ ʿ ᶠˑᴶᴬᴺ ᴛʜᴇ ᴅᴇᴠɪʟ ʜɪᴍsᴇʟꜰ ʾ ⁾
`;

// Cycle: 4 messages (1-3 use NEWSPAPER_1, 4 uses NEWSPAPER_2)
// Msg1: 20-22s, Msg2: 27-28s, Msg3: 31-33s, Msg4: 35s
function getDelayForCycle(index) {
  const cycleIndex = index % 4;
  if (cycleIndex === 0) {
    return (20000 + Math.floor(Math.random() * 3000));
  } else if (cycleIndex === 1) {
    return (27000 + Math.floor(Math.random() * 1000));
  } else if (cycleIndex === 2) {
    return (31000 + Math.floor(Math.random() * 3000));
  } else {
    return 35000;
  }
}

function getTextForCycle(index) {
  const cycleIndex = index % 4;
  return (cycleIndex === 3) ? NEWSPAPER_2 : NEWSPAPER_1;
}

const activeLoops = new Map();
let _reqCounter = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
          is_group_thread: 1,       // ← دائماً 1 لأننا نشتغل في جروبات
          is_typing: isTyping ? 1 : 0,
          attribution: 0
        }),
        version: 5849951561777440
      }),
      request_id: ++_reqCounter,
      type: 4
    };
    await new Promise((resolve, reject) =>
      mqttClient.publish('/ls_req', JSON.stringify(wsContent), {}, (err) => err ? reject(err) : resolve())
    );
  } catch (e) {
    console.error(`[قصف] خطأ typing:`, e.message || e);
  }
}

async function spamLoop(api, threadID) {
  let cycleIndex = 0;
  while (activeLoops.get(threadID)) {
    try {
      const text = getTextForCycle(cycleIndex);
      const delay = getDelayForCycle(cycleIndex);

      // محاكاة الكتابة البشرية (3-6 ثواني)
      const typingTime = 3000 + Math.floor(Math.random() * 3000);
      await sendTyping(api, threadID, true);
      await sleep(typingTime);
      await sendTyping(api, threadID, false);

      await api.sendMessage(text, threadID);
      console.log(`[قصف] ✍️ جريدة #${cycleIndex + 1} (كتابة ${(typingTime/1000).toFixed(1)}ث) | تأخير ${(delay/1000).toFixed(0)}ث`);
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
  name: 'قصف',

  async execute(api, event) {
    const threadID = String(event.threadID);
    const body = (event.body || '').trim();

    if (body === 'قصف ايقاف' || body === 'قصف إيقاف') {
      if (activeLoops.get(threadID)) {
        activeLoops.set(threadID, false);
        try { await api.sendMessage(SPAM_STOP, threadID); } catch (e) {}
      } else {
        try { await api.sendMessage('⚠️ لا يوجد إرسال جاري حالياً.', threadID); } catch (e) {}
      }
      return;
    }

    if (body === 'قصف') {
      if (activeLoops.get(threadID)) {
        try { await api.sendMessage('⚠️ الجرائد تعمل بالفعل!', threadID); } catch (e) {}
        return;
      }
      try { await api.sendMessage(SPAM_START, threadID); } catch (e) {}
      activeLoops.set(threadID, true);
      spamLoop(api, threadID);
    }
  },

  isActive(threadID) {
    return activeLoops.get(String(threadID)) || false;
  },

  resumeAll(api) {
    for (const [threadID, active] of activeLoops.entries()) {
      if (active) {
        console.log(`[قصف] استئناف الحلقة في ${threadID} بعد الاتصال`);
        spamLoop(api, threadID);
      }
    }
  }
};
