import { db } from "@/lib/db";
import { createNotification, getWorkspaceOwner } from "@/server/actions/inbox.actions";

function formatStatusLabel(status: string): string {
  switch (status) {
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress ⏳";
    case "IN_REVIEW":
      return "In Review 🔍";
    case "DONE":
      return "Completed ✅";
    case "CLOSED":
      return "Closed 🔒";
    default:
      return status;
  }
}

/**
 * Dispatches lock-screen & mobile push notifications when a new task is created.
 */
export async function notifyTaskCreated({
  workspaceId,
  taskId,
  taskTitle,
  assigneeId,
  actorUserId,
}: {
  workspaceId: string;
  taskId: string;
  taskTitle: string;
  assigneeId?: string | null;
  actorUserId: string;
}) {
  try {
    // 1. Fetch actor info
    const actorUser = await db.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, email: true },
    });
    const actorName = actorUser?.name || actorUser?.email || "A team member";

    const actorMember = await db.workspaceMember.findFirst({
      where: { workspaceId, userId: actorUserId, status: "ACTIVE" },
      select: { id: true },
    });
    const actorMemberId = actorMember?.id;

    // 2. If assigned to a member, notify them
    let targetAssigneeName = "a team member";
    if (assigneeId) {
      const assignee = await db.workspaceMember.findUnique({
        where: { id: assigneeId },
        select: { id: true, userId: true, user: { select: { name: true, email: true } } },
      });

      if (assignee) {
        targetAssigneeName = assignee.user?.name || assignee.user?.email || "team member";

        // Notify assignee if not the actor
        if (assignee.userId !== actorUserId) {
          await createNotification({
            workspaceId,
            recipientId: assignee.id,
            actorId: actorMemberId,
            type: "TASK_ASSIGNED",
            title: `📋 New Task Assigned: ${taskTitle}`,
            content: `${actorName} assigned you: "${taskTitle}". Tap to view task.`,
            link: `/tasks?selected=${taskId}`,
          });
        }
      }
    }

    // 3. Keep Workspace Owner informed for audit and oversight
    const owner = await getWorkspaceOwner(workspaceId);
    if (owner && owner.id !== actorMemberId && owner.id !== assigneeId) {
      await createNotification({
        workspaceId,
        recipientId: owner.id,
        actorId: actorMemberId,
        type: "OWNER_ALERT",
        title: `Task Created: ${taskTitle}`,
        content: assigneeId
          ? `${actorName} created "${taskTitle}" and assigned it to ${targetAssigneeName}.`
          : `${actorName} created a new unassigned task: "${taskTitle}".`,
        link: `/tasks?selected=${taskId}`,
      });
    }
  } catch (err) {
    console.warn("[notifyTaskCreated error]:", err);
  }
}

/**
 * Dispatches lock-screen & mobile push notifications when a task is updated
 * (status change, reassignment, priority/due date change, etc.).
 */
