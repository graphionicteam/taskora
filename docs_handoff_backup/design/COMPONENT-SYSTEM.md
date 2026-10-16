# Taskora — Component System (Stage 07 LOCKED)
**Density:** Balanced & Comfortable: compact data, comfortable forms and interactions.

## Foundation
Buttons: Primary, Secondary, Outline, Ghost, Destructive. Sizes 32/40/48px. One prominent action per form context. Inputs, selects, date pickers, textarea, checkbox, avatar, badge, tooltip, popover, menu, dropdown, dialog, sheets, cards, panels. Default 40px controls, 52px target task rows, 12px card radius, 20px padding. Dialog preferred widths 360 / 480 / 640px depending on purpose.

## UI states
Every interactive component defines default, hover, pressed, focus-visible, selected, disabled, loading, success, error and relevant read-only/empty behaviors. Buttons prevent duplicate submission; errors near fields plus summary for larger forms. Focus and status conveyed beyond color.

## Domain components
- Tasks: TaskRow, TaskTreeNode, TaskStatusBadge, TaskPriorityBadge, TaskProperties, TaskProgress, TaskActivityItem, TaskComment, TaskClosureSummary.
- Projects: ProjectCard, ProjectProgress, ProjectMemberList.
- Team: MemberAvatar, MemberIdentity, MemberPicker / MultiPicker, DesignationLabel, AccessRoleBadge, MemberStatus, MemberWorkload. **Designation != permission role.**
- Chat: ConversationRow, MessageBubble, MessageComposer, ReplyPreview, MentionToken, AttachmentTile, ImagePreview, UploadProgress, GroupAvatar.
- HIMI: HimiIdentity, HimiMessage, HimiThinkingState, HimiReferenceCard, HimiActionProposal, HimiConfirmation, HimiActionResult, HimiUnavailableState.
- System: loading skeleton, empty state, recovery/error state, toast, inline status, notification item, permission denial.

## Web-to-Flutter
Map semantic components to native Material-aligned widgets; share tokens and API semantics but not browser implementation. Respect mobile safe areas, keyboard, large text and platform navigation. Reuse accessible primitives rather than creating an unnecessary bespoke framework.
