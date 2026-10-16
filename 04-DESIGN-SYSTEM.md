# Taskora — Locked Design System Implementation Guide
**Authority:** `docs/design/*`, approved stages 01–12 (2026-10-12). This summary is for quick handoff, not a replacement.

## Design character
Balanced Minimal + Premium: 70% focused utility, 30% polish. Accessible, refined, calm and fast—not flashy or technical-looking. Purposeful motion only. WCAG 2.2 AA target.

## Color
- Primary Refined Indigo `#4F46E5`.
- HIMI-only Electric Violet `#8B5CF6`; text/accent violet light `#6D28D9`, dark `#A78BFA`.
- Clean white/light surfaces, neutral text, subtle borders, properly matched dark semantics.
- No mixed-mode classes: Tailwind v4 dark variant must align with `.dark` semantic variables. Earlier bug caused white text on white surfaces due to OS dark-media mismatch; fixed in commit `ee7b4c3`.
- No status conveyed by color alone.

## Typography
- Plus Jakarta Sans only; weights 400, 500, 600, 700.
- Desktop body 14px/22px; mobile 16px/24px.
- Clear emphasis and contrast for labels, captions, nav, metadata and headings.

## Measurements
| Item | Locked measurement |
|---|---|
| Spacing grid | 4px base (4–48px standard steps) |
| Sidebar | 248px expanded / 72px collapsed |
| Top bar | 64px |
| Desktop/tablet/mobile outer content padding | 24 / 20 / 16px |
| Dashboard max width | 1600px |
| Task drawer | Preferred 520px; resizable 440–680px |
| Task list row | 52px target |
| Table header | 44px |
| Controls | 40px standard; 32px small / 48px large |
| Card padding | 20px |
| Radii | 6 / 8 / 12 / 16px; pill 9999px |

## Navigation
- Desktop sidebar: Workspace (Overview, My Tasks, All Tasks, Projects), Collaboration (Inbox, Team, HIMI AI), Insights (Reports), Settings footer.
- Header: workspace context, search, quick create, notifications, profile.
- Mobile bottom tabs: Home, Tasks, Projects, Inbox, More; More provides Team/HIMI/Reports/Settings/Profile.
- Responsive: below 768px mobile, 768–1023px tablet, >=1024px desktop.

## Component and interaction principles
- Balanced & Comfortable visual density, accessible focus/ring and error/empty/loading states.
- Task creation title-first, List-first, progressive nested hierarchy; contextual detail drawer rather than crowded full page.
- 0–240ms subtle animations; reduced-motion support; minimum useful touch targets around 44–48 logical px.
- Online first with draft protection, not a full offline sync engine.

## UI QA reminder
TypeScript/ESLint/build are not visual QA. Verify actual browser rendering and accessibility. Screenshots in previous iteration showed severe contrast regression, later corrected. Avoid displaying developer scaffold badges and oversized dashed placeholders in production-like screens.
