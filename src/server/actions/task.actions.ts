"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveWorkspaceContext } from "@/lib/workspace";
import {
  canCreateTask,
  canEditTask,
  canCloseTask,
  canArchiveTask,
} from "@/lib/permissions";
import { createTaskSchema } from "@/lib/validations/task";
import {
  validateCompletionConstraints,
  findCompletedAncestors,
} from "@/lib/tasks";
import { TaskStatus, TaskPriority } from "@prisma/client";

export interface ActionResult<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
  requiresAncestorReopenConfirmation?: boolean;
  completedAncestorIds?: string[];
}

export async function createTaskAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }

  const wsContext = await getActiveWorkspaceContext(session.user.id);
  if (!wsContext) {
    return { error: "No active workspace selected." };
  }

  if (!canCreateTask(wsContext.role)) {
    return { error: "Your role does not have permission to create tasks." };
  }

  const rawDueDate = formData.get("dueDate") as string | null;
  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: (formData.get("status") as TaskStatus) || "TODO",
    priority: (formData.get("priority") as TaskPriority) || "MEDIUM",
    dueDate: rawDueDate || null,
    assigneeId: formData.get("assigneeId") || null,
    parentId: formData.get("parentId") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  const { title, description, status, priority, dueDate, assigneeId, parentId } =
    parsed.data;

  // Validate parent
  if (parentId) {
    const parentTask = await db.task.findFirst({
      where: { id: parentId, workspaceId: wsContext.workspace.id, isArchived: false },
    });
    if (!parentTask) {
      return { error: "Parent task not found in this workspace." };
    }
  }

  // Validate assignee
  const targetAssigneeId = assigneeId || null;
  if (targetAssigneeId) {
    const assigneeMember = await db.workspaceMember.findFirst({
      where: { id: targetAssigneeId, workspaceId: wsContext.workspace.id, status: "ACTIVE" },
    });
    if (!assigneeMember) {
      return { error: "Assignee must be an active member of this workspace." };
    }
  }

  try {
    const task = await db.task.create({
      data: {
        workspaceId: wsContext.workspace.id,
        title,
        description: description || null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: targetAssigneeId,
        creatorId: session.user.id,
        parentId: parentId || null,
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/tasks/my");
    revalidatePath("/dashboard");

    return { success: true, data: task };
  } catch (err) {
    console.error("Task creation error:", err);
    return { error: "Failed to create task." };
  }
}

export async function updateTaskStatusAction(
  taskId: string,
  targetStatus: TaskStatus,
  confirmReopenAncestors = false
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }
  const currentUserId = session.user.id;

  const wsContext = await getActiveWorkspaceContext(currentUserId);
  if (!wsContext) {
    return { error: "No active workspace selected." };
  }

  const task = await db.task.findFirst({
    where: { id: taskId, workspaceId: wsContext.workspace.id },
  });

  if (!task) {
    return { error: "Task not found." };
  }

  const isCreator = task.creatorId === session.user.id;
  const isAssignee = task.assigneeId === wsContext.member.id;

  if (!canEditTask(wsContext.role, isCreator, isAssignee)) {
    return { error: "Permission denied to update this task." };
  }

  // 1. Completion constraint check
  if (targetStatus === "DONE" || targetStatus === "CLOSED") {
    if (targetStatus === "CLOSED" && !canCloseTask(wsContext.role, isCreator, isAssignee)) {
      return { error: "Permission denied to close tasks." };
    }

    const { allowed, activeDescendantsCount } =
      await validateCompletionConstraints(taskId, targetStatus);

    if (!allowed) {
      return {
        error: `Cannot complete parent task while ${activeDescendantsCount} subtask(s) remain active. All subtasks must be Done or Closed first.`,
      };
    }
  }

  // 2. Ancestor reopening check
  const isBecomingActive =
    targetStatus === "TODO" || targetStatus === "IN_PROGRESS" || targetStatus === "IN_REVIEW";

  let ancestorsToReopen: string[] = [];
  if (isBecomingActive && (task.status === "DONE" || task.status === "CLOSED")) {
    const completedAncestorIds = await findCompletedAncestors(taskId);
    if (completedAncestorIds.length > 0) {
      if (!confirmReopenAncestors) {
        return {
          requiresAncestorReopenConfirmation: true,
          completedAncestorIds,
          error: "Reopening this subtask requires reopening its completed parent task(s).",
        };
      }
      ancestorsToReopen = completedAncestorIds;
    }
  }

  try {
    await db.$transaction(async (tx) => {
      if (ancestorsToReopen.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: ancestorsToReopen } },
          data: {
            status: "IN_PROGRESS",
            closedAt: null,
            closedById: null,
          },
        });
      }

      await tx.task.update({
        where: { id: taskId },
        data: {
          status: targetStatus,
          closedAt: targetStatus === "CLOSED" ? new Date() : null,
          closedById: targetStatus === "CLOSED" ? currentUserId : null,
        },
      });
    });

    revalidatePath("/tasks");
    revalidatePath("/tasks/my");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    console.error("Status update error:", err);
    return { error: "Failed to update task status." };
  }
}

export async function archiveTaskAction(taskId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }

  const wsContext = await getActiveWorkspaceContext(session.user.id);
  if (!wsContext) {
    return { error: "No active workspace selected." };
  }

  if (!canArchiveTask(wsContext.role)) {
    return { error: "Your role does not have permission to archive tasks." };
  }

  const task = await db.task.findFirst({
    where: { id: taskId, workspaceId: wsContext.workspace.id },
  });

  if (!task) {
    return { error: "Task not found." };
  }

  try {
    // Archive subtree
    const now = new Date();
    const queue = [taskId];
    const allIds = [taskId];

    while (queue.length > 0) {
      const batch = queue.splice(0, 50);
      const children = await db.task.findMany({
        where: { parentId: { in: batch } },
        select: { id: true },
      });
      for (const c of children) {
        allIds.push(c.id);
        queue.push(c.id);
      }
    }

    await db.task.updateMany({
      where: { id: { in: allIds } },
      data: { isArchived: true, archivedAt: now },
    });

    revalidatePath("/tasks");
    revalidatePath("/tasks/my");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    console.error("Archive error:", err);
    return { error: "Failed to archive task." };
  }
}
