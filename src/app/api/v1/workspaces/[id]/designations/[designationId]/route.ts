import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageDesignations } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ id: string; designationId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId, designationId } = await params;

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember || !canManageDesignations(actorMember.role)) {
    return NextResponse.json(
      { error: "Forbidden: Admin or Owner role required" },
      { status: 403 }
    );
  }

  try {
    await db.designation.delete({
      where: { id: designationId, workspaceId },
    });

    return NextResponse.json({ message: "Designation deleted successfully" });
  } catch (error) {
    console.error("API DELETE designation error:", error);
    return NextResponse.json({ error: "Failed to delete designation" }, { status: 500 });
  }
}
