import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Workspace, WorkspaceMember, Designation, WorkspaceRole } from "@prisma/client";

export const ACTIVE_WORKSPACE_COOKIE = "taskora_active_workspace";

export interface WorkspaceContext {
  workspace: Workspace;
  member: WorkspaceMember & { designation: Designation | null };
  role: WorkspaceRole;
}

/**
 * Resolves the active workspace context authoritatively for the authenticated user.
 * Workspace IDs in cookies or headers are treated as SELECTORS only.
 * Membership and permissions are verified against the database.
 */
export async function getActiveWorkspaceContext(
  userId: string,
  preferredWorkspaceId?: string
): Promise<WorkspaceContext | null> {
  const cookieStore = await cookies();
  const cookieWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const targetId = preferredWorkspaceId || cookieWorkspaceId;

  // 1. If target ID is specified, verify user's active membership
  if (targetId) {
    const membership = await db.workspaceMember.findFirst({
      where: {
        workspaceId: targetId,
        userId,
        status: "ACTIVE",
      },
      include: {
        workspace: true,
        designation: true,
      },
    });

    if (membership) {
      return {
        workspace: membership.workspace,
        member: membership,
        role: membership.role,
      };
    }
  }

  // 2. Fallback: Find user's first active workspace
  const firstMembership = await db.workspaceMember.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    orderBy: {
      joinedAt: "asc",
    },
    include: {
      workspace: true,
      designation: true,
    },
  });

  if (!firstMembership) {
    return null; // User belongs to 0 active workspaces
  }

  return {
    workspace: firstMembership.workspace,
    member: firstMembership,
    role: firstMembership.role,
  };
}

/**
 * Lists all active workspaces for a user.
 */
export async function getUserWorkspaces(userId: string) {
  const memberships = await db.workspaceMember.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          createdAt: true,
        },
      },
      designation: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });

  return memberships.map((m) => ({
    workspace: m.workspace,
    role: m.role,
    designation: m.designation?.name || null,
    joinedAt: m.joinedAt,
  }));
}

/**
 * Generates a clean URL-safe slug from a workspace name.
 */
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${base || "workspace"}-${randomSuffix}`;
}
