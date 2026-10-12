# Taskora — Technical Decision Register (TDR)
**Status:** APPROVED FOR IMPLEMENTATION PLANNING — 2026-10-12

This document records the approved technical architecture decisions governing the engineering of Taskora. It complements the locked UI/UX guidelines in `docs/design/`.

---

## 1. Web Authentication & Identity Architecture
* **Web Foundation**: **Auth.js** is preferred for the Next.js web application authentication foundation.
* **Mobile / Bearer Token Boundary**: Flutter bearer-token issuance, token refresh, expiration cycles, and revocation mechanics are deferred to a separate, dedicated architectural review prior to the Flutter mobile companion track.
* **No Premature Endpoints**: Do not create custom token exchange or bearer issuance endpoints during early phases.
* **Unified Identity Contract**: Maintain a single, coherent user identity, workspace membership, and permission model across both the web application and future mobile clients.

---

## 2. Database & Data Access Architecture
* **Database Platform**: **Neon PostgreSQL** (Cloud Serverless).
* **ORM**: **Prisma ORM**.
* **Runtime Connection Strategy**: Neon's pooled PostgreSQL connection string (`DATABASE_URL` via PgBouncer) is preferred for runtime queries across serverless API routes and Server Components.
* **Prisma Driver Adapter**: Use the appropriate Prisma driver adapter (e.g. `@prisma/adapter-pg` or supported Neon driver adapter) matching the selected stable Prisma version.
* **Migration Connection Strategy**: Maintain a direct, unpooled connection string (`DIRECT_URL`) for schema migrations using the standard supported Prisma configuration (`directUrl` in `schema.prisma`).
* **Infrastructure Simplicity**: Avoid unnecessary WebSocket-based database infrastructure; rely on standard pooled TCP connections for simplicity and stability.

---

## 3. Hosting & Deployment Architecture
* **Target Platform**: Vercel-compatible serverless cloud deployment over HTTPS.
* **Commercial Plan Governance**: Vercel Hobby is strictly non-commercial. It is explicitly recorded that commercial operations, team monetization, or paid internal company deployments do not qualify for Hobby terms.
* **Deployment Tier Timing**: The final hosting tier (e.g. Vercel Pro or alternative VPS/Docker environment) will be determined prior to production deployment. Initial prototyping and testing adhere to plan terms.

---

## 4. Storage & Real-Time Messaging (Provisional)
* **Object Storage**: **Cloudflare R2** (S3-compatible, zero egress costs, presigned direct uploads) remains the provisional recommendation for file attachments, to be finalized in Phase 09 (Collaboration & Attachments).
* **Real-Time Broker**: **Pusher Channels / Ably** remains the provisional recommendation for stateless serverless messaging, to be finalized in Phase 09.

---

## 5. UI/UX & Design System Compliance
* All **12 approved UI/UX guideline stages** in `docs/design/` remain locked and authoritative.
* Strict adherence to **Plus Jakarta Sans**, Refined Indigo (`#4F46E5`), 4px spacing grid, 40px controls, 52px task rows, 12px card radii, and WCAG 2.2 AA targets.

---

## 6. Master Development Roadmap Governance
The roadmap structure and sequence are strictly preserved:
1. **Repository & Cloud Baseline** *(Complete)*
2. **Next.js Web Development** *(14 Sequenced Phases: Phase 01 Foundation through Phase 14)*
3. **Dedicated HIMI AI Integration Track** *(Separate phase before Flutter)*
4. **Dedicated ClientForge MCP Connectivity Track** *(Separate phase before Flutter; zero modifications to ClientForge)*
5. **Flutter Mobile Companion** *(5 Sequenced Phases)*
