"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  ChevronsUpDown,
  ListTodo,
  RotateCcw,
} from "lucide-react";
import { TaskStatus } from "@prisma/client";
import { TaskRow, TaskItemData } from "./TaskRow";
import { QuickCreateTask } from "./QuickCreateTask";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
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

interface TaskManagerProps {
  initialTasks: TaskItemData[];
  workspace: {
    id: string;
    name: string;
  };
  members: WorkspaceMemberOption[];
  viewMode: "all" | "my";
  currentMemberId: string;
  currentUserRole?: string;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  initialTasks,
  workspace,
  members,
  viewMode,
  currentMemberId,
  currentUserRole,
}) => {
  const [tasks, setTasks] = useState<TaskItemData[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<TaskItemData | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [quickTab, setQuickTab] = useState<"all" | "my" | "today" | "in_progress" | "completed" | "owner">("all");
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    new Set(initialTasks.map((t) => t.id))
  );

  // Ancestor reopening confirmation state
  const [reopenConfirmTarget, setReopenConfirmTarget] = useState<{
    taskId: string;
    status: TaskStatus;
  } | null>(null);

  const searchParams = useSearchParams();
  const selectedTaskIdParam = searchParams.get("selected") || searchParams.get("taskId");

  // Auto-open task if URL has ?selected=... or ?taskId=... (e.g. from notification click)
  useEffect(() => {
    if (!selectedTaskIdParam) return;
    const found = tasks.find((t) => t.id === selectedTaskIdParam);
    if (found) {
      setSelectedTask(found);
    } else {
      fetch(`/api/v1/workspaces/${workspace.id}/tasks/${selectedTaskIdParam}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setSelectedTask(data.data);
          }
        })
        .catch((err) => console.error("Error opening selected task from URL:", err));
    }
  }, [selectedTaskIdParam, tasks, workspace.id]);

  // Reload tasks from API
  const refreshTasks = useCallback(async () => {
    try {
      const url = `/api/v1/workspaces/${workspace.id}/tasks?view=${viewMode}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.data) {
        setTasks(data.data);

        // If selected task is open, refresh its data too
        if (selectedTask) {
          const updated = data.data.find((t: TaskItemData) => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch (err) {
      console.error("Failed to refresh tasks:", err);
    }
  }, [workspace.id, viewMode, selectedTask]);

  // Toggle single task collapse/expand
  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Expand / Collapse all
  const handleToggleAll = () => {
    if (expandedTaskIds.size === tasks.length) {
      setExpandedTaskIds(new Set());
    } else {
      setExpandedTaskIds(new Set(tasks.map((t) => t.id)));
    }
  };

  // Quick status change from checkbox
  const handleQuickStatusChange = async (
    taskId: string,
    targetStatus: TaskStatus,
    confirmAncestors = false
  ) => {
    try {
      const res = await fetch(`/api/v1/workspaces/${workspace.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          confirmReopenAncestors: confirmAncestors,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.requiresAncestorReopenConfirmation) {
        // Open confirmation dialog
        setReopenConfirmTarget({ taskId, status: targetStatus });
        return;
      }

      if (!res.ok) {
        alert(data.error || "Failed to update task status.");
        return;
      }

      await refreshTasks();
    } catch {
      alert("Network error while updating status.");
    }
  };

  // Update task from detail drawer
  const handleUpdateTask = async (taskId: string, updates: Record<string, unknown>) => {
    const res = await fetch(`/api/v1/workspaces/${workspace.id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (res.ok) {
      await refreshTasks();
    }
    return data;
  };

  // Archive task
  const handleArchiveTask = async (taskId: string) => {
    const res = await fetch(`/api/v1/workspaces/${workspace.id}/tasks/${taskId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (res.ok) {
      setSelectedTask(null);
      await refreshTasks();
    }
    return data;
  };

  // Build hierarchical task tree
  const taskTree = useMemo(() => {
    const taskMap = new Map<string, TaskItemData>();
    const roots: TaskItemData[] = [];

    // Clone tasks and prepare children arrays
    tasks.forEach((t) => {
      taskMap.set(t.id, { ...t, children: [] });
    });

    // Assemble parent-child tree
    tasks.forEach((t) => {
      const node = taskMap.get(t.id)!;
      if (t.parentId && taskMap.has(t.parentId)) {
        taskMap.get(t.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [tasks]);

  // Quick metric counts for direct navigation tabs
  const tabCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let myActive = 0;
    let dueToday = 0;
    let inProgress = 0;
    let completed = 0;
    let ownerAssigned = 0;

    for (const t of tasks) {
      const isComplete = t.status === "DONE" || t.status === "CLOSED";
      if (t.assigneeId === currentMemberId && !isComplete) myActive++;
      if (t.status === "IN_PROGRESS") inProgress++;
      if (isComplete) completed++;

      if (t.dueDate) {
        const d = new Date(t.dueDate);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === today.getTime() && !isComplete) {
          dueToday++;
        }
      }

      const isByOwner =
        t.creator?.name?.toLowerCase().includes("mayank") ||
        t.creator?.email?.toLowerCase().includes("mayank");
      if (isByOwner) ownerAssigned++;
    }

    return {
      all: tasks.length,
      my: myActive,
      today: dueToday,
      in_progress: inProgress,
      completed,
      owner: ownerAssigned,
    };
  }, [tasks, currentMemberId]);

  // Filter tasks
  const filteredTree = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    function filterNode(node: TaskItemData): TaskItemData | null {
      // Check search match
      const titleMatch = node.title.toLowerCase().includes(searchLower);
      const descMatch = node.description?.toLowerCase().includes(searchLower) || false;
      const matchesSearch = !searchLower || titleMatch || descMatch;

      // Check status match
      let matchesStatus = true;
      if (statusFilter === "ACTIVE") {
        matchesStatus = node.status === "TODO" || node.status === "IN_PROGRESS" || node.status === "IN_REVIEW";
      } else if (statusFilter !== "ALL") {
        matchesStatus = node.status === statusFilter;
      }

      // Check priority match
      const matchesPriority = priorityFilter === "ALL" || node.priority === priorityFilter;

      // Check quick tab match
      let matchesTab = true;
      if (quickTab === "my") {
        matchesTab = node.assigneeId === currentMemberId;
      } else if (quickTab === "today") {
        if (!node.dueDate) {
          matchesTab = false;
        } else {
          const d = new Date(node.dueDate);
          const now = new Date();
          matchesTab = d.toDateString() === now.toDateString();
        }
      } else if (quickTab === "in_progress") {
        matchesTab = node.status === "IN_PROGRESS";
      } else if (quickTab === "completed") {
        matchesTab = node.status === "DONE" || node.status === "CLOSED";
      } else if (quickTab === "owner") {
        matchesTab =
          !!node.creator?.name?.toLowerCase().includes("mayank") ||
          !!node.creator?.email?.toLowerCase().includes("mayank");
      }

      // Filter children recursively
      const filteredChildren: TaskItemData[] = [];
      if (node.children) {
        for (const child of node.children) {
          const res = filterNode(child);
          if (res) filteredChildren.push(res);
        }
      }

      // Keep node if it matches or has matching children
      if (
        (matchesSearch && matchesStatus && matchesPriority && matchesTab) ||
        filteredChildren.length > 0
      ) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    }

    return taskTree.map(filterNode).filter(Boolean) as TaskItemData[];
  }, [taskTree, search, statusFilter, priorityFilter, quickTab, currentMemberId]);

  // Recursive renderer for tree rows
  const renderTaskRows = (nodes: TaskItemData[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = expandedTaskIds.has(node.id);
      return (
        <React.Fragment key={node.id}>
          <TaskRow
            task={node}
            depth={depth}
            isExpanded={isExpanded}
            isSelected={selectedTask?.id === node.id}
            currentMemberId={currentMemberId}
            onToggleExpand={handleToggleExpand}
            onSelectTask={setSelectedTask}
            onQuickStatusChange={handleQuickStatusChange}
            onQuickAddSubtask={() => {
              setSelectedTask(node);
            }}
          />
          {isExpanded && node.children && node.children.length > 0 && (
            renderTaskRows(node.children, depth + 1)
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none mb-1 block">
            {viewMode === "my" ? "Personal Queue" : "Workspace Tasks"}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {viewMode === "my" ? "My Tasks" : "All Tasks"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {viewMode === "my"
              ? "Tasks assigned to you across the Graphionic workspace"
              : `Collaborative tasks and nested hierarchy for ${workspace.name}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleAll}
            className="text-xs font-medium"
          >
            <ChevronsUpDown className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {expandedTaskIds.size === tasks.length ? "Collapse All" : "Expand All"}
          </Button>
        </div>
      </div>

      {/* Quick Navigation Panel Tabs (Direct Go & Filter) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setQuickTab("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
            quickTab === "all"
              ? "bg-white dark:bg-slate-800 text-[#4F46E5] dark:text-indigo-400 shadow-2xs ring-1 ring-slate-200 dark:ring-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <span>All Tasks</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {tabCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQuickTab("my")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
            quickTab === "my"
              ? "bg-white dark:bg-slate-800 text-[#4F46E5] dark:text-indigo-400 shadow-2xs ring-1 ring-slate-200 dark:ring-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <span>My Assigned Tasks</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300 font-bold">
            {tabCounts.my}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQuickTab("today")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
            quickTab === "today"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs ring-1 ring-slate-200 dark:ring-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <span>Due Today</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold">
            {tabCounts.today}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQuickTab("in_progress")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
            quickTab === "in_progress"
              ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-2xs ring-1 ring-slate-200 dark:ring-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <span>In Progress</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
            {tabCounts.in_progress}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQuickTab("completed")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
            quickTab === "completed"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs ring-1 ring-slate-200 dark:ring-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <span>Completed Tasks</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
            {tabCounts.completed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQuickTab("owner")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
            quickTab === "owner"
              ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 shadow-2xs ring-1 ring-amber-300 dark:ring-amber-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <span>⭐ Assigned by Mayank</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
            {tabCounts.owner}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (To Do, In Progress, In Review)</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Title-First Quick Create Bar */}
      <QuickCreateTask
        workspaceId={workspace.id}
        members={members}
        onTaskCreated={refreshTasks}
        defaultAssigneeId={viewMode === "my" ? currentMemberId : null}
        currentUserRole={currentUserRole}
      />

      {/* Task Table Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-surface shadow-2xs overflow-hidden">
        {/* Table Header: 44px height pixel-perfect aligned with TaskRow */}
        <div className="flex items-center justify-between h-11 px-3 sm:px-4 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
            <span>Task Title & Subtasks</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline-block w-20 text-center">Priority</span>
            <span className="hidden sm:inline-block w-24 text-center">Status</span>
            <span className="hidden lg:inline-block w-24 text-center">Due Date</span>
            <span className="hidden xl:inline-block w-44 text-center">Assignment</span>
            <span className="inline-block w-14 text-center">Assignee</span>
            <span className="w-6" aria-hidden="true" />
          </div>
        </div>

        {/* Task Rows List */}
        {filteredTree.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {renderTaskRows(filteredTree)}
          </div>
        ) : (
          <div className="py-16 text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-[#4F46E5] dark:text-indigo-400 mx-auto mb-3 shadow-2xs">
              <ListTodo className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              No tasks found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {search || statusFilter !== "ALL" || priorityFilter !== "ALL" || quickTab !== "all"
                ? "Try adjusting your search or filters to see more tasks."
                : "Create your first task above to begin organizing your work."}
            </p>
          </div>
        )}
      </div>

      {/* Approved 520px Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          key={selectedTask.id}
          task={selectedTask}
          workspaceId={workspace.id}
          members={members}
          currentUserRole={currentUserRole}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onArchiveTask={handleArchiveTask}
          onSelectTask={setSelectedTask}
        />
      )}

      {/* Reopening Completed Ancestors Confirmation Modal */}
      <Dialog
        open={!!reopenConfirmTarget}
        onOpenChange={(open) => !open && setReopenConfirmTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 mb-1">
            <RotateCcw className="w-5 h-5 shrink-0" />
            <DialogTitle>Reopen Completed Parent Tasks?</DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-3 text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
          <p>
            This subtask is beneath one or more parent tasks that are already marked <strong>Done</strong> or <strong>Closed</strong>.
          </p>
          <p>
            Under Taskora hierarchy rules, a parent task cannot remain completed while a descendant is active. Reopening this subtask will automatically reopen its parent task(s) to <strong>In Progress</strong>.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setReopenConfirmTarget(null)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={async () => {
              if (reopenConfirmTarget) {
                const { taskId, status } = reopenConfirmTarget;
                setReopenConfirmTarget(null);
                await handleQuickStatusChange(taskId, status, true);
              }
            }}
          >
            Confirm & Reopen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
};
