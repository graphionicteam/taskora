# Taskora — Responsive and Flutter UX (Stage 11 LOCKED)
**Direction:** Adaptive Productivity, Comfortable Touch-First, Online-First + Draft Protection.

## Layout
Mobile <768px; tablet 768–1023px; desktop >=1024px; wide desktop >=1440px. Layout reflows on content need, not device identity. Desktop grouped left sidebar, panels, full task list; tablet compact rail/drawer; mobile five-tab bar Home/Tasks/Projects/Inbox/More. Mobile content padding 16px, tablet 20px, desktop 24px. Full-screen mobile task details and chat; bottom navigation can hide within focused full-screen views.

## Flows
Mobile task list stacked, List-first; Quick Create sheet/full-screen, task title first; deep trees navigate focused levels with breadcrumbs and limited indentation; strict completion and closure intact. Full-screen chat with keyboard-safe composer, long press/context menu, simple receipts, upload preview/retry. Projects, Team, Reports/HIMI as focused pages, filters in sheets. 44–48 logical px target touch actions, visible alternatives to gestures.

## Network and accessibility
Online-first; preserve unsent drafts where practical, don't claim locally stored = remotely saved, no automatic offline task sync. Reconnect/refetch and resolve conflicts without data loss. WCAG 2.2 AA target, usable down to ~320px CSS width, large text, reduced motion, keyboard and screen reader, safe areas, both themes. Flutter via shared authenticated REST APIs, no direct DB or bundled secrets; identical task/permissions/report semantics, native controls for presentation.
