import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canCreateTask } from "@/lib/permissions";
import { createTaskSchema } from "@/lib/validations/task";
import { calculateLeafProgress } from "@/lib/tasks";
import { TaskStatus, TaskPriority, Prisma } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId } = await params;

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

  const url = new URL(request.url);
  const view = url.searchParams.get("view"); // 'my' | 'all'
  const statusParam = url.searchParams.get("status");
  const priorityParam = url.searchParams.get("priority");
  const assigneeId = url.searchParams.get("assigneeId");
  const parentId = url.searchParams.get("parentId");
  const search = url.searchParams.get("search");
  const includeArchived = url.searchParams.get("includeArchived") === "true";

  // Build query where clause
  const where: Prisma.TaskWhereInput = {
    workspaceId,
    isArchived: includeArchived ? undefined : false,
  };

  // 'my' view filters to tasks assigned to this user's workspace member
  if (view === "my") {
    where.assigneeId = member.id;
  } else if (assigneeId) {
    where.assigneeId = assigneeId;
  }

  if (statusParam) {
    const statuses = statusParam.split(",") as TaskStatus[];
    where.status = { in: statuses };
  }

  if (priorityParam) {
    const priorities = priorityParam.split(",") as TaskPriority[];
    where.priority = { in: priorities };
  }

  if (parentId === "root") {
    where.parentId = null;
  } else if (parentId) {
    where.parentId = parentId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const tasks = await db.task.findMany({
    where,
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
      children: {
        where: { isArchived: false },
        select: {
          id: true,
          status: true,
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
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Attach leaf progress calculation to each task
  const enrichedTasks = tasks.map((task) => {
    const leafProgress = calculateLeafProgress(task);
    const { children: _, ...rest } = task;
    void _;
    return {
      ...rest,
      leafProgress,
      children: [],
    };
  });

  return NextResponse.json({ data: enrichedTasks });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId } = await params;

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

  if (!canCreateTask(member.role)) {
    return NextResponse.json(
      { error: "Forbidden: Your role does not have permission to create tasks" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input data" },
      { status: 400 }
    );
  }

  const { title, description, status, priority, dueDate, assigneeId, parentId } =
    parsed.data;

  // 1. Verify parent task belongs to this workspace
  if (parentId) {
    const parentTask = await db.task.findFirst({
      where: {
        id: parentId,
        workspaceId,
        isArchived: false,
      },
    });

    if (!parentTask) {
      return NextResponse.json(
        { error: "Parent task not found in this workspace" },
        { status: 400 }
      );
    }
  }

  // 2. Verify assignee belongs to this workspace and is active
  const targetAssigneeId = assigneeId || null;
  if (targetAssigneeId) {
    const assigneeMember = await db.workspaceMember.findFirst({
      where: {
        id: targetAssigneeId,
        workspaceId,
        status: "ACTIVE",
      },
    });

    if (!assigneeMember) {
      return NextResponse.json(
        { error: "Assignee must be an active member of this workspace" },
        { status: 400 }
      );
    }

    if (assigneeMember.role === "OWNER") {
      return NextResponse.json(
        { error: "Tasks cannot be assigned to the workspace owner (Mayank Parmar). Only employees can be assigned tasks." },
        { status: 400 }
      );
    }
  }

  // Parse dueDate
  const parsedDueDate = dueDate ? new Date(dueDate) : null;

  const task = await db.task.create({
    data: {
      workspaceId,
      title,
      description: description || null,
      status: status || "TODO",
      priority: priority || "MEDIUM",
      dueDate: parsedDueDate,
      assigneeId: targetAssigneeId,
      creatorId: session.user.id,
      parentId: parentId || null,
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
    },
  });

  return NextResponse.json({ data: task }, { status: 201 });
}
