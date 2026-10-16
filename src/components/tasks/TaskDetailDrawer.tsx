"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  AlertCircle,
  Archive,
  CornerDownRight,
  Check,
} from "lucide-react";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { TaskItemData } from "./TaskRow";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface WorkspaceMemberOption {
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
}

interface TaskDetailDrawerProps {
  task: TaskItemData | null;
  workspaceId: string;
  members: WorkspaceMemberOption[];
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Record<string, unknown>) => Promise<{ error?: string; [key: string]: unknown }>;
  onArchiveTask: (taskId: string) => Promise<{ error?: string; [key: string]: unknown }>;
  onSelectTask: (task: TaskItemData) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  workspaceId,
  members,
  onClose,
  onUpdateTask,
  onArchiveTask,
  onSelectTask,
}) => {
  const [prevTaskId, setPrevTaskId] = useState<string | null>(task?.id || null);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "TODO");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "MEDIUM");
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
  );
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId || "");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state whenever active task changes without effect-induced cascade
  if (task && task.id !== prevTaskId) {
    setPrevTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || "");
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(
      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
    );
    setAssigneeId(task.assigneeId || "");
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  if (!task) return null;

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      handleSaveField({ title: title.trim() });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (task.description || "")) {
      handleSaveField({ description: description.trim() || null });
    }
  };

  const handleSaveField = (updates: Record<string, unknown>) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await onUpdateTask(task.id, updates);
      if (res?.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage("Saved");
        setTimeout(() => setSuccessMessage(null), 1500);
      }
    });
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    setIsAddingSubtask(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          parentId: task.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to add subtask.");
      } else {
        setNewSubtaskTitle("");
        // Reload parent task details
        await onUpdateTask(task.id, {});
      }
    } catch {
      setErrorMessage("Network error while adding subtask.");
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleArchive = async () => {
    if (window.confirm("Are you sure you want to archive this task and all its subtasks?")) {
      startTransition(async () => {
        const res = await onArchiveTask(task.id);
        if (res?.error) {
          setErrorMessage(res.error);
        } else {
          onClose();
        }
      });
    }
  };

  const isCompleted = task.status === "DONE" || task.status === "CLOSED";

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[520px] bg-surface border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      aria-label="Task Details Panel"
    >
      {/* Header bar */}
      <div className="h-16 px-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Task Details
          </span>
          {successMessage && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
              <Check className="w-3 h-3" />
              {successMessage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Close drawer */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close task drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 font-medium flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Title input */}
        <div>
          <label htmlFor="task-title" className="sr-only">
            Task Title
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            disabled={isPending}
            className={cn(
              "w-full text-xl font-bold tracking-tight text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#4F46E5] focus:outline-hidden pb-1 transition-colors",
              isCompleted && "line-through text-slate-400 dark:text-slate-500"
            )}
            placeholder="Task title..."
          />
        </div>

        {/* Quick Properties Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                const newStatus = e.target.value as TaskStatus;
                setStatus(newStatus);
                handleSaveField({ status: newStatus });
              }}
              disabled={isPending}
              className="w-full h-9 px-2.5 text-xs font-semibold rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] cursor-pointer"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => {
                const newPriority = e.target.value as TaskPriority;
                setPriority(newPriority);
                handleSaveField({ priority: newPriority });
              }}
              disabled={isPending}
              className="w-full h-9 px-2.5 text-xs font-semibold rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] cursor-pointer"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Primary Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => {
                const val = e.target.value || null;
                setAssigneeId(val || "");
                handleSaveField({ assigneeId: val });
              }}
              disabled={isPending}
              className="w-full h-9 px-2.5 text-xs font-medium rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] cursor-pointer truncate"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name || m.user.email} ({m.designation?.name || m.role})
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                const val = e.target.value;
                setDueDate(val);
                handleSaveField({ dueDate: val || null });
              }}
              disabled={isPending}
              className="w-full h-9 px-2.5 text-xs font-medium rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] cursor-pointer"
            />
          </div>
        </div>

        {/* Description textarea */}
        <div>
          <label
            htmlFor="task-description"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
          >
            Description
          </label>
          <textarea
            id="task-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            disabled={isPending}
            placeholder="Add notes, specifications, or details..."
            className="w-full p-3 text-sm rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] transition-colors resize-y leading-relaxed"
          />
        </div>

        {/* Subtask Hierarchy & Leaf Progress Section */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Subtasks
            </h3>
            {task.leafProgress && (task.children?.length ?? 0) > 0 && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {task.leafProgress.completedLeaves}/{task.leafProgress.totalLeaves} leaves completed ({task.leafProgress.percentage}%)
              </span>
            )}
          </div>

          {/* Leaf progress bar */}
          {task.leafProgress && (task.children?.length ?? 0) > 0 && (
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-[#4F46E5] rounded-full transition-all duration-300"
                style={{ width: `${task.leafProgress.percentage}%` }}
              />
            </div>
          )}

          {/* Subtask list */}
          <div className="space-y-1 mb-3">
            {task.children && task.children.length > 0 ? (
              task.children.map((subtask) => (
                <div
                  key={subtask.id}
                  onClick={() => onSelectTask(subtask)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span
                      className={cn(
                        "text-xs font-medium truncate",
                        (subtask.status === "DONE" || subtask.status === "CLOSED") &&
                          "line-through text-slate-400 dark:text-slate-500"
                      )}
                    >
                      {subtask.title}
                    </span>
                  </div>
                  <TaskStatusBadge status={subtask.status} />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-1">
                No subtasks yet. Add one below to break down this work.
              </p>
            )}
          </div>

          {/* Quick add subtask form */}
          <form onSubmit={handleAddSubtask} className="flex gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="+ Add a subtask (press Enter)"
              disabled={isAddingSubtask}
              className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              isLoading={isAddingSubtask}
              disabled={!newSubtaskTitle.trim() || isAddingSubtask}
            >
              Add
            </Button>
          </form>
        </div>

        {/* Audit info */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 space-y-1">
          <p>
            Created on{" "}
            {new Date(task.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            {task.creator?.name ? ` by ${task.creator.name}` : ""}
          </p>
          {task.status === "CLOSED" && (
            <p className="text-indigo-600 dark:text-indigo-400 font-medium">
              Closed {task.dueDate ? `on ${new Date().toLocaleDateString("en-US")}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Footer bar: Actions */}
      <div className="p-4 px-6 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        <button
          type="button"
          onClick={handleArchive}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
        >
          <Archive className="w-4 h-4" />
          Archive Task
        </button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    </aside>
  );
};
