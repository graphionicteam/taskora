import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canModifyMember, canRemoveMember } from "@/lib/permissions";
import { updateMemberRoleSchema } from "@/lib/validations/workspace";

interface RouteParams {
  params: Promise<{ id: string; memberId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId, memberId } = await params;

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetMember = await db.workspaceMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updateMemberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { role: newRole, designationId } = parsed.data;

    if (!canModifyMember(actorMember.role, targetMember.role, newRole)) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient privileges to modify this member" },
        { status: 403 }
      );
    }

    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: {
        role: newRole,
        ...(designationId !== undefined ? { designationId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        designation: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("API PATCH member error:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId, memberId } = await params;

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetMember = await db.workspaceMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!canRemoveMember(actorMember.role, targetMember.role)) {
    return NextResponse.json(
      { error: "Forbidden: Cannot remove this member (Owner or higher-ranking member)" },
      { status: 403 }
    );
  }

  try {
    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { status: "SUSPENDED" },
    });

    return NextResponse.json({ data: updated, message: "Member access suspended" });
  } catch (error) {
    console.error("API DELETE member error:", error);
    return NextResponse.json({ error: "Failed to suspend member" }, { status: 500 });
  }
}
