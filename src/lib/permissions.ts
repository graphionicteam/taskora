import { WorkspaceRole } from "@prisma/client";

export const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  GUEST: 1,
};

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canDeleteWorkspace(role: WorkspaceRole): boolean {
  return role === "OWNER";
}

export function canTransferOwnership(role: WorkspaceRole): boolean {
  return role === "OWNER";
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canInviteMembers(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageDesignations(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/**
 * Checks whether an actor can modify another member's role or designation.
 */
export function canModifyMember(
  actorRole: WorkspaceRole,
  targetCurrentRole: WorkspaceRole,
  targetNewRole?: WorkspaceRole
): boolean {
  // Target is Owner: No one can demote/modify the Owner (ownership transfer required)
  if (targetCurrentRole === "OWNER") {
    return false;
  }

  // Actor must have administrative privileges
  if (actorRole !== "OWNER" && actorRole !== "ADMIN") {
    return false;
  }

  // Admin cannot modify another Admin; only Owner can modify an Admin
  if (actorRole === "ADMIN" && targetCurrentRole === "ADMIN") {
    return false;
  }

  // Admin cannot promote anyone to Admin or Owner
  if (targetNewRole) {
    if (targetNewRole === "OWNER") {
      return false; // Owner can only be transferred via atomic transfer
    }
    if (actorRole === "ADMIN" && targetNewRole === "ADMIN") {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether an actor can suspend or remove a member.
 */
export function canRemoveMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole
): boolean {
  // Owner cannot be removed under any circumstance
  if (targetRole === "OWNER") {
    return false;
  }

  // Actor must be Admin or Owner
  if (actorRole !== "OWNER" && actorRole !== "ADMIN") {
    return false;
  }

  // Admin cannot remove another Admin; only Owner can
  if (actorRole === "ADMIN" && targetRole === "ADMIN") {
    return false;
  }

  return true;
}

/**
 * Task permission checks according to Stage 08 specifications.
 */
export function canCreateTask(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function canCloseTask(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function canArchiveTask(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canEditTask(
  role: WorkspaceRole,
  isCreator: boolean,
  isAssignee: boolean
): boolean {
  if (role === "OWNER" || role === "ADMIN" || role === "MEMBER") {
    return true;
  }
  // Guests can only edit tasks assigned to them
  return isAssignee;
}

