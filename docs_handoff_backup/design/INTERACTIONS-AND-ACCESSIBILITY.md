# Taskora — Interactions, Motion, Accessibility & Governance (Stage 12 LOCKED)
## Motion and easing
Subtle & Purposeful. Durations: instant 0ms, fast 120ms, standard 180ms, emphasis 220ms, sheet 240ms, feedback 180ms. Easing standard `cubic-bezier(0.2,0,0,1)`; enter `cubic-bezier(0,0,0.2,1)`; exit `cubic-bezier(0.4,0,1,1)`. No excessive animation, bounce, parallax or animated gradients. Honor reduced-motion; animation never blocks action.

## Feedback
Balanced: inline for frequent changes, brief toasts for meaningful outcomes, confirmation only for consequential actions. Success toast ~4s; information ~5s; recoverable error actionable until resolved. Confirm task closure, hierarchy-impacting reopen, subtree archive, permanent delete, removing group member, HIMI state mutation. No confirmation for ordinary edits, assignment or eligible leaf completion.

## States
Pending vs confirmed vs failed; skeletons for loading sections; small action progress; retryable errors; explicit empty/restricted/offline states; preserve unsent drafts. Avoid claiming success before server verifies. Screen-reader live updates should be targeted, not noisy.

## Accessibility
WCAG 2.2 AA target: normal text >=4.5:1, applicable large text / essential nontext >=3:1; keyboard and screen reader operability, visible focus, meaningful labels, pointer target requirements, reflow/zoom, text scaling, chart alternatives, reduced motion, dialog focus management. Validate token pairings during eventual development.

## Governance
Stages 01–12 locked. Changes need explicit approval and decision record. Don't modify approved typography, palette, navigation, task rules, privacy, mobile architecture or metrics unilaterally. One implementation phase = one defined outcome; discuss -> design -> implement -> review/lock. All noncritical new ideas to future backlog. Backend is authority, Next.js first, Flutter later. Handoff is not permission to code.
