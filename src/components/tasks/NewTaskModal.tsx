"use client";

import React, { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

interface WorkspaceMemberOption {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  designation?: {
    name: string;
  } | null;
}

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  members: WorkspaceMemberOption[];
  onTaskCreated?: () => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  members,
  onTaskCreated,
}) => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            description: description.trim() || null,
            priority,
            status,
            dueDate: dueDate || null,
            assigneeId: assigneeId || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || "Failed to create task.");
        } else {
          setTitle("");
          setDescription("");
          setDueDate("");
          setAssigneeId("");
          onClose();
          onTaskCreated?.();
          router.refresh();
        }
      } catch {
        setErrorMessage("Network error while creating task.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
      </DialogHeader>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement user authentication flow"
            disabled={isPending}
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-surface text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional context or requirements..."
            disabled={isPending}
            className="w-full p-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-surface text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              disabled={isPending}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-surface text-slate-900 dark:text-slate-100 focus:outline-hidden"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              disabled={isPending}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-surface text-slate-900 dark:text-slate-100 focus:outline-hidden"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isPending}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-surface text-slate-900 dark:text-slate-100 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={isPending}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-surface text-slate-900 dark:text-slate-100 focus:outline-hidden truncate"
            >
              <option value="">Unassigned</option>
              {members
                .filter(
                  (m) =>
                    (m as any).role !== "OWNER" &&
                    !m.user.name?.toLowerCase().includes("mayank")
                )
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user.name || m.user.email}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isPending}
            disabled={!title.trim() || isPending}
            className="font-semibold"
          >
            Create Task
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);
};
