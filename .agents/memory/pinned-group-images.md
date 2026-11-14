---
name: Pinned group images
description: Session-only rule for Messenger group image pinning.
---

Group image pins live only in memory for the current bot session.

**Why:** The user does not want pins restored after the bot restarts or reconnects; pinning must be requested again by replying to a photo with تثبيت.

**How to apply:** Do not load or save pin state to disk, and do not re-arm pins on login. When the bot disconnects or restarts, stop all pin timers and monitors and clear the in-memory pins.
