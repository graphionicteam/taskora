"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  AlertCircle,
  Archive,
  CornerDownRight,
  Check,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Trash2,
  CheckCheck,
  Loader2,
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
  currentUserRole?: string;
  currentMemberId?: string;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  workspaceId,
  members,
  onClose,
  onUpdateTask,
  onArchiveTask,
  onSelectTask,
  currentUserRole,
  currentMemberId,
}) => {
  const isOwner = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const isAssignedToMe = Boolean(task?.assigneeId && task.assigneeId === currentMemberId);
  const isOtherPerson = !isOwner && !isAssignedToMe;
  const [prevTaskId, setPrevTaskId] = useState<string | null>(task?.id || null);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "TODO");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "MEDIUM");
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
  );
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId || "");
  const [subtasks, setSubtasks] = useState<TaskItemData[]>(task?.children || []);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
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
    setSubtasks(task.children || []);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  // Fetch full live subtasks whenever active task changes
  useEffect(() => {
    if (!task?.id || !workspaceId) return;
    setIsLoadingSubtasks(true);
    fetch(`/api/v1/workspaces/${workspaceId}/tasks/${task.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.children) {
          setSubtasks(data.data.children);
        }
      })
      .catch((err) => console.error("Error loading subtasks:", err))
      .finally(() => setIsLoadingSubtasks(false));
  }, [task?.id, workspaceId]);

  if (!task) return null;

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      handleSaveField({ title: title.trim() });
    }
  };

  const handleDescriptionBlur = () => {
    if (isOtherPerson) return;
    if (description !== (task.description || "")) {
      handleSaveField({ description: description.trim() || null });
    }
  };

  const handleSaveField = (updates: Record<string, unknown>) => {
    if (isOtherPerson) return;
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
    if (isOtherPerson) {
      alert("Only Mayank Parmar (Owner) or the direct assignee can add subtasks.");
      return;
    }
    const cleanTitle = newSubtaskTitle.trim();
    if (!cleanTitle) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticSubtask: TaskItemData = {
      id: tempId,
      title: cleanTitle,
      status: "TODO",
      priority: "MEDIUM",
      parentId: task.id,
      assigneeId: task.assigneeId,
      assignee: task.assignee,
      creator: task.creator,
      createdAt: new Date().toISOString(),
    };

    // Instant optimistic render
    setSubtasks((prev) => [...prev, optimisticSubtask]);
    setNewSubtaskTitle("");
    setIsAddingSubtask(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          parentId: task.id,
          assigneeId: task.assigneeId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to add subtask.");
        setSubtasks((prev) => prev.filter((s) => s.id !== tempId));
      } else if (data.data) {
        setSubtasks((prev) =>
          prev.map((s) => (s.id === tempId ? data.data : s))
        );
        onUpdateTask(task.id, {});
      }
    } catch {
      setErrorMessage("Network error while adding subtask.");
      setSubtasks((prev) => prev.filter((s) => s.id !== tempId));
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: TaskStatus) => {
    if (isOtherPerson) {
      alert(`This task is assigned to ${task.assignee?.user?.name || "another team member"}. Only the direct assignee or Owner can check off subtasks.`);
      return;
    }
    const newStatus: TaskStatus =
      currentStatus === "DONE" || currentStatus === "CLOSED" ? "TODO" : "DONE";

    // Instant optimistic status flip
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, status: newStatus } : s))
    );

    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceId}/tasks/${subtaskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) {
        // Rollback
        setSubtasks((prev) =>
          prev.map((s) =>
            s.id === subtaskId ? { ...s, status: currentStatus } : s
          )
        );
      } else {
        onUpdateTask(task.id, {});
      }
    } catch (err) {
      console.error(err);
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtaskId ? { ...s, status: currentStatus } : s
        )
      );
    }
  };

  const handleDeleteSubtask = async (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOtherPerson) return;
    if (!window.confirm("Are you sure you want to delete this subtask?")) return;

    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    try {
      await fetch(`/api/v1/workspaces/${workspaceId}/tasks/${subtaskId}`, {
        method: "DELETE",
      });
      onUpdateTask(task.id, {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteAllSubtasks = async () => {
    if (isOtherPerson) return;
    const activeSubs = subtasks.filter(
      (s) => s.status !== "DONE" && s.status !== "CLOSED"
    );
    if (activeSubs.length === 0) return;

    setSubtasks((prev) =>
      prev.map((s) => ({ ...s, status: "DONE" as TaskStatus }))
    );

    try {
      await Promise.all(
        activeSubs.map((s) =>
          fetch(`/api/v1/workspaces/${workspaceId}/tasks/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "DONE" }),
          })
        )
      );
      setSuccessMessage("All subtasks marked Done");
      setTimeout(() => setSuccessMessage(null), 1500);
      onUpdateTask(task.id, {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (isOtherPerson) {
      alert(`This task was assigned to ${task.assignee?.user?.name || "another team member"} by the Owner. You can view all details, but cannot edit.`);
      return;
    }
    setStatus(newStatus);
    if ((newStatus === "DONE" || newStatus === "CLOSED") && subtasks.length > 0) {
      const activeSubs = subtasks.filter(
        (s) => s.status !== "DONE" && s.status !== "CLOSED"
      );
      if (activeSubs.length > 0) {
        const confirmAll = window.confirm(
          `This task has ${activeSubs.length} active subtask(s). Would you like to mark all subtasks as Done so this parent task can be completed?`
        );
        if (confirmAll) {
          await handleCompleteAllSubtasks();
        } else {
          return;
        }
      }
    }
    handleSaveField({ status: newStatus });
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

        {/* View-Only Banner when task is assigned by Owner to another member */}
        {isOtherPerson && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 via-slate-50 to-amber-50/80 dark:from-indigo-950/40 dark:via-slate-900/50 dark:to-amber-950/40 border border-indigo-200 dark:border-indigo-900/80 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-[#4F46E5] dark:text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white">View-Only Mode: </span>
              <span>Owner ({task.creator?.name || "Mayank Parmar"}) shared this task to </span>
              <strong className="text-[#4F46E5] dark:text-indigo-400 font-bold">
                {task.assignee?.user ? (task.assignee.user.name || task.assignee.user.email) : "Unassigned"}
              </strong>.
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                You can review all details and subtasks, but editing is locked to the owner and direct assignee.
              </span>
            </div>
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
            disabled={isOtherPerson || !isOwner || isPending}
            readOnly={isOtherPerson || !isOwner}
            className={cn(
              "w-full text-xl font-bold tracking-tight text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:outline-hidden pb-1 transition-colors",
              !isOtherPerson && isOwner && "hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#4F46E5]",
              isCompleted && "line-through text-slate-400 dark:text-slate-500",
              (isOtherPerson || !isOwner) && "cursor-default select-text"
            )}
            placeholder="Task title..."
          />
        </div>

        {/* Assignment Attribution: Who assigned to whom */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 via-slate-50 to-emerald-50/70 dark:from-indigo-950/40 dark:via-slate-900/50 dark:to-emerald-950/40 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Task Assignment Path
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Verified Assignment
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            {/* Assigner / Creator */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {(task.creator?.name || "M").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">Assigned by</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">
                  {task.creator?.name || task.creator?.email || "Mayank Parmar (Owner)"}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center px-1">
              <ArrowRight className="w-4 h-4 text-[#4F46E5] shrink-0" />
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-2 min-w-0 justify-end text-right">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">Assigned to</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">
                  {task.assignee?.user ? (task.assignee.user.name || task.assignee.user.email) : "Unassigned"}
                </span>
              </div>
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {task.assignee?.user?.name ? task.assignee.user.name.slice(0, 1).toUpperCase() : "—"}
              </div>
            </div>
          </div>
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
                handleStatusChange(e.target.value as TaskStatus);
              }}
              disabled={isOtherPerson || isPending}
              className={cn(
                "w-full h-9 px-2.5 text-xs font-semibold rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]",
                isOtherPerson ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              )}
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
              disabled={!isOwner || isPending}
              className={cn(
                "w-full h-9 px-2.5 text-xs font-semibold rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]",
                !isOwner ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              )}
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
            {isOwner ? (
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
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {task.assignee?.user?.name || task.assignee?.user?.email || "Unassigned"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    🔒 Assigned by Owner ({task.creator?.name || "Mayank Parmar"})
                  </span>
                </div>
              </div>
            )}
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
              disabled={!isOwner || isPending}
              className={cn(
                "w-full h-9 px-2.5 text-xs font-medium rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]",
                !isOwner ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              )}
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
            disabled={isOtherPerson || isPending}
            readOnly={isOtherPerson || !isOwner}
            placeholder={isOtherPerson ? "No description provided." : "Add notes, specifications, or details..."}
            className={cn(
              "w-full p-3 text-sm rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] transition-colors resize-y leading-relaxed",
              isOtherPerson && "cursor-default bg-slate-50/50 dark:bg-slate-900/50 select-text"
            )}
          />
        </div>

        {/* Subtask Hierarchy & Leaf Progress Section */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Subtasks ({subtasks.length})
              </h3>
              {isLoadingSubtasks && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
            </div>
            {subtasks.length > 0 && (
              <div className="flex items-center gap-2">
                {!isOtherPerson && subtasks.some((s) => s.status !== "DONE" && s.status !== "CLOSED") && (
                  <button
                    type="button"
                    onClick={handleCompleteAllSubtasks}
                    className="text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Complete all
                  </button>
                )}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {subtasks.filter((s) => s.status === "DONE" || s.status === "CLOSED").length}/{subtasks.length} done
                </span>
              </div>
            )}
          </div>

          {/* Leaf progress bar */}
          {subtasks.length > 0 && (
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-[#4F46E5] rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(
                    (subtasks.filter((s) => s.status === "DONE" || s.status === "CLOSED").length /
                      subtasks.length) *
                      100
                  )}%`,
                }}
              />
            </div>
          )}

          {/* Subtask list */}
          <div className="space-y-1.5 mb-3">
            {subtasks.length > 0 ? (
              subtasks.map((subtask) => {
                const isSubDone = subtask.status === "DONE" || subtask.status === "CLOSED";
                return (
                  <div
                    key={subtask.id}
                    className={cn(
                      "group flex items-center justify-between p-2.5 rounded-lg border transition-all",
                      isSubDone
                        ? "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60"
                        : "bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 shadow-2xs"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOtherPerson) {
                            alert(`This task is assigned to ${task.assignee?.user?.name || "another member"}. Only the direct assignee or Owner can check off subtasks.`);
                            return;
                          }
                          handleToggleSubtask(subtask.id, subtask.status);
                        }}
                        disabled={isOtherPerson}
                        className={cn(
                          "transition-colors shrink-0",
                          isOtherPerson ? "cursor-not-allowed opacity-60" : "text-slate-400 hover:text-emerald-500 cursor-pointer"
                        )}
                        title={
                          isOtherPerson
                            ? "View-only subtask"
                            : isSubDone
                            ? "Mark as To Do"
                            : "Mark as Done"
                        }
                        aria-label={isSubDone ? "Mark subtask as To Do" : "Mark subtask as Done"}
                      >
                        {isSubDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <span
                        onClick={() => onSelectTask(subtask)}
                        className={cn(
                          "text-xs font-medium truncate cursor-pointer hover:text-[#4F46E5] transition-colors flex-1",
                          isSubDone && "line-through text-slate-400 dark:text-slate-500"
                        )}
                        title={subtask.title}
                      >
                        {subtask.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <TaskStatusBadge status={subtask.status} />
                      {!isOtherPerson && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSubtask(subtask.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                          title="Delete subtask"
                          aria-label="Delete subtask"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-1">
                No subtasks yet.
              </p>
            )}
          </div>

          {/* Quick add subtask form */}
          {!isOtherPerson ? (
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
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Owner shared to {task.assignee?.user?.name || "assignee"}. Subtask preparation is restricted to them.</span>
            </div>
          )}
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
        {isOwner ? (
          <button
            type="button"
            onClick={handleArchive}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            Archive Task
          </button>
        ) : isOtherPerson ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-[#4F46E5] shrink-0" />
            <span>Owner shared to {task.assignee?.user?.name || "assignee"} (Read-Only)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Workspace Owner Supervision Active</span>
          </div>
        )}

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
