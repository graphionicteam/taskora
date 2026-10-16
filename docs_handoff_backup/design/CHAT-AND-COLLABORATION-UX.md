# Taskora — Chat and Collaboration UX (Stage 09 LOCKED)
- Private DM, group chat, task-specific comments/mentions, and separate HIMI chat; no channels or complex threads in V1.
- Desktop Inbox conversation directory ~300–360px and message pane; mobile full-screen conversation, keyboard-aware composer.
- Simple **Sending / Sent / Read / Failed**. Server confirmation before Sent. No individual group read lists; group Read only when simplified rule satisfied. Unread counts/read positions synchronize across devices.
- Own-message editing permitted for **15 minutes**, shows **Edited** label; deletion displays neutral placeholder. Replies reference another message without nested thread complexity. Group creator and designated admins manage group members/name/settings; last-admin safeguard; other members can chat/mute/leave.
- Messages allow text, emojis, images, documents; attachment preview, progress, cancel/retry and permission-aware short-lived download access. Persistent object storage, not local server filesystem.
- Task comments separate from DMs/groups, with valid member mentions and task-linked notifications. Closed task comments read-only until reopened.
- Unified in-app notifications: DM, group, mention, assignment, task changes/deadlines; muting and basic user preferences. Opening notifications deep-links to permitted records; notification read != chat read.
- Managed real-time delivery appropriate to serverless, durable message store, optimistic Pending reconciled with server, deduplication and reconnect recovery, new-message cue when scrolled up. No false delivery/read claims.
- Private DMs visible only to participants; admins do not gain silent DM access. Group access member/permission-based. HIMI cannot automatically inspect private messages; no end-to-end-encryption claims absent actual design. Flutter parity via authenticated APIs.
