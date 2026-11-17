const { getSharedNewspaperStore } = require("../newspaper-store");
const timingStore = require("../timing-store");

const SPAM_START = `🔊 𝆺𝅥⃝𝕯𝐸𝑀ϴ𝑁𝔖 ༐ ⦓🟣⦔ 𝗭𝗘꙰𝗡𝗢𝗫 ⃞⃟┊ 𝐂𝐑⃘𝐔⃪𝐒𝐇͡𝐈͜𝐍𝐆͠ 𝐇̸⃫𝐔𝐌⃝𝐀𝐍𝐈꙰𝐓𝐘̅ 🔊〙 ┊

         ᅠᅠ⏤͟͟ ✠ 𝐙 𝐄 𝐍 𝐎 𝐗 ( ノクサス ) 𓆩𖢘𓆪 ( التشغيل )
         
         ⌯               .  ⦓🟣⦔  .              ⌯
ᅠᅠᅠᅠᅠᅠᅠᅠ 🔊 [ جَـــارِي بَـــدْءُ إِرْسَـــالِ الـجَـــرَائـــدِ ] 🔊
  ᅠᅠᅠᅠᅠᅠᅠᅠᅠ   ─⃝͎̽𝙈𖤌˖𝘼ɵ𝆭͜͡𝙃͎𝆭̽𝙊𝆭⃟ 𝙍𖤌˖𝘼ɵ𝆭͜͡𝙂͎𝆭̽𝘼𝆭⃟✬
 ᅠ   ⁽ ʿ ⧺   ᚜𝐙̶ؗ𝐄̲҇͟𝐍͐𝐎̲҇͟𝐗͐ ⟢ᚘ⟢ 𝐋̶ؗ𝐎̲҇͟𝐑͐𝐃 𝐃𝐄̶𝐌̶ؗ𝐎̸𐇽⃜𝐍𝐒̅ ⃞⃟ ᚛ ⧺`;

const SPAM_STOP = `🔊 𝆺𝅥⃝𝕯𝐸𝑀ϴ𝑁𝔖 ༐ ⦓🟣⦔ 𝗭𝗘꙰𝗡𝗢𝗫 ⃞⃟┊ 𝐂𝐑⃘𝐔⃪𝐒𝐇͡𝐈͜𝐍𝐆͠ 𝐇̸⃫𝐔𝐌⃝𝐀𝐍𝐈꙰𝐓𝐘̅ 🔊〙 ┊

           ᅠᅠ⏤͟͟ ✠ 𝐙 𝐄 𝐍 𝐎 𝐗 ( ノクサス ) 𓆩𖢘𓆪 ( الإيقاف )

ᅠᅠᅠᅠᅠᅠᅠ 🔥 [ تـ٠ــمْ إيـ٠ــقـ٠ــاـ٠ــفْ الـ٠ــجـ٠ــرـ٠ــاـ٠ــئـ٠ــدـ٠ـــ ] 🔥
        ⌯               .  ⦓🪦⦔  .              ⌯
  ᅠᅠᅠᅠᅠᅠᅠᅠᅠ   ─⃝͎̽𝙈𖤌˖𝘼ɵ𝆭͜͡𝙃͎𝆭̽𝙊𝆭⃟ 𝙍𖤌˖𝘼ɵ𝆭͜͡𝙂͎𝆭̽𝘼𝆭⃟✬
 ᅠ  ⁽ ʿ ⧺   ᚜𝐙̶ؗ𝐄̲҇͟𝐍͐𝐎̲҇͟𝐗͐ ⟢ᚘ⟢ 𝐋̶ؗ𝐎̲҇͟𝐑͐𝐃 𝐃𝐄̶𝐌̶ؗ𝐎̸𐇽⃜𝐍𝐒̅ ⃞⃟ ᚛ ⧺`;

