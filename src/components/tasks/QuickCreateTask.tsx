"use client";

import React, { useState, useTransition } from "react";
import { Plus, Calendar, Flag, User } from "lucide-react";
import { TaskPriority } from "@prisma/client";
import { Button } from "@/components/ui/Button";

interface WorkspaceMemberOption {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
}

interface QuickCreateTaskProps {
  workspaceId: string;
  members: WorkspaceMemberOption[];
  onTaskCreated: () => void;
  defaultAssigneeId?: string | null;
  currentUserRole?: string;
}

export const QuickCreateTask: React.FC<QuickCreateTaskProps> = ({
  workspaceId,
  members,
  onTaskCreated,
  defaultAssigneeId,
  currentUserRole,
}) => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>(defaultAssigneeId || "");
  const [showOptions, setShowOptions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const assignableMembers = members.filter((m) => {
    if (isOwner) return true;
    const isMayank =
      m.role === "OWNER" ||
      m.user.name?.toLowerCase().includes("mayank") ||
      m.user.email?.toLowerCase().includes("mayank");
    return !isMayank;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/workspaces/${workspaceId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            priority,
            dueDate: dueDate || null,
            assigneeId: assigneeId || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || "Failed to create task.");
        } else {
          setTitle("");
          setDueDate("");
          setShowOptions(false);
          if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("taskora:refresh-notifications"));
          onTaskCreated();
        }
      } catch {
        setErrorMessage("Network error while creating task.");
      }
    });
  };

  return (
    <div className="mb-4">
      <form
        onSubmit={handleSubmit}
        className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface shadow-2xs focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/10 transition-all"
      >
        <div className="flex items-center gap-2">
          <div className="text-slate-400 pl-2">
            <Plus className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim().length > 0 && !showOptions) {
                setShowOptions(true);
              }
            }}
            placeholder="Add task... (press Enter to create)"
            disabled={isPending}
            className="flex-1 h-9 px-2 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
          />

          <Button
            type="submit"
            size="sm"
            variant="primary"
            isLoading={isPending}
            disabled={!title.trim() || isPending}
            className="shrink-0 font-semibold"
          >
            Add Task
          </Button>
        </div>

        {/* Optional inline settings toggled when typing or clicking options */}
        {showOptions && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 px-2 animate-in fade-in duration-100">
            {/* Priority selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Flag className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="h-7 px-2 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Due date */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-7 px-2 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              />
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-7 px-2 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-hidden max-w-[150px] truncate"
              >
                <option value="">Unassigned</option>
                {assignableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user.name || m.user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </form>

      {errorMessage && (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 pl-2">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
