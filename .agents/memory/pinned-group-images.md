---
name: Pinned group images
description: Persistence rule for Messenger group image protection.
---

When protecting a Messenger group image, keep a local copy instead of relying only on the attachment CDN URL.

**Why:** Facebook attachment URLs can be signed or temporary, while protection must continue after reconnects and later image-change events.

**How to apply:** Persist the local image and its thread mapping, then reapply it on startup and when a group-image event is received.