export async function notifyTaskUpdated({
  workspaceId,
  taskId,
  previousTask,
  updatedTask,
  actorUserId,
}: {
  workspaceId: string;
  taskId: string;
  previousTask: {
    title: string;
    status: string;
    priority?: string;
    dueDate?: Date | null;
    assigneeId?: string | null;
    creatorId?: string;
  };
  updatedTask: {
    title: string;
    status: string;
    priority?: string;
    dueDate?: Date | null;
    assigneeId?: string | null;
    creatorId?: string;
  };
  actorUserId: string;
}) {
  try {
    // 1. Fetch actor info
    const actorUser = await db.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, email: true },
    });
    const actorName = actorUser?.name || actorUser?.email || "A team member";

    const actorMember = await db.workspaceMember.findFirst({
      where: { workspaceId, userId: actorUserId, status: "ACTIVE" },
      select: { id: true },
    });
    const actorMemberId = actorMember?.id;

    // Set of member IDs already notified in this update to prevent duplicate pushes
    const notifiedMemberIds = new Set<string>();
    if (actorMemberId) notifiedMemberIds.add(actorMemberId);

    // 2. CHECK: Assignee change / reassignment
    const isAssigneeChanged = previousTask.assigneeId !== updatedTask.assigneeId;
    if (isAssigneeChanged) {
      // If newly assigned
      if (updatedTask.assigneeId) {
        const newAssignee = await db.workspaceMember.findUnique({
          where: { id: updatedTask.assigneeId },
          select: { id: true, userId: true, user: { select: { name: true } } },
        });

        if (newAssignee && newAssignee.userId !== actorUserId && !notifiedMemberIds.has(newAssignee.id)) {
          notifiedMemberIds.add(newAssignee.id);
          await createNotification({
            workspaceId,
            recipientId: newAssignee.id,
            actorId: actorMemberId,
            type: "TASK_ASSIGNED",
            title: `📋 Task Assigned to You: ${updatedTask.title}`,
            content: `${actorName} assigned you to "${updatedTask.title}".`,
            link: `/tasks?selected=${taskId}`,
          });
        }
      }

      // If unassigned from previous member
      if (previousTask.assigneeId) {
        const oldAssignee = await db.workspaceMember.findUnique({
          where: { id: previousTask.assigneeId },
          select: { id: true, userId: true },
        });

        if (oldAssignee && oldAssignee.userId !== actorUserId && !notifiedMemberIds.has(oldAssignee.id)) {
          notifiedMemberIds.add(oldAssignee.id);
          await createNotification({
            workspaceId,
            recipientId: oldAssignee.id,
            actorId: actorMemberId,
            type: "TASK_UNASSIGNED",
            title: `Task Reassigned: ${updatedTask.title}`,
            content: `${actorName} reassigned "${updatedTask.title}".`,
            link: `/tasks?selected=${taskId}`,
          });
        }
      }
    }

    // 3. CHECK: Status change (Work done, moved on board, completed)
    const isStatusChanged = previousTask.status !== updatedTask.status;
    if (isStatusChanged) {
      const oldStatusLabel = formatStatusLabel(previousTask.status);
      const newStatusLabel = formatStatusLabel(updatedTask.status);

      // A. Notify Assignee
      if (updatedTask.assigneeId) {
        const currentAssignee = await db.workspaceMember.findUnique({
          where: { id: updatedTask.assigneeId },
          select: { id: true, userId: true },
        });

        if (currentAssignee && currentAssignee.userId !== actorUserId && !notifiedMemberIds.has(currentAssignee.id)) {
          notifiedMemberIds.add(currentAssignee.id);
          await createNotification({
            workspaceId,
            recipientId: currentAssignee.id,
            actorId: actorMemberId,
            type: "TASK_STATUS_UPDATED",
            title: `🔄 Task Update: ${updatedTask.title}`,
            content: `${actorName} changed status from ${oldStatusLabel} ➔ ${newStatusLabel}.`,
            link: `/tasks?selected=${taskId}`,
          });
        }
      }

      // B. Notify Task Creator (e.g. employee who created task wants to know when someone completes it)
      if (updatedTask.creatorId && updatedTask.creatorId !== actorUserId) {
        const creatorMember = await db.workspaceMember.findFirst({
          where: { workspaceId, userId: updatedTask.creatorId, status: "ACTIVE" },
          select: { id: true },
        });

        if (creatorMember && !notifiedMemberIds.has(creatorMember.id)) {
          notifiedMemberIds.add(creatorMember.id);
          await createNotification({
            workspaceId,
            recipientId: creatorMember.id,
            actorId: actorMemberId,
            type: "TASK_STATUS_UPDATED",
            title: `🔄 Task Update: ${updatedTask.title}`,
            content: `${actorName} marked your task as ${newStatusLabel}.`,
            link: `/tasks?selected=${taskId}`,
          });
        }
      }

      // C. Notify Workspace Owner for team oversight
      const owner = await getWorkspaceOwner(workspaceId);
      if (owner && !notifiedMemberIds.has(owner.id)) {
        notifiedMemberIds.add(owner.id);
        await createNotification({
          workspaceId,
          recipientId: owner.id,
          actorId: actorMemberId,
          type: "OWNER_ALERT",
          title: `Task Status: ${updatedTask.title}`,
          content: `${actorName} updated "${updatedTask.title}" to ${newStatusLabel}.`,
          link: `/tasks?selected=${taskId}`,
        });
      }
    }

    // 4. CHECK: Priority or Due Date change (if status didn't change)
    if (!isStatusChanged && !isAssigneeChanged) {
      const isPriorityChanged = previousTask.priority !== updatedTask.priority;
      const isDueDateChanged =
        (previousTask.dueDate?.getTime() || null) !== (updatedTask.dueDate?.getTime() || null);

      if (isPriorityChanged || isDueDateChanged) {
        const detailMessage = isPriorityChanged
          ? `changed priority to ${updatedTask.priority}`
          : "updated the due date";

        // Notify Assignee
        if (updatedTask.assigneeId) {
          const currentAssignee = await db.workspaceMember.findUnique({
            where: { id: updatedTask.assigneeId },
            select: { id: true, userId: true },
          });

          if (currentAssignee && currentAssignee.userId !== actorUserId && !notifiedMemberIds.has(currentAssignee.id)) {
            notifiedMemberIds.add(currentAssignee.id);
            await createNotification({
              workspaceId,
              recipientId: currentAssignee.id,
              actorId: actorMemberId,
              type: "TASK_UPDATED",
              title: `📝 Task Updated: ${updatedTask.title}`,
              content: `${actorName} ${detailMessage} on "${updatedTask.title}".`,
              link: `/tasks?selected=${taskId}`,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[notifyTaskUpdated error]:", err);
  }
}
