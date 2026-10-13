"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE_WORKSPACE_COOKIE, generateSlug } from "@/lib/workspace";
import {
  canManageWorkspace,
  canTransferOwnership,
  canManageMembers,
  canModifyMember,
  canRemoveMember,
  canManageDesignations,
  canInviteMembers,
} from "@/lib/permissions";
import {
  generateInvitationToken,
  getValidInvitation,
} from "@/lib/invitations";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  createInvitationSchema,
  acceptInvitationSchema,
  createDesignationSchema,
} from "@/lib/validations/workspace";
import { WorkspaceRole } from "@prisma/client";

export interface ActionResult<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
}

const DEFAULT_DESIGNATIONS = [
  "Product Manager",
  "UI/UX Designer",
  "Frontend Developer",
  "Backend Developer",
  "QA Engineer",
  "Operations Specialist",
];

export async function switchWorkspaceAction(
  workspaceId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }

  // Verify that the user is an active member of this workspace
  const member = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: session.user.id,
      status: "ACTIVE",
    },
  });

  if (!member) {
    return { error: "You are not an active member of this workspace." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
  });

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Creates a new secondary workspace. Creator receives OWNER role.
 */
export async function createWorkspaceAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ workspaceId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }

  const userId = session.user.id;

  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid workspace data." };
  }

  const { name, description } = parsed.data;

  try {
    let newWorkspaceId = "";

    await db.$transaction(async (tx) => {
      const slug = generateSlug(name);
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          description: description || null,
        },
      });
      newWorkspaceId = workspace.id;

      // Seed default designations
      await tx.designation.createMany({
        data: DEFAULT_DESIGNATIONS.map((title) => ({
          workspaceId: workspace.id,
          name: title,
        })),
      });

      // Add creator as OWNER
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: "OWNER",
          status: "ACTIVE",
        },
      });
    });

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_WORKSPACE_COOKIE, newWorkspaceId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    revalidatePath("/", "layout");
    return { success: true, data: { workspaceId: newWorkspaceId } };
  } catch (error) {
    console.error("Workspace creation failed:", error);
    return { error: "Failed to create workspace. Please try again." };
  }
}

/**
 * Updates workspace metadata (Name, Description). Requires OWNER or ADMIN.
 */
export async function updateWorkspaceAction(
  workspaceId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Authentication required." };

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember || !canManageWorkspace(actorMember.role)) {
    return { error: "Permission denied: Admin or Owner role required." };
  }

  const parsed = updateWorkspaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid data." };
  }

  try {
    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        description: parsed.data.description || null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Update workspace error:", error);
    return { error: "Failed to update workspace." };
  }
}

/**
 * Updates a member's role or designation.
 */
export async function updateMemberRoleAction(
  workspaceId: string,
  targetMemberId: string,
  newRole: WorkspaceRole,
  designationId?: string | null
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Authentication required." };

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember || !canManageMembers(actorMember.role)) {
    return { error: "Permission denied: Administrative role required." };
  }

  const targetMember = await db.workspaceMember.findUnique({
    where: { id: targetMemberId },
  });

  if (!targetMember || targetMember.workspaceId !== workspaceId) {
    return { error: "Member not found in this workspace." };
  }

  // Validate modification permissions
  if (!canModifyMember(actorMember.role, targetMember.role, newRole)) {
    return {
      error:
        "Permission denied: You do not have sufficient privileges to modify this member's role.",
    };
  }

  try {
    await db.workspaceMember.update({
      where: { id: targetMemberId },
      data: {
        role: newRole,
        ...(designationId !== undefined ? { designationId } : {}),
      },
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Update member role error:", error);
    return { error: "Failed to update member role." };
  }
}

/**
 * Suspends / removes a member from the workspace.
 * Preserves historical task and audit logs by transitioning status to SUSPENDED.
 */
export async function removeMemberAction(
  workspaceId: string,
  targetMemberId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Authentication required." };

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember || !canManageMembers(actorMember.role)) {
    return { error: "Permission denied." };
  }

  const targetMember = await db.workspaceMember.findUnique({
    where: { id: targetMemberId },
  });

  if (!targetMember || targetMember.workspaceId !== workspaceId) {
    return { error: "Member not found." };
  }

  if (!canRemoveMember(actorMember.role, targetMember.role)) {
    return {
      error:
        "Permission denied: The workspace Owner cannot be removed, and Admins can only be removed by the Owner.",
    };
  }

  try {
    await db.workspaceMember.update({
      where: { id: targetMemberId },
      data: { status: "SUSPENDED" },
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Remove member error:", error);
    return { error: "Failed to remove member." };
  }
}

/**
 * Transfers primary workspace ownership atomically.
 * Current Owner -> ADMIN
 * Target Admin -> OWNER
 */
export async function transferOwnershipAction(
  workspaceId: string,
  targetMemberId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Authentication required." };

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember || !canTransferOwnership(actorMember.role)) {
    return { error: "Permission denied: Only the current Owner can transfer ownership." };
  }

  const targetMember = await db.workspaceMember.findUnique({
    where: { id: targetMemberId },
  });

  if (!targetMember || targetMember.workspaceId !== workspaceId || targetMember.status !== "ACTIVE") {
    return { error: "Target member must be an active member of this workspace." };
  }

  if (targetMember.id === actorMember.id) {
    return { error: "You already own this workspace." };
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Demote current Owner to ADMIN
      await tx.workspaceMember.update({
        where: { id: actorMember.id },
        data: { role: "ADMIN" },
      });

      // 2. Promote target member to OWNER
      await tx.workspaceMember.update({
        where: { id: targetMember.id },
        data: { role: "OWNER" },
      });
    });

    revalidatePath("/team");
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Ownership transfer error:", error);
    return { error: "Failed to transfer workspace ownership." };
  }
}

