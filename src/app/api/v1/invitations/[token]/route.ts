import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getValidInvitation } from "@/lib/invitations";
import { acceptInvitationSchema } from "@/lib/validations/workspace";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { token: rawToken } = await params;
  const invitation = await getValidInvitation(rawToken);

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation is invalid, expired, or has already been accepted" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      workspaceName: invitation.workspace.name,
      invitedBy: invitation.invitedBy.name || invitation.invitedBy.email,
      email: invitation.email,
      role: invitation.role,
      designation: invitation.designation?.name || null,
      expiresAt: invitation.expiresAt,
    },
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { token: rawToken } = await params;
  const invitation = await getValidInvitation(rawToken);

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation is invalid, expired, or has already been accepted" },
      { status: 404 }
    );
  }

  const session = await auth();

  // Scenario 1: Existing authenticated user
  if (session?.user?.id) {
    const userId = session.user.id;
    const existingMember = await db.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId,
        status: "ACTIVE",
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already an active member of this workspace" },
        { status: 409 }
      );
    }

    try {
      await db.$transaction(async (tx) => {
        await tx.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invitation.workspaceId,
              userId,
            },
          },
          create: {
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role,
            designationId: invitation.designationId,
            status: "ACTIVE",
          },
          update: {
            role: invitation.role,
            designationId: invitation.designationId,
            status: "ACTIVE",
          },
        });

        await tx.workspaceInvitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        });
      });

      return NextResponse.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("API accept invitation error:", error);
      return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
    }
  }

  // Scenario 2: New user registration
  try {
    const body = await request.json();
    const parsed = acceptInvitationSchema.safeParse({ ...body, token: rawToken });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid registration data" },
        { status: 400 }
      );
    }

    const { name, password } = parsed.data;
    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and password are required for account registration" },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email: invitation.email },
      });

      if (!user) {
        const passwordHash = await bcrypt.hash(password, 12);
        user = await tx.user.create({
          data: {
            name,
            email: invitation.email,
            passwordHash,
          },
        });
      }

      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
          designationId: invitation.designationId,
          status: "ACTIVE",
        },
      });

      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });
    });

    return NextResponse.json(
      { message: "Account created and invitation accepted successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("API register via invitation error:", error);
    return NextResponse.json({ error: "Failed to complete registration" }, { status: 500 });
  }
}
