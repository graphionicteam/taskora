# Taskora — Task and Project UX (Stage 08 LOCKED)
## Creation and properties
Title-first Quick Create: only title mandatory entered field; accessible from global Create, project (project preselected) and parent task (parent preselected). Default To Do, Medium, self-assigned, no deadline or project unless contextual. Project optional, parent optional; assignee one eligible primary member. Fields: title, description, project, parent, assignee, creator, priority Low/Medium/High/Urgent, status To Do/In Progress/In Review/Done/Closed, optional date/time deadline, subtasks, comments, files, activity, closure record.

## Task lists and hierarchy
List-first, Board optional. My Tasks and All Tasks are views of same dataset. Filter by assignee, status, priority, deadline, project/standalone, creator, hierarchy; sort deadline, priority, created/updated, title. Preserve filters/scroll across panel. Unlimited nested children; progressive expansion; capped visual indentation; no cycles; subtree moves preserve project consistency.

## Completion and closure
Active statuses: To Do / In Progress / In Review. A parent can become Done only when **all descendants are Done or Closed**. Parent does not auto-complete. Close only after Done and all descendants Done/Closed, with optional completion note. Any authorized workspace member with proper task access may close. Closing logs actor/date. Reopening a descendant beneath completed/closed ancestors proposes hierarchy-consistent reopening with explicit confirmation; server enforces.
Overdue is calculated, never a status. Date-only boundaries use workspace timezone; timed deadlines are absolute instants shown appropriately. Closed tasks remain viewable, ordinary editing requires reopening.

## Project and reports
Project: name required; description, owner, members, status Planned/Active/On Hold/Completed/Archived, optional dates, task list, activity. Project completion requires explicit project status update. Progress calculation: completed leaf tasks / total included leaf tasks; empty = 'No tasks yet'. Task-record counts and leaf progress are separately labeled. Historical completion vs current completed status are distinct. Archive before permanent deletion; archiving parent impacts subtree; destructive admin operation requires confirmation.

## Permissions and AI
Authorized members can create, assign and manage accessible tasks; job designations do not grant permissions. Audit meaningful changes. HIMI can answer, propose subtasks/tasks/assignments, but state mutations require permission and explicit confirmation. Flutter shares server-enforced rules.
