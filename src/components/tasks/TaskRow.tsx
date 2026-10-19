"use client";

import React from "react";
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  CornerDownRight,
} from "lucide-react";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { cn } from "@/lib/utils";

export interface TaskItemData {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | string | null;
  parentId?: string | null;
  assigneeId?: string | null;
  assignee?: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl?: string | null;
    };
    designation?: {
      id: string;
      name: string;
    } | null;
  } | null;
  creator?: {
    id: string;
    name: string | null;
    email: string;
  };
  children?: TaskItemData[];
  leafProgress?: {
    completedLeaves: number;
    totalLeaves: number;
    percentage: number;
  };
  createdAt: Date | string;
}

interface TaskRowProps {
  task: TaskItemData;
  depth?: number;
  isExpanded?: boolean;
  isSelected?: boolean;
  currentMemberId?: string;
  currentUserRole?: string;
  onToggleExpand?: (taskId: string) => void;
  onSelectTask: (task: TaskItemData) => void;
  onQuickStatusChange: (taskId: string, targetStatus: TaskStatus) => void;
  onQuickAddSubtask?: (parentId: string) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  depth = 0,
  isExpanded = true,
  isSelected = false,
  currentMemberId,
  currentUserRole,
  onToggleExpand,
  onSelectTask,
  onQuickStatusChange,
  onQuickAddSubtask,
}) => {
  const hasChildren = (task.children?.length ?? 0) > 0;
  const isCompleted = task.status === "DONE" || task.status === "CLOSED";

  const isOwner = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const isAssignedToMe = Boolean(task.assigneeId && task.assigneeId === currentMemberId);
  const canInteract = isOwner || isAssignedToMe;

  // Check if task is assigned by Owner (Mayank Parmar) directly to the viewing member
  const isAssignedByOwnerToMe = React.useMemo(() => {
    if (!currentMemberId) return false;
    const isOwnerCreator =
      task.creator?.name?.toLowerCase().includes("mayank") ||
      task.creator?.email?.toLowerCase().includes("mayank");
    return Boolean(isOwnerCreator && isAssignedToMe);
  }, [task.creator, isAssignedToMe, currentMemberId]);

  // Check if task is overdue (dueDate < now && !isCompleted)
  const isOverdue = React.useMemo(() => {
    if (!task.dueDate || isCompleted) return false;
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }, [task.dueDate, isCompleted]);

  const formattedDueDate = React.useMemo(() => {
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [task.dueDate]);

  const assigneeInitials = React.useMemo(() => {
    if (!task.assignee?.user) return null;
    const name = task.assignee.user.name;
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return task.assignee.user.email.slice(0, 2).toUpperCase();
  }, [task.assignee]);

  // Capped visual indentation (up to 4 levels)
  const visualDepth = Math.min(depth, 4);
  const indentPx = visualDepth * 20;

  return (
    <div
      className={cn(
        "group flex items-center justify-between min-h-[52px] py-2 px-3 sm:px-4 border-b transition-colors cursor-pointer select-none",
        isAssignedByOwnerToMe
          ? "border-amber-300 dark:border-amber-600/80 bg-gradient-to-r from-amber-50/90 via-indigo-50/40 to-surface dark:from-amber-950/30 dark:via-indigo-950/20 dark:to-surface ring-1 ring-amber-300/60 dark:ring-amber-500/40 shadow-xs"
          : isSelected
          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900"
          : "border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 bg-surface"
      )}
      onClick={() => onSelectTask(task)}
    >
      {/* Left side: Expand, Checkbox, Title & Hierarchy indent */}
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
        {/* Indentation spacing & guide line */}
        {depth > 0 && (
          <div
            style={{ width: `${indentPx}px` }}
            className="shrink-0 flex items-center justify-end pr-1 text-slate-300 dark:text-slate-600"
          >
            <CornerDownRight className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Expand / Collapse toggle */}
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.(task.id);
              }}
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-4 h-4" />
          )}
        </div>

        {/* Quick Complete Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!canInteract) {
              const assigneeName = task.assignee?.user?.name?.split(" ")[0] || "assigned member";
              alert(
                `View-Only: This task is assigned to ${assigneeName} by the Owner. Other members can view details, but cannot edit or change anything.`
              );
              return;
            }
            onQuickStatusChange(task.id, isCompleted ? "TODO" : "DONE");
          }}
          disabled={!canInteract}
          className={cn(
            "shrink-0 transition-colors p-0.5",
            canInteract
              ? "text-slate-400 hover:text-[#4F46E5] dark:text-slate-500 dark:hover:text-indigo-400 cursor-pointer"
              : "text-slate-300 dark:text-slate-600 opacity-60 cursor-not-allowed"
          )}
          title={
            !canInteract
              ? `View-Only: Owner shared to ${task.assignee?.user?.name || "assigned member"}`
              : isCompleted
              ? "Mark task incomplete"
              : "Mark task done"
          }
          aria-label={isCompleted ? "Mark task incomplete" : "Mark task done"}
        >
          {task.status === "DONE" || task.status === "CLOSED" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/40" />
          ) : task.status === "IN_PROGRESS" ? (
            <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        {/* Task Title & Mobile Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium truncate transition-colors",
                isCompleted
                  ? "line-through text-slate-400 dark:text-slate-500"
                  : "text-slate-900 dark:text-slate-100"
              )}
            >
              {task.title}
            </span>

            {/* Personalized Owner Assignment Highlight (Only for this assignee on desktop/tablet) */}
            {isAssignedByOwnerToMe && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/80 shrink-0 shadow-2xs animate-pulse">
                <span>⭐ Assigned to You by Mayank Parmar</span>
              </span>
            )}

            {/* Other Person View-Only Attribution Tag (desktop/tablet) */}
            {!isOwner && !isAssignedToMe && task.assignee?.user && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0 border border-slate-200 dark:border-slate-700">
                <span>👁️ Owner shared to {task.assignee.user.name?.split(" ")[0] || "member"}</span>
              </span>
            )}

            {/* Subtask leaf progress badge if parent (desktop/tablet) */}
            {hasChildren && task.leafProgress && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                <span>
                  {task.leafProgress.completedLeaves}/{task.leafProgress.totalLeaves}
                </span>
                <span className="text-slate-400">•</span>
                <span>{task.leafProgress.percentage}%</span>
              </span>
            )}
          </div>

          {/* Mobile Metadata Badges (Visible on screens <640px) */}
          <div className="flex sm:hidden items-center flex-wrap gap-1.5 mt-1 text-[10px]">
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
            {isAssignedByOwnerToMe && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200">
                ⭐ Mayank
              </span>
            )}
            {formattedDueDate && (
              <span className={cn("inline-flex items-center gap-1 font-medium", isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-400")}>
                <Clock className="w-2.5 h-2.5" />
                {formattedDueDate}
              </span>
            )}
            {hasChildren && task.leafProgress && (
              <span className="text-slate-400">
                {task.leafProgress.completedLeaves}/{task.leafProgress.totalLeaves} subtasks
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Priority, Status, Due date, Assignment Path, Assignee & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Priority Badge: fixed w-20 */}
        <div className="hidden md:flex w-20 justify-center">
          <TaskPriorityBadge priority={task.priority} />
        </div>

        {/* Status Badge: fixed w-24 */}
        <div className="hidden sm:flex w-24 justify-center">
          <TaskStatusBadge status={task.status} />
        </div>

        {/* Due Date: fixed w-24 */}
        <div className="hidden lg:flex w-24 justify-center">
          {formattedDueDate ? (
            <div
              className={cn(
                "flex items-center gap-1 text-xs px-2 py-0.5 rounded-md",
                isOverdue
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-semibold"
                  : "text-slate-500 dark:text-slate-400"
              )}
              title={isOverdue ? "Overdue deadline" : "Due date"}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedDueDate}</span>
            </div>
          ) : (
            <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
          )}
        </div>

        {/* Assignment Attribution: fixed w-44 */}
        <div className="hidden xl:flex w-44 justify-center">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 text-[11px] border border-slate-200/70 dark:border-slate-700/70 max-w-full truncate"
            title={`Assigned by ${task.creator?.name || "Mayank Parmar"} → Assigned to ${task.assignee?.user ? (task.assignee.user.name || task.assignee.user.email) : "Unassigned"}`}
          >
            <span className="text-slate-400">By</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[55px]">
              {task.creator?.name?.split(" ")[0] || "Mayank"}
            </span>
            <span className="text-[#4F46E5] font-bold">&rarr;</span>
            <span className="text-slate-400">To</span>
            <span className="font-bold text-[#4F46E5] dark:text-indigo-400 truncate max-w-[55px]">
              {task.assignee?.user ? (task.assignee.user.name?.split(" ")[0] || task.assignee.user.email) : "None"}
            </span>
          </div>
        </div>

        {/* Primary Assignee Avatar: fixed w-14 */}
        <div className="w-14 flex items-center justify-center">
          {task.assignee?.user ? (
            <div
              className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800 flex items-center justify-center text-xs font-bold text-[#4F46E5] dark:text-indigo-300 shrink-0 shadow-2xs"
              title={`Assigned by ${task.creator?.name || "Mayank Parmar"} → Assigned to ${task.assignee.user.name || task.assignee.user.email}`}
            >
              {assigneeInitials}
            </div>
          ) : (
            <div
              className="w-7 h-7 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-2xs"
              title="Unassigned"
            >
              —
            </div>
          )}
        </div>

        {/* Quick Add Subtask Button (visible on hover only for owner or assignee) */}
        <div className="w-6 flex items-center justify-center">
          {canInteract && onQuickAddSubtask && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAddSubtask(task.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-[#4F46E5] hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity"
              title="Add subtask"
              aria-label="Add subtask"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
