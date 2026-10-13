import { db } from "@/lib/db";
import { Task, TaskStatus } from "@prisma/client";

export interface TaskWithChildren extends Task {
  children?: TaskWithChildren[];
  assignee?: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
    designation: {
      id: string;
      name: string;
    } | null;
  } | null;
  creator?: {
    id: string;
    name: string | null;
    email: string;
  };
  leafProgress?: {
    completedLeaves: number;
    totalLeaves: number;
    percentage: number;
  };
}

/**
 * Locked Stage 08 leaf-task formula:
 * Progress = (Done or Closed leaf tasks / All leaf tasks) * 100
 *
 * A leaf task is a task with 0 subtasks in the subtree.
 * Parent tasks do not count as extra completed work.
 * If total leaves == 0, returns 0%.
 */
interface LeafNode {
  status: TaskStatus;
  children?: LeafNode[];
}

export function calculateLeafProgress(
  task: LeafNode
): { completedLeaves: number; totalLeaves: number; percentage: number } {
  const children = task.children || [];

  // Base case: if task has no children, it is itself a leaf task
  if (children.length === 0) {
    const isComplete = task.status === "DONE" || task.status === "CLOSED";
    return {
      completedLeaves: isComplete ? 1 : 0,
      totalLeaves: 1,
      percentage: isComplete ? 100 : 0,
    };
  }

  // Recursive case: sum leaves across all subtrees
  let completedLeaves = 0;
  let totalLeaves = 0;

  function countLeaves(node: LeafNode) {
    const subchildren = node.children || [];
    if (subchildren.length === 0) {
      totalLeaves += 1;
      if (node.status === "DONE" || node.status === "CLOSED") {
        completedLeaves += 1;
      }
    } else {
      for (const child of subchildren) {
        countLeaves(child);
      }
    }
  }

  for (const child of children) {
    countLeaves(child);
  }

  const percentage =
    totalLeaves > 0 ? Math.round((completedLeaves / totalLeaves) * 100) : 0;

  return { completedLeaves, totalLeaves, percentage };
}

/**
 * Validates that setting `newParentId` does not introduce a cycle in the task hierarchy.
 * Returns true if valid, false if a cycle would be created.
 */
export async function validateHierarchyCycle(
  taskId: string,
  newParentId: string | null | undefined
): Promise<boolean> {
  if (!newParentId) return true;
  if (taskId === newParentId) return false;

  // Walk up from newParentId to root. If taskId is encountered, cycle!
  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === taskId) {
      return false; // Cycle detected
    }
    if (visited.has(currentId)) {
      return false; // Existing loop detected
    }
    visited.add(currentId);

    const parentTask: { parentId: string | null } | null = await db.task.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    currentId = parentTask ? parentTask.parentId : null;
  }

  return true;
}

/**
 * Validates that all descendants of a task are DONE or CLOSED.
 * Stage 08 rule: A parent task can move to Done or Closed only when every descendant is Done or Closed.
 */
export async function validateCompletionConstraints(
  taskId: string,
  targetStatus: TaskStatus
): Promise<{ allowed: boolean; activeDescendantsCount: number }> {
  if (targetStatus !== "DONE" && targetStatus !== "CLOSED") {
    return { allowed: true, activeDescendantsCount: 0 };
  }

  // Find all descendants recursively
  const queue = [taskId];
  let activeCount = 0;

  while (queue.length > 0) {
    const currentBatch = queue.splice(0, 50);
    const children = await db.task.findMany({
      where: {
        parentId: { in: currentBatch },
        isArchived: false,
      },
      select: {
        id: true,
        status: true,
      },
    });

    for (const child of children) {
      if (child.status !== "DONE" && child.status !== "CLOSED") {
        activeCount++;
      }
      queue.push(child.id);
    }
  }

  return {
    allowed: activeCount === 0,
    activeDescendantsCount: activeCount,
  };
}

/**
 * Finds all ancestors of a task that are currently DONE or CLOSED.
 * Used when reopening a subtask to prompt or confirm reopening ancestors.
 */
export async function findCompletedAncestors(taskId: string): Promise<string[]> {
  const completedAncestorIds: string[] = [];
  let currentId: string | null = taskId;

  const currentTask = await db.task.findUnique({
    where: { id: taskId },
    select: { parentId: true },
  });

  currentId = currentTask?.parentId || null;

  while (currentId) {
    const ancestor: { id: string; status: TaskStatus; parentId: string | null } | null =
      await db.task.findUnique({
        where: { id: currentId },
        select: { id: true, status: true, parentId: true },
      });

    if (!ancestor) break;

    if (ancestor.status === "DONE" || ancestor.status === "CLOSED") {
      completedAncestorIds.push(ancestor.id);
    }

    currentId = ancestor.parentId;
  }

  return completedAncestorIds;
}
