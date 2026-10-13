import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageDesignations } from "@/lib/permissions";
import { createDesignationSchema } from "@/lib/validations/workspace";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId } = await params;

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const designations = await db.designation.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: designations });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId } = await params;

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
    const body = await request.json();
    const parsed = createDesignationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const created = await db.designation.create({
      data: {
        workspaceId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("API POST designation error:", error);
    return NextResponse.json(
      { error: "A designation with this title already exists in this workspace" },
      { status: 409 }
    );
  }
}
