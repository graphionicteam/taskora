# Taskora — Development Roadmap Review (NO IMPLEMENTATION)
**Status:** Reviewed at high level after all 12 UI/UX stages locked; 2026-10-12. Exact historical phase labels should be reconciled against the previously agreed master roadmap before treating newly named phases as canon.

## Confirmed roadmap structure
1. Finish/lock all UI/UX stages — **DONE, 12/12**.
2. **14 original web development phases**, sequenced and reviewed/locked individually.
3. Dedicated **HIMI Integration** phase and separate **ClientForge MCP Connectivity** phase, planned before Flutter. These tracks are not to be silently folded into core task phase or into the ClientForge CRM backend.
4. **5 original Flutter phases**, using shared authenticated Taskora APIs; dashboard and HIMI/mobile companion planning should not redefine the user's locked Taskora scope.
5. Implementation is NOT authorized by this roadmap review; phase gates remain discussion/design -> explicit approval -> implementation -> review/seal.

## Confirmed technical direction (subject to phase-specific validation)
- Next.js App Router, React, TypeScript, Tailwind CSS + customized accessible shadcn/ui patterns, Lucide icon language.
- PostgreSQL (Neon) with Prisma; Auth.js authentication; Zod validation; versioned REST `/api/v1` and server-enforced permissions.
- Managed real-time service and durable conversation store; cloud object storage with authorized uploads/downloads; avoid reliance on persistent Vercel function state or disk.
- Flutter with Riverpod, Dio and go_router as the future client. No direct DB access or client-embedded secrets.
- Local development with Antigravity (proposed workspace `www/taskora`); deployment architecture compatible with Vercel. Hosting-plan terms must be verified before any commercial production deployment (Vercel Hobby is generally for personal/noncommercial use).

## Phase sequencing review / dependency gates (NOT replacement phase titles)
| Dependency checkpoint | Required before next dependent work |
|---|---|
| Design-source-of-truth handoff | This packet reviewed and accepted |
| Web app foundation | Repository conventions, theme tokens, navigation shell, authentication/API conventions |
| Team / access capabilities | Member profiles, distinct designations vs permissions, assignment eligibility |
| Task / project core | Standalone/projects, unlimited hierarchy, strict completion and activity |
| Collaboration capability | DM/group chat, task comments, attachments, privacy, real-time |
| Dashboard and reporting | Stage 08 formulas consistently enforced |
| HIMI integration | Taskora tools, explicit confirmations, permission enforcement, graceful fallback |
| ClientForge MCP connector | Separate scope, explicit user-authorized connectivity, no unrequested changes to ClientForge backend |
| Flutter implementation | Stable versioned APIs, mobile design and authentication contract |

## Roadmap audit findings
- **Counts confirmed, exact historical phase names not recovered** in the available context. Do NOT replace the original 14 + 5 named phase roadmap with invented canonical phase numbering. Reconcile against the original planning artifact before issuing phase-by-phase agent prompts.
- Define whether the HIMI and MCP phases are additions after the original 14 web phases or inserted at explicit dependency milestones, while preserving their separation and before-Flutter placement. No silent reorder.
- Preserve team designations as independent from access roles.
- Enforce hierarchy integrity, archive-first semantics and leaf-based progress on backend; don't trust Flutter/web-only checks.
- Treat managed real-time, storage and auth provider choices as architecture decisions that need confirmation at their respective phases; avoid unnecessary engines/workers.
- Confirm deployment plan legality/plan suitability before going live commercially; no deployment now.
- Future enhancements (exports, offline sync, calls etc.) stay in backlog.

## Next explicit approval boundary
Discuss and lock the *development phase 01 scope* and exact master-roadmap phase labels after reviewing this packet. Do not generate an executable Antigravity implementation prompt or change source code until the user separately authorizes it.
