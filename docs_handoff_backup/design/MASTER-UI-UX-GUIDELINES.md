# Taskora — Master UI/UX Guidelines
**Status:** APPROVED & LOCKED — 12/12 stages. **Approval date:** 2026-10-12. **Version:** 1.0.

## Product identity
Taskora is a minimal, premium, collaborative productivity application: 70% focused utility / 30% premium polish. Fast actions, accessible hierarchy, seamless collaboration, calm interaction, and consistent web-to-mobile semantics. Primary platform: Next.js web dashboard. Future companion: Flutter. Avoid redesigning locked choices without explicit approval.

## Locked stage index
| Stage | Scope | Status |
|---|---|---|
| 01 | Product principles and WCAG 2.2 AA target | LOCKED |
| 02 | Color and semantic tokens | LOCKED |
| 03 | Plus Jakarta Sans typography | LOCKED |
| 04 | A1 Interlocking Layers identity and Taskora wordmark | LOCKED |
| 05 | Layout and 4px-based spacing | LOCKED |
| 06 | Grouped navigation and information architecture | LOCKED |
| 07 | Balanced & Comfortable components | LOCKED |
| 08 | Task & Project UX | LOCKED |
| 09 | Chat & Collaboration UX | LOCKED |
| 10 | Dashboard & Reporting UX | LOCKED |
| 11 | Responsive & Mobile UX | LOCKED |
| 12 | Interactions, accessibility and governance | LOCKED |

## Non-negotiable outcomes
- Task may exist standalone or inside a project. It may have unlimited nested subtasks, with independent primary assignee, priority, status, deadlines and attachments.
- Task creation is title-first; any authorized member may assign any eligible member. A project is optional. Task lists are List-first; Board optional.
- Parent task Done/Closed requires every descendant Done/Closed. Completion does not propagate automatically; hierarchy-safe reopening requires disclosure and confirmation.
- Distinguish active status from Done and formal Closed; any authorized member can close an eligible accessible task. Retain meaningful history. Archive first; restrict permanent deletion.
- Progress percentages use completed leaves / all leaves; no-project/empty data must not falsely claim 100%.
- Chat includes private DM, simple groups, task comments and HIMI separately, participant-specific privacy and confirmation for AI mutations.
- Personal Overview is action-first with four KPIs and three simple report categories (Tasks, Projects, Team); exports deferred.
- Adapt layouts across web and Flutter; online-first with draft protection. Shared APIs enforce permission and calculation logic.

## Scope and governance
No features, development or infrastructure additions are authorized merely by this guideline. The handoff is design documentation, not application source code. Exact implementation sequencing requires explicit phase gating. New non-blocking ideas go to POST-LAUNCH-BACKLOG.md.

## Document set
See DESIGN-TOKENS, COMPONENT-SYSTEM, NAVIGATION-AND-ROUTES, TASK-AND-PROJECT-UX, CHAT-AND-COLLABORATION-UX, DASHBOARD-AND-REPORTING-UX, RESPONSIVE-AND-FLUTTER-UX, INTERACTIONS-AND-ACCESSIBILITY, DESIGN-DECISION-REGISTER and POST-LAUNCH-BACKLOG.