/**
 * Generates a single-use, 7-day invitation link.
 * Stores deterministic SHA-256 token hash in database; returns raw token URL to caller.
 */
export async function createInvitationAction(
  workspaceId: string,
  prevState: ActionResult<{ inviteUrl: string }> | null,
  formData: FormData
): Promise<ActionResult<{ inviteUrl: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Authentication required." };

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember || !canInviteMembers(actorMember.role)) {
    return { error: "Permission denied: Administrative role required to invite members." };
  }

  const roleRaw = formData.get("role") as string;
  const designationRaw = formData.get("designationId") as string;
  const emailRaw = formData.get("email") as string;

  const parsed = createInvitationSchema.safeParse({
    email: emailRaw,
    role: roleRaw,
    designationId: designationRaw ? designationRaw : null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid invitation data." };
  }

  const { email, role, designationId } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Check if user is already an active member of this workspace
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        where: { workspaceId, status: "ACTIVE" },
      },
    },
  });

  if (existingUser && existingUser.memberships.length > 0) {
    return { error: "A user with this email is already an active member of this workspace." };
  }

  try {
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

    revalidatePath("/team");
    return { success: true, data: { inviteUrl } };
  } catch (error) {
    console.error("Create invitation error:", error);
    return { error: "Failed to generate invitation link." };
  }
}

/**
 * Accepts an invitation token.
 * Supports both:
 * 1. Authenticated user accepting membership.
 * 2. Controlled registration for invited new user.
 */
export async function acceptInvitationAction(
  rawToken: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const invitation = await getValidInvitation(rawToken);
  if (!invitation) {
    return { error: "This invitation link is invalid, expired, or has already been used." };
  }

  const session = await auth();

  // SCENARIO 1: Existing Authenticated User
  if (session?.user?.id) {
    const userId = session.user.id;
    // Check if already a member
    const existingMember = await db.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId,
      },
    });

    if (existingMember && existingMember.status === "ACTIVE") {
      return { error: "You are already a member of this workspace." };
    }

    try {
      await db.$transaction(async (tx) => {
        // Upsert membership
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

        // Mark invitation ACCEPTED
        await tx.workspaceInvitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        });
      });

      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_WORKSPACE_COOKIE, invitation.workspaceId, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
      });

      return { success: true };
    } catch (error) {
      console.error("Accept invitation error:", error);
      return { error: "Failed to accept invitation. Please try again." };
    }
  }

  // SCENARIO 2: New User Controlled Registration
  const parsed = acceptInvitationSchema.safeParse({
    token: rawToken,
    name: formData.get("name"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid registration data." };
  }

  const { name, password } = parsed.data;
  if (!name || !password) {
    return { error: "Name and password are required to register your account." };
  }

  try {
    await db.$transaction(async (tx) => {
      // Check if user already exists with this email
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

      // Create membership
      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
          designationId: invitation.designationId,
          status: "ACTIVE",
        },
      });

      // Mark invitation ACCEPTED
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_WORKSPACE_COOKIE, invitation.workspaceId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    // Auto-login
    await signIn("credentials", {
      email: invitation.email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    console.error("Register via invite error:", error);
    return { error: "Failed to complete account registration. Please try again." };
  }
}

/**
 * Creates a custom designation in the workspace.
 */
export async function createDesignationAction(
  workspaceId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Authentication required." };

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember || !canManageDesignations(actorMember.role)) {
    return { error: "Permission denied: Admin or Owner role required." };
  }

  const parsed = createDesignationSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid designation name." };
  }

  try {
    await db.designation.create({
      data: {
        workspaceId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Create designation error:", error);
    return { error: "A designation with this title already exists in this workspace." };
  }
}

/**
 * Deletes a custom designation.
 */
export async function deleteDesignationAction(
  workspaceId: string,
  designationId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Authentication required." };

  const actorMember = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!actorMember || !canManageDesignations(actorMember.role)) {
    return { error: "Permission denied." };
  }

  try {
    await db.designation.delete({
      where: { id: designationId, workspaceId },
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Delete designation error:", error);
    return { error: "Failed to delete designation." };
  }
}
