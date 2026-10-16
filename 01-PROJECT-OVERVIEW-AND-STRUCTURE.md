# Taskora — Project Overview & Structure

## What Taskora is
Taskora is a premium, minimal, collaborative team task/project management SaaS. A Next.js web dashboard is the first product; a Flutter companion follows later. Users operate in workspaces, collaborate on tasks, projects and chat, and eventually use HIMI AI and optional ClientForge connectivity.

## Locked functional intent
- Workspaces and member roles (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`) separated from job designations.
- Standalone tasks and optional project-linked tasks; unlimited nested subtasks.
- My Tasks / All Tasks, list-first interactions, title-first create, one primary assignee.
- Task completion respects descendant completion; leaf-only progress.
- Team collaboration: direct messages, groups and task comments in later phases.
- Action-first overview, reports, AI and mobile delivered only in their scheduled workstreams.

## Local repository tree (indicative, not a fresh filesystem scan)
```text
taskora/
├── docs/
│   ├── design/                   # 12-stage LOCKED design documents
│   └── TECHNICAL-DECISION-REGISTER.md  # reported in repo
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── tasks/            # Phase 04 under implementation
│   │   │   ├── team/
│   │   │   └── ...
│   │   ├── api/v1/              # versioned APIs
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/              # Header, Sidebar, WorkspaceSwitcher, etc.
│   │   ├── ui/                  # reusable components
│   │   └── tasks/               # Phase 04 under implementation
│   ├── lib/                     # auth, workspace, permissions, validations
│   └── server/actions/          # server mutations
├── src/proxy.ts                  # Next.js route protection
├── .env.local                    # local only, gitignored; NEVER hand off plaintext
├── package.json
└── ... Next.js/Tailwind/TS configs
```
**Tree is reconstructed from agent logs, not verified against current Git HEAD.** Review the latest `git status` and `tree` for the authoritative layout. Some paths may differ.

## Existing completed foundations
- Responsive app shell, auth/login/profile, workspace switcher, team directory, role enforcement, designations, invite links and Supabase schema.
- Initial-owner onboarding was deliberately removed. First permanent owner provisioned directly; ordinary public registration currently disabled.
- Dashboard, Inbox, HIMI, Reports and Projects may remain placeholders pending their planned phases. Do not treat those placeholders as finished functional modules.

## Responsible development rules
- Preserve 12 locked UI/UX stages.
- No direct modifications to ClientForge CRM from the Taskora repo.
- APIs enforce permissions, not only UI checks.
- Prefer simple, maintainable implementation; no speculative engines, queues, pipelines or extra dependencies.
- No unapproved features; ideas belong in Post-Launch Backlog.
