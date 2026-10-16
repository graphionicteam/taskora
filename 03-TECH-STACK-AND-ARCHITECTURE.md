# Taskora — Technology Stack & Architecture

## Implemented / confirmed from agent reports
| Layer | Choice |
|---|---|
| Frontend | Next.js 16.4.0 App Router; React 19.3.0; TypeScript |
| Styles | Tailwind CSS v4; CSS-first custom semantic tokens |
| Fonts / icons | Plus Jakarta Sans; Lucide icon language |
| UI | Custom reusable components compatible with accessible shadcn/ui conventions; not an assertion that shadcn CLI is installed |
| Data | Supabase high-performance PostgreSQL (`postgres`) |
| ORM | Prisma 6.4.1; migrations committed |
| Runtime database | `DATABASE_URL` pooled via `@prisma/adapter-pg` and `pg.Pool` |
| Migrations | `DIRECT_URL` direct Supabase host |
| Authentication | Auth.js / NextAuth v5 beta Credentials; bcryptjs cost 12; encrypted HttpOnly JWT cookies |
| Validation | Zod |
| APIs | Authenticated REST `/api/v1`, backed by shared server authorization |
| Agent/IDE | Antigravity, Windows WAMP local folder |
| Git | GitHub `graphionic/taskora`, branch `main` |

## Data model known through Phase 03
- `users`: identity + bcrypt hash, unique email.
- `rate_limits`: shared atomic PostgreSQL-based rate-limiting counter.
- `workspaces`: independent workspace tenant.
- `workspace_members`: user/workspace join; role and ACTIVE/SUSPENDED state; unique (workspace, user).
- `designations`: workspace-specific professional titles; not permissions.
- `workspace_invitations`: email-bound one-use invitation with SHA-256 hash and expiry.
- `_prisma_migrations`: standard Prisma tracking.
**Phase 04 task model may exist locally but is not verified as applied/migrated.**

## Architecture invariants
- Tenant isolation by `workspaceId` on every relevant query/mutation.
- Active-workspace HttpOnly cookie and API `X-Workspace-ID` are selectors only; verify active membership on server.
- Roles `OWNER`, `ADMIN`, `MEMBER`, `GUEST`; exactly one active Owner; ownership transfer is atomic.
- Professional designation must never confer authorization.
- Public self-registration disabled (`ALLOW_REGISTRATION=false`); authorized invite redemption supports controlled new-account creation.
- First-owner special onboarding page and `INITIAL_SETUP_SECRET` were removed; owner account provisioned directly.
- Never commit `.env.local`. Treat exposed former Neon credentials and the owner password as requiring rotation before production.

## Deployment architecture (later, not performed)
- Vercel-compatible stateless web architecture; confirm paid/commercial hosting policy before commercial rollout.
- Cloudflare R2 for object storage and Pusher/Ably-style managed real-time transport were provisional choices, **not installed/locked implementations**.
- Flutter will use HTTPS APIs (not direct PostgreSQL), with future mobile-specific authentication design.
- HIMI and ClientForge MCP are later isolated integrations, not part of task primitives.

## Local operations
```powershell
cd C:\wamp64\www\taskora
npm run dev
npx tsc --noEmit
npm run lint
npm run build
git status --short
git log -5 --oneline
```
Do not run database migrations blindly: inspect `prisma/migrations`, `prisma migrate status`, and the actual branch/database first. Never print secret values.
