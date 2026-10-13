import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageWorkspace } from "@/lib/permissions";
import { updateWorkspaceSchema } from "@/lib/validations/workspace";

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
    include: {
      workspace: true,
      designation: true,
    },
  });

  if (!member) {
    return NextResponse.json(
      { error: "Forbidden: Not an active member of this workspace" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    data: {
      workspace: member.workspace,
      currentRole: member.role,
      designation: member.designation,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId } = await params;

  const member = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: session.user.id,
      status: "ACTIVE",
    },
  });

  if (!member || !canManageWorkspace(member.role)) {
    return NextResponse.json(
      { error: "Forbidden: Admin or Owner role required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = updateWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await db.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("API PATCH /api/v1/workspaces/[id] error:", error);
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  }
}
