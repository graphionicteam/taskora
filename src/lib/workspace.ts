import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Workspace, WorkspaceMember, Designation, WorkspaceRole } from "@prisma/client";

export const ACTIVE_WORKSPACE_COOKIE = "taskora_active_workspace";

export interface WorkspaceContext {
  workspace: Workspace;
  member: WorkspaceMember & { designation: Designation | null };
  role: WorkspaceRole;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

function getFromCache<T>(key: string): T | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setInCache<T>(key: string, data: T, ttlMs = 60000): void {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateWorkspaceCache(workspaceId?: string, userId?: string) {
  if (!workspaceId && !userId) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if ((workspaceId && key.includes(workspaceId)) || (userId && key.includes(userId))) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Resolves the active workspace context authoritatively for the authenticated user.
 * Workspace IDs in cookies or headers are treated as SELECTORS only.
 * Membership and permissions are verified against the database.
 * Memoized with memory cache (60s) to eliminate remote latency on page transitions.
 */
export const getActiveWorkspaceContext = cache(async function getActiveWorkspaceContext(
  userId: string,
  preferredWorkspaceId?: string
): Promise<WorkspaceContext | null> {
  const cookieStore = await cookies();
  const cookieWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const targetId = preferredWorkspaceId || cookieWorkspaceId;
  const cacheKey = `wsContext_${userId}_${targetId || "default"}`;

  const cached = getFromCache<WorkspaceContext>(cacheKey);
  if (cached) {
    return cached;
  }

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
      const result: WorkspaceContext = {
        workspace: membership.workspace,
        member: membership,
        role: membership.role,
      };
      setInCache(cacheKey, result, 60000);
      return result;
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

  const result: WorkspaceContext = {
    workspace: firstMembership.workspace,
    member: firstMembership,
    role: firstMembership.role,
  };
  setInCache(cacheKey, result, 60000);
  return result;
});

/**
 * Lists all active workspaces for a user. Memoized per request and with in-memory TTL cache.
 */
export const getUserWorkspaces = cache(async function getUserWorkspaces(userId: string) {
  const cacheKey = `userWs_${userId}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

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

  const result = memberships.map((m) => ({
    workspace: m.workspace,
    role: m.role,
    designation: m.designation?.name || null,
    joinedAt: m.joinedAt,
  }));
  setInCache(cacheKey, result, 60000);
  return result;
});

/**
 * Lists all active members of a workspace. Memoized per request and with in-memory TTL cache.
 */
export const getWorkspaceActiveMembers = cache(async function getWorkspaceActiveMembers(workspaceId: string) {
  const cacheKey = `wsMembers_${workspaceId}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await db.workspaceMember.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
    },
    include: {
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
    orderBy: { joinedAt: "asc" },
  });

  setInCache(cacheKey, result, 60000);
  return result;
});

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

