# Taskora

Taskora is a minimal, premium, collaborative task, project, and team management platform designed with a 70% focused utility / 30% premium polish balance.

---

## 🏛️ Architecture Overview

- **Web Dashboard**: Current stable Next.js with React, TypeScript, and App Router.
- **Styling**: Tailwind CSS configured with approved Taskora design tokens (WCAG 2.2 AA).
- **Database**: Cloud Neon PostgreSQL with connection pooling and serverless autoscaling.
- **ORM & Migrations**: Prisma ORM with dual-connection configuration (`DATABASE_URL` pooled, `DIRECT_URL` direct).
- **API First**: Headless, versioned REST API (`/api/v1`) serving both the Next.js web application and the future Flutter mobile companion.
- **Cloud Deployment**: Vercel-compatible serverless cloud deployment over HTTPS.

---

## 📚 Approved Design Documentation (Locked)

All 12 UI/UX guideline stages are approved and locked (v1.0):

| Document | Scope |
|---|---|
| [`MASTER-UI-UX-GUIDELINES.md`](docs/design/MASTER-UI-UX-GUIDELINES.md) | Master product principles, locked stage index, and non-negotiable rules |
| [`DESIGN-TOKENS.md`](docs/design/DESIGN-TOKENS.md) | Plus Jakarta Sans, Refined Indigo (`#4F46E5`), HIMI Violet, 4px grid |
| [`COMPONENT-SYSTEM.md`](docs/design/COMPONENT-SYSTEM.md) | Balanced & Comfortable component system (40px controls, 52px task rows) |
| [`NAVIGATION-AND-ROUTES.md`](docs/design/NAVIGATION-AND-ROUTES.md) | Desktop grouped sidebar (248px/72px), header (64px), mobile 5 tabs |
| [`TASK-AND-PROJECT-UX.md`](docs/design/TASK-AND-PROJECT-UX.md) | Title-first creation, unlimited subtasks, strict hierarchical closure, leaf progress |
| [`CHAT-AND-COLLABORATION-UX.md`](docs/design/CHAT-AND-COLLABORATION-UX.md) | Private DMs, group chat, task comments, 15-minute edit window, cloud attachments |
| [`DASHBOARD-AND-REPORTING-UX.md`](docs/design/DASHBOARD-AND-REPORTING-UX.md) | Action-first overview, 4 core KPIs, task/project/team reports |
| [`RESPONSIVE-AND-FLUTTER-UX.md`](docs/design/RESPONSIVE-AND-FLUTTER-UX.md) | Responsive reflows, touch targets, online-first, web-to-Flutter API parity |
| [`INTERACTIONS-AND-ACCESSIBILITY.md`](docs/design/INTERACTIONS-AND-ACCESSIBILITY.md) | Subtle & Purposeful motion, feedback states, WCAG 2.2 AA target |
| [`DESIGN-DECISION-REGISTER.md`](docs/design/DESIGN-DECISION-REGISTER.md) | Formal record of all locked design decisions |
| [`DEVELOPMENT-ROADMAP-REVIEW.md`](docs/design/DEVELOPMENT-ROADMAP-REVIEW.md) | Phased development gates and technical direction |
| [`POST-LAUNCH-BACKLOG.md`](docs/design/POST-LAUNCH-BACKLOG.md) | Deferred post-v1 capabilities and future backlog items |

---

## 🗺️ Master Development Roadmap

1. **Design System & Guidelines** — *Completed & Locked (12/12 Stages)*
2. **Repository & Cloud Architecture** — *Current Stage*
3. **Next.js Web Development** — *14 Sequenced Phases*
4. **HIMI AI Integration** — *Dedicated Phase (AI tools, scoped permissions, explicit confirmations)*
5. **ClientForge MCP Connectivity** — *Dedicated Phase (External connector, zero changes to ClientForge)*
6. **Flutter Mobile Companion** — *5 Sequenced Phases (Consuming shared `/api/v1` APIs)*

---

## 🔒 Governance & Implementation Policy

No application source code or infrastructure modifications are authorized without explicit phase-by-phase gating. All business logic (leaf progress, task tree hierarchy, closure invariants) is enforced authoritatively on the backend.
