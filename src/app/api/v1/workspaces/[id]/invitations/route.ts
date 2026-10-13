import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canInviteMembers } from "@/lib/permissions";
import { generateInvitationToken } from "@/lib/invitations";
import { createInvitationSchema } from "@/lib/validations/workspace";

interface RouteParams {
  params: Promise<{ id: string }>;
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

  if (!actorMember || !canInviteMembers(actorMember.role)) {
    return NextResponse.json(
      { error: "Forbidden: Admin or Owner role required to invite members" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { email, role, designationId } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user is already a member
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { workspaceId, status: "ACTIVE" },
        },
      },
    });

    if (existingUser && existingUser.memberships.length > 0) {
      return NextResponse.json(
        { error: "User is already an active member of this workspace" },
        { status: 409 }
      );
    }

    const { rawToken, tokenHash } = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.workspaceInvitation.create({
      data: {
        workspaceId,
        invitedById: session.user.id,
        email: normalizedEmail,
        role,
        designationId: designationId || null,
        tokenHash,
        expiresAt,
        status: "PENDING",
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${rawToken}`;

    return NextResponse.json(
      {
        data: {
          inviteUrl,
          expiresAt,
          email: normalizedEmail,
          role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API POST invitation error:", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}
