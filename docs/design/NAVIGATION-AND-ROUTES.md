# Taskora — Navigation and Routes (Stage 06 LOCKED)
## Desktop
Grouped sidebar: **WORKSPACE** Overview, My Tasks, All Tasks, Projects; **COLLABORATION** Inbox, Team, HIMI AI; **INSIGHTS** Reports; Settings footer. Expanded 248px / collapsed 72px, persist preference, icon tooltips/accessibility in collapsed state.
Global header (64px): sidebar toggle, global search (`Ctrl/Cmd+K`), Quick Create, notifications, profile. Search permission-aware across tasks/projects/members/conversations; keyboard navigation and responsive search view.

## Proposed web routes (design contract; confirm router during implementation)
- `/dashboard`; `/tasks/my`; `/tasks`; `/tasks/[taskId]`
- `/projects`; `/projects/[projectId]`; `/projects/[projectId]/tasks`; `/projects/[projectId]/members`; `/projects/[projectId]/activity`
- `/inbox`; `/inbox/[conversationId]`; `/team`; `/team/[userId]`; `/himi`; `/reports`; `/settings`; `/profile`
- Task contextual access can use a URL state e.g. `/tasks/my?task=...`, but full task URL works standalone. Browser Back closes overlays predictably; filter/search/scroll position preserved.

## UX navigation rules
Projects have Overview/Tasks/Members/Activity sections. Nested tasks expand in content, not a sprawling sidebar; deep trees cap indentation and rely on breadcrumbs. All entry paths reach canonical task details. Stable, permission-aware links and clear inaccessible/not-found states.
Mobile/Flutter bottom tabs: **Home, Tasks, Projects, Inbox, More**; Team/HIMI/Reports/Settings through More plus contextual HIMI. Full-screen task and chat views may hide bottom bar. Back and app links must preserve user context.
