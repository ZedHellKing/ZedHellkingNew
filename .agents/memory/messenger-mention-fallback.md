---
name: Messenger mention fallback
description: Handling Messenger events where visible @ tags do not match the bot's account ID.
---

For this bot, a tagged identity question reached an enabled group but was not answered because the handler relied on an exact bot-ID match.

**Why:** The live event log confirmed delivery and enabled-group state, but omitted the mention map, so a visible @ tag cannot be assumed to match the bot ID.

**How to apply:** Keep the fallback limited to explicit Zed/Jan identity questions in enabled groups when the message starts with @. Do not broaden it to every tagged message without privacy-safe diagnostics first.