const NEWSPAPER_1 = `
⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦⛓️

𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦⛓️

𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 


𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦⛓️

𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️🔥 𝗜̸͝𝗙̷͝ 𝗬̸͝𝗢̷͝𝗨̸͝ 𝗙̷͝𝗜̸͝𝗚̷͝𝗛̸͝𝗧̷͝ 𝗪̸͝𝗜̷͝𝗧̸͝𝗛̷͝ 𝗠̸͝𝗘̷͝ 𝗜̸͝ 𝗪̷͝𝗜̸͝𝗟̷͝𝗟̸͝ 🔥⛓️

☠️ 𝗙̸͝𝗨̷͝𝗖̸͝𝗞̷͝ 𝗬̸͝𝗢̷͝𝗨̸͝𝗥̷͝𝗦̸͝ 𝗠̷͝𝗢̸͝𝗠̷͝ ☠️

𖣘 𝗞̸͝𝗢̷͝𝗞̸͝𝗨̷͝𝗦̸͝𝗛̷͝𝗜̸͝𝗕̷͝𝗢̸͝ ¥ 𝗭̸͝Ę̷͝𝗡̸͝Ø̷͝𝗫̸͝ 𖤓

⛓️ 𖤐 𝗧̸͝𝗛̷͝𝗘̸͝ 𝗗̷͝𝗘̸͝𝗠̷͝𝗢̸͝𝗡̷͝𝗦̸͝ 𖤐 ⛓️

🔥 𝗭̸͝Ę̷͝𝗡̸͝Ø̷͝𝗫̸͝ 𝗜̷͝𝗦̸͝ 𝗛̷͝𝗘̸͝𝗥̷͝𝗘̸͝ 🔥

💀 𝗞̸͝𝗢̷͝𝗞̸͝𝗨̷͝𝗦̸͝𝗛̷͝𝗜̸͝𝗕̷͝𝗢̸͝ 𝗙̷͝𝗨̸͝𝗖̷͝𝗞̸͝𝗜̷͝𝗡̸͝𝗚̷͝ 𝗬̸͝𝗢̷͝𝗨̸͝𝗥̷͝ 𝗠̸͝𝗢̷͝𝗠̸͝ ⚰️

⛓️🪦 𝗕̸͝𝗬̷͝𝗘̸͝ 🪦⛓️`;

const NEWSPAPER_2 = `
⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦⛓️

𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦⛓️

𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 


𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦⛓️

𝗞̸͝𖣘𝗢̷͝𖤓𝗦̸͝🪦 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀

 𝗭̸͝𖣘𝗢̷͝𖤓𝗞̸͝⛓️ 𝗠̷͝𖣘𝗢̸͝𖤓𝗞̷͝💀 

𝗡̸͝𖣘𝗜̷͝𖤓𝗞̸͝ 𝗢̷͝𖣘𝗠̸͝𖤓𝗞̷͝⛓️🪦

⛓️🔥 𝗜̸͝𝗙̷͝ 𝗬̸͝𝗢̷͝𝗨̸͝ 𝗙̷͝𝗜̸͝𝗚̷͝𝗛̸͝𝗧̷͝ 𝗪̸͝𝗜̷͝𝗧̸͝𝗛̷͝ 𝗠̸͝𝗘̷͝ 𝗜̸͝ 𝗪̷͝𝗜̸͝𝗟̷͝𝗟̸͝ 🔥⛓️

☠️ 𝗙̸͝𝗨̷͝𝗖̸͝𝗞̷͝ 𝗬̸͝𝗢̷͝𝗨̸͝𝗥̷͝𝗦̸͝ 𝗠̷͝𝗢̸͝𝗠̷͝ ☠️

𖣘 𝗞̸͝𝗢̷͝𝗞̸͝𝗨̷͝𝗦̸͝𝗛̷͝𝗜̸͝𝗕̷͝𝗢̸͝ ¥ 𝗭̸͝Ę̷͝𝗡̸͝Ø̷͝𝗫̸͝ 𖤓

⛓️ 𖤐 𝗧̸͝𝗛̷͝𝗘̸͝ 𝗗̷͝𝗘̸͝𝗠̷͝𝗢̸͝𝗡̷͝𝗦̸͝ 𖤐 ⛓️

🔥 𝗭̸͝Ę̷͝𝗡̸͝Ø̷͝𝗫̸͝ 𝗜̷͝𝗦̸͝ 𝗛̷͝𝗘̸͝𝗥̷͝𝗘̸͝ 🔥

💀 𝗞̸͝𝗢̷͝𝗞̸͝𝗨̷͝𝗦̸͝𝗛̷͝𝗜̸͝𝗕̷͝𝗢̸͝ 𝗙̷͝𝗨̸͝𝗖̷͝𝗞̸͝𝗜̷͝𝗡̸͝𝗚̷͝ 𝗬̸͝𝗢̷͝𝗨̸͝𝗥̷͝ 𝗠̸͝𝗢̷͝𝗠̸͝ ⚰️

⛓️🪦 𝗕̸͝𝗬̷͝𝗘̸͝ 🪦⛓️`;

// Cycle: 4 messages (1-3 use NEWSPAPER_1, 4 uses NEWSPAPER_2)
// Msg1: 20-22s, Msg2: 27-28s, Msg3: 31-33s, Msg4: 35s
function getDelayForCycle(index) {
  return timingStore.get("qasf");
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
  sendTyping,

  getDelay() {
    return timingStore.get("qasf");
  },

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
