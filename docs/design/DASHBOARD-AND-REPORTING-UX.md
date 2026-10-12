# Taskora — Dashboard and Reporting UX (Stage 10 LOCKED)
**Direction:** Action-First personal dashboard; Simple Visual Reporting; CSV/PDF exports deferred.

## Overview priority
Welcome + Quick Create; four KPI cards; Needs Your Attention; Upcoming Tasks; Relevant Active Projects; Recent Activity; optional HIMI Insights. Four cards: My Active Tasks, Due Today, Overdue, Completed This Week. Each links to corresponding filtered My Tasks list. Keep attention work first; no fake metrics for empty workspaces.

## KPI meanings
- My Active: current assignee = user and status not Done/Closed.
- Due Today: active assigned tasks with deadline today in workspace timezone.
- Overdue: assigned active tasks past effective deadline.
- Completed This Week: assigned tasks currently Done/Closed with completion in current Monday-start week; reopened tasks excluded until re-completed. Historical completion events are separately labeled.

## Reports
Tasks: status and priority distribution, overdue, current completed and historical completion trend. Projects: project status/progress, overdue, workload, closures. Team: active assignments, completed, overdue, unassigned; designation separate from role; no employee performance ranking. Progress = completed leaf tasks / all included leaf tasks; empty = No tasks yet. Completed project status never inferred from progress automatically.

Filters and behavior: 7/30/90 days or custom where needed, project/standalone, member and relevant status/priority; range applies precisely to historical events, not as misleading filter for current-state KPIs. Drill down to accessible source records. Consistent timezone and access controls. Loading/empty/error/permission/stale states for individual widgets. HIMI insights optional and nonblocking; no separate analytics warehouse necessary. Flutter receives server-defined metrics. No V1 exports.
