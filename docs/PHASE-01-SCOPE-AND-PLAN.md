# Taskora — Phase 01: Scope & Implementation Plan
**Phase Title:** Foundation & Application Shell  
**Status:** PROPOSED FOR APPROVAL (NO IMPLEMENTATION STARTED)

---

## 1. Phase 01 Boundary Definition

### Permitted IN-SCOPE Items:
1. **Git / GitHub Baseline**:
   * Repository initialized on `main` branch with remote `origin` (`https://github.com/graphionic/taskora.git`).
   * `.gitignore` in place preventing any credential, cache, or build artifact leakage.
2. **Next.js & TypeScript Scaffold**:
   * Current stable Next.js project initialization with TypeScript, ESLint, and App Router structure.
   * Node.js script and tooling definitions in `package.json`.
3. **Design Tokens & Typography Setup**:
   * Tailwind CSS configuration strictly mapping Stage 02 and Stage 05 tokens:
     * Color palette: Core Refined Indigo (`#4F46E5`), neutrals, semantic tokens.
     * Typography: **Plus Jakarta Sans** font configuration (400, 500, 600, 700).
     * Sizing & Spacing: 4px base increments, 40px standard control heights, 52px task rows, 12px radii.
4. **Prisma & Neon Configuration Baseline**:
   * Prisma ORM dependency setup.
   * `schema.prisma` foundational configuration supporting dual connection URLs:
     * `url = env("DATABASE_URL")` (Neon pooled endpoint for runtime).
     * `directUrl = env("DIRECT_URL")` (Neon direct endpoint for migrations).
   * Appropriate Prisma driver adapter configuration.
   * Documentation of environment variables in `.env.example` (no secrets committed).
5. **Responsive Application Shell (Presentation Only)**:
   * Desktop grouped sidebar conforming to Stage 06:
     * 248px expanded / 72px collapsed with persistent toggle state.
     * Sections: WORKSPACE (Overview, My Tasks, All Tasks, Projects), COLLABORATION (Inbox, Team, HIMI AI), INSIGHTS (Reports), Settings footer.
   * Global header (64px) with responsive layout, quick create button placeholder, and search placeholder.
   * Mobile 5-tab navigation bar (Home, Tasks, Projects, Inbox, More) for viewport `<768px`.
   * Placeholder view containers for main route targets (`/dashboard`, `/tasks`, `/projects`, `/inbox`, `/team`, `/reports`, `/settings`).

### Strictly OUT-OF-SCOPE Items (Deferred to Later Phases):
* ❌ **Authentication Implementation**: No Auth.js setup, session providers, login forms, or user authentication flows (deferred to Phase 02).
* ❌ **Database Migrations & Domain Models**: No running `prisma migrate`, no creating database tables or domain models (User, Workspace, Task, Project deferred to Phase 02+).
* ❌ **Task & Project Functionality**: No task creation, hierarchy trees, leaf progress formulas, or closure rules (deferred to Phase 04+).
* ❌ **Chat & Real-Time Messaging**: No DM/group messaging, WebSockets, or file attachments (deferred to Phase 09).
* ❌ **Dashboard Metrics & Reports**: No KPI calculations, charts, or attention lists (deferred to Phase 10).
* ❌ **HIMI AI Integration**: Deferred to dedicated AI track.
* ❌ **ClientForge MCP Connectivity**: Deferred to dedicated MCP track.
* ❌ **Flutter Mobile Work**: Deferred to mobile companion track.

---

## 2. Step-by-Step Implementation Sequence (Once Approved)

When authorized, Phase 01 will be executed in the following strict order:

1. **Step 1: Next.js App Router Initialization**
   * Initialize stable Next.js with TypeScript, ESLint, Tailwind CSS, and `src/` directory layout.
   * Verify mutual dependency compatibility.
2. **Step 2: Design Token & Typography Integration**
   * Load **Plus Jakarta Sans** via `next/font/google`.
   * Configure `tailwind.config.ts` with exact color hexes (`#4F46E5`), spacing scales, and radii tokens.
   * Define CSS custom variables in `src/styles/globals.css`.
3. **Step 3: Prisma Configuration Foundation**
   * Initialize `prisma/schema.prisma` configured for PostgreSQL with `directUrl`.
   * Configure Prisma client singleton in `src/lib/db.ts` utilizing the approved driver adapter pattern.
   * Create `.env.example` documenting `DATABASE_URL` and `DIRECT_URL`.
4. **Step 4: Responsive Navigation Shell Components**
   * Create layout primitives in `src/components/layout/`:
     * `Sidebar.tsx`: Grouped desktop sidebar with collapsible 248px/72px transition.
     * `Header.tsx`: 64px header with search and action placeholders.
     * `MobileTabBar.tsx`: 5-tab bottom navigation for `<768px`.
   * Implement root layout in `src/app/layout.tsx` and dashboard wrapper in `src/app/(dashboard)/layout.tsx`.
5. **Step 5: Placeholder Route Targets**
   * Establish clean placeholder page targets with minimal canonical route metadata.
6. **Step 6: Build Verification & Git Checkpoint**
   * Run local type check (`tsc --noEmit`) and build (`npm run build`) to ensure zero errors.
   * Review git status and commit Phase 01 foundation to GitHub `main`.
