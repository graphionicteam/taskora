import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEditTask, canCloseTask, canArchiveTask } from "@/lib/permissions";
import { updateTaskSchema } from "@/lib/validations/task";
import { Prisma } from "@prisma/client";
import {
  calculateLeafProgress,
  validateHierarchyCycle,
  validateCompletionConstraints,
  findCompletedAncestors,
} from "@/lib/tasks";
import { notifyTaskUpdated } from "@/server/notifications/task-notifications";

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId, taskId } = await params;

  // Authoritative membership check
  const member = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: session.user.id,
      status: "ACTIVE",
    },
  });

  if (!member) {
    return NextResponse.json(
      { error: "Forbidden: Not an active member of this workspace" },
      { status: 403 }
    );
  }

  const task = await db.task.findFirst({
    where: {
      id: taskId,
      workspaceId,
    },
    include: {
      assignee: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      closedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      parent: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      children: {
        where: { isArchived: false },
        include: {
          assignee: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          children: {
            where: { isArchived: false },
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const leafProgress = calculateLeafProgress(task);

  return NextResponse.json({
    data: {
      ...task,
      leafProgress,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId, taskId } = await params;

  // Authoritative membership check
  const member = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: session.user.id,
      status: "ACTIVE",
    },
  });

  if (!member) {
    return NextResponse.json(
      { error: "Forbidden: Not an active member of this workspace" },
      { status: 403 }
    );
  }

  const existingTask = await db.task.findFirst({
    where: {
      id: taskId,
      workspaceId,
    },
  });

  if (!existingTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const isCreator = existingTask.creatorId === session.user.id;
  const isAssignee = existingTask.assigneeId === member.id;

  if (!canEditTask(member.role, isCreator, isAssignee)) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to edit this task" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input data" },
      { status: 400 }
    );
  }

  const {
    title,
    description,
    status,
    priority,
    dueDate,
    assigneeId,
    parentId,
    isArchived,
    confirmReopenAncestors,
  } = parsed.data;

  // 1. Completion & Closure Constraint:
  // If moving to DONE or CLOSED, all descendants must be DONE or CLOSED.
  if (status && (status === "DONE" || status === "CLOSED")) {
    if (status === "CLOSED" && !canCloseTask(member.role)) {
      return NextResponse.json(
        { error: "Forbidden: Your role cannot close tasks" },
        { status: 403 }
      );
    }

    const { allowed, activeDescendantsCount } =
      await validateCompletionConstraints(taskId, status);

    if (!allowed) {
      return NextResponse.json(
        {
          error: `Parent task cannot be marked ${status} while ${activeDescendantsCount} subtask(s) remain active. All subtasks must be Done or Closed first.`,
        },
        { status: 400 }
      );
    }
  }

  // 2. Ancestor Reopening Constraint:
  // If task is being moved to an active status (TODO, IN_PROGRESS, IN_REVIEW), check if ancestors are completed.
  const isBecomingActive =
    status && (status === "TODO" || status === "IN_PROGRESS" || status === "IN_REVIEW");

  let completedAncestorsToReopen: string[] = [];
  if (isBecomingActive && (existingTask.status === "DONE" || existingTask.status === "CLOSED")) {
    const completedAncestorIds = await findCompletedAncestors(taskId);

    if (completedAncestorIds.length > 0) {
      if (!confirmReopenAncestors) {
        return NextResponse.json(
          {
            requiresAncestorReopenConfirmation: true,
            completedAncestorIds,
            message:
              "Reopening this subtask requires reopening its completed parent task(s). Please confirm.",
          },
          { status: 409 }
        );
      }
      completedAncestorsToReopen = completedAncestorIds;
    }
  }

  // 3. Hierarchy Cycle Protection
  if (parentId !== undefined && parentId !== existingTask.parentId) {
    if (parentId !== null) {
      // Check parent exists in workspace
      const targetParent = await db.task.findFirst({
        where: { id: parentId, workspaceId, isArchived: false },
      });
      if (!targetParent) {
        return NextResponse.json(
          { error: "Parent task not found in this workspace" },
          { status: 400 }
        );
      }

      const isCycleFree = await validateHierarchyCycle(taskId, parentId);
      if (!isCycleFree) {
        return NextResponse.json(
          {
            error:
              "Hierarchy cycle detected: A task cannot be moved beneath itself or its descendants.",
          },
          { status: 400 }
        );
      }
    }
  }

  // 4. Assignee validation
  if (assigneeId !== undefined && assigneeId !== null) {
    const targetMember = await db.workspaceMember.findFirst({
      where: { id: assigneeId, workspaceId, status: "ACTIVE" },
    });
    if (!targetMember) {
      return NextResponse.json(
        { error: "Assignee must be an active member of this workspace" },
        { status: 400 }
      );
    }
  }

  // 5. Build update data payload
  const updateData: Prisma.TaskUncheckedUpdateInput = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) {
    updateData.status = status;
    if (status === "CLOSED") {
      updateData.closedAt = new Date();
      updateData.closedById = session.user.id;
    } else if (existingTask.status === "CLOSED") {
      updateData.closedAt = null;
      updateData.closedById = null;
    }
  }
  if (priority !== undefined) updateData.priority = priority;
  if (dueDate !== undefined) {
    updateData.dueDate = dueDate ? new Date(dueDate) : null;
  }
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
  if (parentId !== undefined) updateData.parentId = parentId;
  if (isArchived !== undefined) {
    updateData.isArchived = isArchived;
    updateData.archivedAt = isArchived ? new Date() : null;
  }

  // Execute update atomically, including reopening completed ancestors if confirmed
  const updatedTask = await db.$transaction(async (tx) => {
    if (completedAncestorsToReopen.length > 0) {
      await tx.task.updateMany({
        where: { id: { in: completedAncestorsToReopen } },
        data: {
          status: "IN_PROGRESS",
          closedAt: null,
          closedById: null,
        },
      });
    }

    return await tx.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            designation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        closedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  });

  // Dispatch lock-screen & mobile push notifications to assignee, creator & team
  notifyTaskUpdated({
    workspaceId,
    taskId: updatedTask.id,
    previousTask: {
      title: existingTask.title,
      status: existingTask.status,
      priority: existingTask.priority,
      dueDate: existingTask.dueDate,
      assigneeId: existingTask.assigneeId,
      creatorId: existingTask.creatorId,
    },
    updatedTask: {
      title: updatedTask.title,
      status: updatedTask.status,
      priority: updatedTask.priority,
      dueDate: updatedTask.dueDate,
      assigneeId: updatedTask.assigneeId,
      creatorId: updatedTask.creatorId,
    },
    actorUserId: session.user.id,
  }).catch((err) => console.warn("[Push notification dispatch error]:", err));

  return NextResponse.json({ data: updatedTask });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId, taskId } = await params;

  // Authoritative membership check
  const member = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: session.user.id,
      status: "ACTIVE",
    },
  });

  if (!member) {
    return NextResponse.json(
      { error: "Forbidden: Not an active member of this workspace" },
      { status: 403 }
    );
  }

  if (!canArchiveTask(member.role)) {
    return NextResponse.json(
      { error: "Forbidden: Your role does not have permission to archive tasks" },
      { status: 403 }
    );
  }

  const task = await db.task.findFirst({
    where: {
      id: taskId,
      workspaceId,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Stage 08 rule: Archive before permanent deletion; archiving parent impacts subtree.
  // Recursively archive task and all descendants
  const now = new Date();
  const queue = [taskId];
  const allIdsToArchive = [taskId];

  while (queue.length > 0) {
    const currentBatch = queue.splice(0, 50);
    const children = await db.task.findMany({
      where: { parentId: { in: currentBatch } },
      select: { id: true },
    });
    for (const child of children) {
      allIdsToArchive.push(child.id);
      queue.push(child.id);
    }
  }

  await db.task.updateMany({
    where: { id: { in: allIdsToArchive } },
    data: {
      isArchived: true,
      archivedAt: now,
    },
  });

  return NextResponse.json({
    success: true,
    archivedCount: allIdsToArchive.length,
  });
}
