# Taskora — Development Roadmap & Chunk Protocol

## Locked high-level sequence
1. UI/UX stages **01–12** — approved and LOCKED (2026-10-12).
2. **14 original Next.js web development phases**.
3. Dedicated **HIMI AI integration** after web work.
4. Dedicated **ClientForge MCP connectivity** after web work, independent of ClientForge backend.
5. **5 Flutter companion phases**, consuming shared Taskora APIs.

**Documented web milestones**
| Phase | Milestone | Known status |
|---|---|---|
| 01 | Foundation & Application Shell | Sealed |
| 02 | Authentication & User Accounts | Sealed |
| 03 | Workspaces, Memberships & Permissions | Sealed; owner provisioned |
| 04 | Tasks & Hierarchy Foundation | In progress / needs checkpoint |
| 05 | Projects | Not started |
| 06–14 | Remaining planned Next.js work | Not started; **exact canonical titles not verified** |

**Do not invent or rename phases 06–14.** The 2026-10-12 approved roadmap review explicitly says the original canonical list of 14 phase titles was not recovered. Retrieve the historical roadmap/approved master in the local repo before using precise labels or phase numbers. Known later tracks: collaboration/chat, dashboard/reporting, settings, polish and operational features, subject to the original roadmap.

## Mandatory NEW execution approach
**One major phase is split into small sequential implementation chunks. Never send all of a major feature at once.**
- One prompt = one concrete, bounded outcome, preferably small enough for rapid completion.
- Minimal implementation, narrow verification, user review/checkpoint; then next chunk.
- Do not automatically advance to the next chunk or phase.
- Do not repeat already completed code.
- Only necessary tests/build; browser appearance matters for UI work. If Playwright driver fails, stop retrying and request manual visual confirmation.

## Phase 04 indicative chunk plan (reconcile with actual local changes)
- 04.1 Schema + database migration.
- 04.2 Task create + minimal API.
- 04.3 My Tasks / All Tasks list.
- 04.4 Detail drawer + editing.
- 04.5 Nested subtasks.
- 04.6 Status/closing/reopening hierarchy safeguards.
- 04.7 Assignment/priority/due date.
- 04.8 Leaf progress + archive.
- 04.9 Consolidation, visual check and seal.
These chunks are **not** added web phases and may already be partly implemented by the interrupted monolithic Phase 04 run. Inspect before deciding the next chunk.

## Locked Stage 08 specifics
Status: `To Do`, `In Progress`, `In Review`, `Done`, `Closed`. Default: `To Do`, Medium priority, self-assigned; project and due date optional. Priorities Low/Medium/High/Urgent. A parent can become Done only once all descendants are Done/Closed. Closing is from Done and requires descendant eligibility. Reopening beneath completed ancestors requires confirmation and server-side consistent transitions. Leaf progress = completed leaves / total leaves; empty = 'No tasks yet'. No background hierarchy engine needed.

## Deferred scope
Future exports, advanced automation, full offline sync, AI and ClientForge edits must not spill into current development. See `docs/design/POST-LAUNCH-BACKLOG.md`.
