const qasf = require("./قصف");

const COMMAND_PREFIX = "تغير جريدة";

function createNewspaperCommand(newspaperService) {
  return {
    name: COMMAND_PREFIX,

    async execute(api, event) {
      const body = String(event.body || "").trimStart();
      const separator = body[COMMAND_PREFIX.length];
      if (
        !body.startsWith(COMMAND_PREFIX) ||
        (separator && !/\s/u.test(separator))
      ) {
        return;
      }

      const text = body.slice(COMMAND_PREFIX.length).replace(/^\s+/u, "");
      if (!text.trim()) {
        await api.sendMessage(
          "اكتب: تغير جريدة ثم مسافة ثم نص الجريدة الجديدة.",
          event.threadID,
        );
        return;
      }

      try {
        newspaperService.setNewspaperText(text);
      } catch (error) {
        console.error(
          "[تغير جريدة] تعذّر حفظ الجريدة:",
          error.message || error,
        );
        await api.sendMessage(
          "❌ تعذّر حفظ الجريدة الجديدة. لم يتغير النص الحالي.",
          event.threadID,
        );
        return;
      }

      await api.sendMessage(
        "✅ تم حفظ الجريدة الجديدة، وستُستخدم في قصف وماهوراغا فوراً.",
        event.threadID,
      );
    },
  };
}

module.exports = {
  ...createNewspaperCommand(qasf),
  createNewspaperCommand,
};
