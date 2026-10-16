"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Plus,
  CalendarDays,
  User,
  Filter,
  Sparkles,
  Share2,
  Layers,
  Users,
  FolderKanban,
  Building,
  Check,
  ChevronDown,
  StickyNote,
} from "lucide-react";
import { StickyNotesWidget } from "./StickyNotesWidget";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { TaskItemData } from "@/components/tasks/TaskRow";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { updateTaskStatusAction, createTaskAction } from "@/server/actions/task.actions";
import { cn } from "@/lib/utils";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
);
const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15"/></svg>
);

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

interface DashboardCalendarViewProps {
  initialTasks: TaskItemData[];
  workspace: {
    id: string;
    name: string;
  };
  members: WorkspaceMemberOption[];
  currentMemberId: string;
  currentUserName: string;
}

type ViewMode = "month" | "week" | "day";
type TaskFilterType = "all" | "group" | "my" | "social" | "projects" | "clients";

export function DashboardCalendarView({
  initialTasks,
  workspace,
  members,
  currentMemberId,
  currentUserName,
}: DashboardCalendarViewProps) {
  const [tasks, setTasks] = useState<TaskItemData[]>(initialTasks);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedTask, setSelectedTask] = useState<TaskItemData | null>(null);
  const [filterType, setFilterType] = useState<TaskFilterType>("all");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

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
          if (data.data) setSelectedTask(data.data);
        })
        .catch((err) => console.error(err));
    }
  }, [selectedTaskIdParam, tasks, workspace.id]);

  // Modal / Creator states
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState<"Instagram" | "LinkedIn" | "Twitter" | "YouTube">("Instagram");
  const [socialTitle, setSocialTitle] = useState("");
  const [socialCaption, setSocialCaption] = useState("");
  const [socialDate, setSocialDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [socialAssigneeId, setSocialAssigneeId] = useState<string>(currentMemberId);

  // Quick inline creation for specific day in month view
  const [activeAddDay, setActiveAddDay] = useState<Date | null>(null);
  const [newDayTaskTitle, setNewDayTaskTitle] = useState("");
  const [newDayTaskPriority, setNewDayTaskPriority] = useState<TaskPriority>("MEDIUM");

  const [todayFlash, setTodayFlash] = useState(false);
  const today = useMemo(() => new Date(), []);

  // Helper date normalization
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Helper to detect if a task is a social media post
  const isSocialTask = (task: TaskItemData) => {
    return (
      task.title.startsWith("[Social:") ||
      task.description?.includes("Platform: Instagram") ||
      task.description?.includes("Platform: LinkedIn") ||
      task.description?.includes("Platform: Twitter") ||
      task.description?.includes("Platform: YouTube")
    );
  };

  // Extract platform from social post
  const getSocialPlatform = (task: TaskItemData) => {
    if (task.title.includes("[Social:Instagram]") || task.description?.includes("Platform: Instagram")) return "Instagram";
    if (task.title.includes("[Social:LinkedIn]") || task.description?.includes("Platform: LinkedIn")) return "LinkedIn";
    if (task.title.includes("[Social:Twitter]") || task.description?.includes("Platform: Twitter")) return "Twitter";
    if (task.title.includes("[Social:YouTube]") || task.description?.includes("Platform: YouTube")) return "YouTube";
    return null;
  };

  // Filter tasks based on selected filter and member
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Member filter
      if (selectedMemberId !== "all" && task.assigneeId !== selectedMemberId) {
        return false;
      }

      // Filter type
      if (filterType === "group") {
        const isTeamBroadcast =
          !task.assigneeId ||
          task.title.toLowerCase().includes("team") ||
          task.title.toLowerCase().includes("broadcast") ||
          task.title.toLowerCase().includes("all") ||
          task.description?.toLowerCase().includes("team") ||
          task.description?.toLowerCase().includes("broadcast");
        if (!isTeamBroadcast) return false;
      }
      if (filterType === "my" && task.assigneeId !== currentMemberId) {
        return false;
      }
      if (filterType === "social" && !isSocialTask(task)) {
        return false;
      }

      return true;
    });
  }, [tasks, selectedMemberId, filterType, currentMemberId]);

  // Compute KPI metrics
  const kpiStats = useMemo(() => {
    let myActive = 0;
    let dueToday = 0;
    let overdue = 0;
    let completedThisWeek = 0;

    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    startOfWeek.setDate(today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    for (const task of tasks) {
      const isComplete = task.status === "DONE" || task.status === "CLOSED";
      const isMyTask = task.assigneeId === currentMemberId;

      if (isMyTask && !isComplete) {
        myActive++;
      }

      if (task.dueDate) {
        const due = new Date(task.dueDate);
        if (isSameDay(due, today) && !isComplete) {
          dueToday++;
        } else if (due < today && !isSameDay(due, today) && !isComplete) {
          overdue++;
        }
      }

      if (isComplete) {
        const created = new Date(task.createdAt);
        if (created >= startOfWeek) {
          completedThisWeek++;
        }
      }
    }

    return { myActive, dueToday, overdue, completedThisWeek };
  }, [tasks, currentMemberId, today]);

  // Month view calendar days generator
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayIndex = firstDay.getDay(); // 0 is Sunday

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      tasks: TaskItemData[];
    }> = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      const dayTasks = filteredTasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        tasks: dayTasks,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayTasks = filteredTasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        tasks: dayTasks,
      });
    }

    // Next month padding to complete 35 or 42 grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      const dayTasks = filteredTasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        tasks: dayTasks,
      });
    }

    return days;
  }, [currentDate, filteredTasks, today]);

  // Week view days generator (7 days around currentDate)
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day; // start on Sunday
    const sunday = new Date(start.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      const dayTasks = filteredTasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));
      days.push({
        date,
        isToday: isSameDay(date, today),
        tasks: dayTasks,
      });
    }
    return days;
  }, [currentDate, filteredTasks, today]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setTodayFlash(true);
    setTimeout(() => {
      const todayEl = document.getElementById("calendar-today-cell");
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
    setTimeout(() => {
      setTodayFlash(false);
    }, 2200);
  };

  // Quick toggle task status
  const handleToggleStatus = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    startTransition(async () => {
      const res = await updateTaskStatusAction(taskId, newStatus);
      if (res?.error) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
        );
        alert(res.error);
      }
    });
  };

  // Add task on a specific day
  const handleAddDayTask = async (date: Date) => {
    if (!newDayTaskTitle.trim()) return;

    const formData = new FormData();
    formData.append("title", newDayTaskTitle.trim());
    formData.append("priority", newDayTaskPriority);
    formData.append("dueDate", date.toISOString());
    formData.append("assigneeId", selectedMemberId !== "all" ? selectedMemberId : currentMemberId);

    startTransition(async () => {
      const res = await createTaskAction(null, formData);
      if (res?.success && res.data) {
        setTasks((prev) => [res.data as TaskItemData, ...prev]);
        setNewDayTaskTitle("");
        setActiveAddDay(null);
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  // Create Social Media Post
  const handleCreateSocialPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialTitle.trim()) return;

    const fullTitle = `[Social:${socialPlatform}] ${socialTitle.trim()}`;
    const descriptionContent = `Platform: ${socialPlatform}\nCaption: ${socialCaption}\nStatus: Scheduled Post`;

    const formData = new FormData();
    formData.append("title", fullTitle);
    formData.append("description", descriptionContent);
    formData.append("priority", "HIGH");
    formData.append("dueDate", new Date(socialDate).toISOString());
    formData.append("assigneeId", socialAssigneeId || currentMemberId);

    startTransition(async () => {
      const res = await createTaskAction(null, formData);
      if (res?.success && res.data) {
        setTasks((prev) => [res.data as TaskItemData, ...prev]);
        setSocialTitle("");
        setSocialCaption("");
        setIsSocialModalOpen(false);
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  // Drawer handlers
  const handleUpdateTask = async (taskId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/v1/workspaces/${workspace.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Failed to update task" };
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
      }
      return { success: true };
    } catch {
      return { error: "Network error" };
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/v1/workspaces/${workspace.id}/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        return { error: "Failed to archive task" };
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask(null);
      return { success: true };
    } catch {
      return { error: "Network error" };
    }
  };

  // Title format for calendar view
  const headerDateString = useMemo(() => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (viewMode === "week") {
      const start = weekDays[0]?.date;
      const end = weekDays[6]?.date;
      if (!start || !end) return "";
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [currentDate, viewMode, weekDays]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in-50 duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <Badge variant="inProgress" className="text-xs">
              {workspace.name}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Full-width calendar schedule, team assignments, and social media planner.
          </p>
        </div>

        {/* Action Controls & Social Post Creator */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setIsSocialModalOpen(true)}
            className="h-9 px-3.5 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>+ Social Media Post</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleToday}
            className={cn(
              "h-9 text-xs font-semibold cursor-pointer transition-all",
              isSameDay(currentDate, new Date())
                ? "border-[#4F46E5] text-[#4F46E5] bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-[#4F46E5]/40"
                : "hover:border-[#4F46E5] hover:text-[#4F46E5]"
            )}
            title="Jump to today's schedule"
          >
            Today
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                viewMode === "month"
                  ? "bg-white dark:bg-slate-900 text-[#4F46E5] shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                viewMode === "week"
                  ? "bg-white dark:bg-slate-900 text-[#4F46E5] shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                viewMode === "day"
                  ? "bg-white dark:bg-slate-900 text-[#4F46E5] shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-surface hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              My Active
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-[#4F46E5] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpiStats.myActive}
            </span>
            <span className="text-xs text-slate-500">assigned tasks</span>
          </div>
        </Card>

        <Card className="p-4 bg-surface hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Due Today
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpiStats.dueToday}
            </span>
            <span className="text-xs text-slate-500">actionable today</span>
          </div>
        </Card>

        <Card className="p-4 bg-surface hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {kpiStats.overdue}
            </span>
            <span className="text-xs text-slate-500">needs attention</span>
          </div>
        </Card>

        <Card className="p-4 bg-surface hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {kpiStats.completedThisWeek}
            </span>
            <span className="text-xs text-slate-500">this week</span>
          </div>
        </Card>
      </div>

      {/* Personal Sticky Notes & Tomorrow Tasks Scratchpad */}
      <StickyNotesWidget
        currentMemberId={currentMemberId}
        currentUserName={currentUserName}
      />

      {/* Filter and Grouping Bar */}
      <Card className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-surface">
        {/* Left: Quick View Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
              filterType === "all"
                ? "bg-[#4F46E5] text-white shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            All Tasks
          </button>
          <button
            type="button"
            onClick={() => setFilterType("group")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
              filterType === "group"
                ? "bg-[#4F46E5] text-white shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Full Group Tasks
          </button>
          <button
            type="button"
            onClick={() => setFilterType("my")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
              filterType === "my"
                ? "bg-[#4F46E5] text-white shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            <User className="w-3.5 h-3.5" />
            My Direct Tasks
          </button>
          <button
            type="button"
            onClick={() => setFilterType("social")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
              filterType === "social"
                ? "bg-pink-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 hover:bg-slate-200"
            )}
          >
            <Share2 className="w-3.5 h-3.5" />
            Social Media Posts
          </button>
        </div>

        {/* Right: Team Member Dropdown (Mayank, Vedant, Lay, Bhumi, Rudra) */}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Assignee:</span>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Candidates (5 Team Members)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.user.name || m.user.email} ({m.designation?.name || m.role})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Main Full Big Calendar View */}
      <Card className="p-0 overflow-hidden shadow-xs border border-slate-200/90 dark:border-slate-800 bg-surface">
        {/* Calendar Navigation Bar */}
        <div className="p-4 px-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {headerDateString}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous Period"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next Period"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-[#4F46E5]">{filteredTasks.length}</span> scheduled items
          </div>
        </div>

        {/* MONTH VIEW: Big Spacious Calendar Grid */}
        {viewMode === "month" && (
          <div>
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-center">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                <div
                  key={day}
                  className="py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 3)}</span>
                </div>
              ))}
            </div>

            {/* Large Day Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/80 dark:divide-slate-800">
              {monthDays.map((item, idx) => {
                const dayNum = item.date.getDate();
                const isAdding = activeAddDay && isSameDay(activeAddDay, item.date);

                return (
                  <div
                    key={idx}
                    id={item.isToday ? "calendar-today-cell" : undefined}
                    className={cn(
                      "min-h-[125px] sm:min-h-[145px] p-2 flex flex-col justify-between transition-all relative group",
                      !item.isCurrentMonth && "bg-slate-50/40 dark:bg-slate-950/30 text-slate-400",
                      item.isCurrentMonth && "bg-surface hover:bg-slate-50/50 dark:hover:bg-slate-850/50",
                      item.isToday && "bg-indigo-50/30 dark:bg-indigo-950/30 ring-2 ring-inset ring-[#4F46E5]",
                      item.isToday && todayFlash && "ring-4 ring-indigo-500 scale-[1.01] shadow-lg z-10 duration-300"
                    )}
                  >
                    {/* Top Row: Date Number & Add Button */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                          item.isToday
                            ? "bg-[#4F46E5] text-white shadow-xs"
                            : item.isCurrentMonth
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-300 dark:text-slate-600"
                        )}
                      >
                        {dayNum}
                      </span>

                      {/* Quick Add Button on Hover */}
                      <button
                        type="button"
                        onClick={() => setActiveAddDay(isAdding ? null : item.date)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-[#4F46E5] hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity"
                        title="Add task for this day"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Inline Quick Add Input if Active */}
                    {isAdding && (
                      <div className="mb-2 p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-2xs animate-in zoom-in-95">
                        <input
                          type="text"
                          value={newDayTaskTitle}
                          onChange={(e) => setNewDayTaskTitle(e.target.value)}
                          placeholder="Task title..."
                          autoFocus
                          className="w-full h-6 px-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddDayTask(item.date);
                            if (e.key === "Escape") setActiveAddDay(null);
                          }}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <select
                            value={newDayTaskPriority}
                            onChange={(e) => setNewDayTaskPriority(e.target.value as TaskPriority)}
                            className="text-[10px] bg-transparent text-slate-600 dark:text-slate-300"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAddDayTask(item.date)}
                              className="px-1.5 py-0.5 rounded bg-[#4F46E5] text-white text-[10px] font-semibold"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveAddDay(null)}
                              className="text-[10px] text-slate-400"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Task Cards / Pills inside the Day Cell */}
                    <div className="space-y-1 overflow-y-auto max-h-[90px] pr-0.5 scrollbar-thin">
                      {item.tasks.slice(0, 3).map((task) => {
                        const isDone = task.status === "DONE" || task.status === "CLOSED";
                        const social = getSocialPlatform(task);
                        const isAssignedByOwnerToMe =
                          (task.creator?.name?.toLowerCase().includes("mayank") ||
                            task.creator?.email?.toLowerCase().includes("mayank")) &&
                          task.assigneeId === currentMemberId;

                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className={cn(
                              "p-1.5 rounded-lg border text-xs cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between gap-1 shadow-2xs",
                              isAssignedByOwnerToMe
                                ? "border-amber-400 bg-amber-50/95 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/90 font-semibold"
                                : social
                                ? "bg-pink-50/80 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800 text-pink-900 dark:text-pink-200"
                                : isDone
                                ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 line-through"
                                : task.priority === "URGENT"
                                ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200"
                                : "bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 hover:border-[#4F46E5]"
                            )}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => handleToggleStatus(task.id, e)}
                                className={cn(
                                  "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                  isDone
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-slate-400 hover:border-[#4F46E5]"
                                )}
                              >
                                {isDone && <Check className="w-2.5 h-2.5" />}
                              </button>

                              <span className="truncate font-medium text-[11px] leading-tight flex items-center gap-1">
                                {isAssignedByOwnerToMe && (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">⭐</span>
                                )}
                                <span>{task.title}</span>
                              </span>
                            </div>

                            {/* Assignee Avatar with Assignment Traceability */}
                            {task.assignee?.user && (
                              <div
                                className={cn(
                                  "w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0",
                                  isAssignedByOwnerToMe
                                    ? "bg-amber-400 text-amber-950 shadow-2xs"
                                    : "bg-indigo-100 dark:bg-indigo-950 text-[#4F46E5]"
                                )}
                                title={`Assigned by ${task.creator?.name || "Mayank Parmar (Owner)"} → Assigned to ${task.assignee.user.name || task.assignee.user.email}${isAssignedByOwnerToMe ? " (You)" : ""}`}
                              >
                                {(task.assignee.user.name || task.assignee.user.email).slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Overflow badge if more than 3 tasks */}
                      {item.tasks.length > 3 && (
                        <div
                          onClick={() => {
                            setCurrentDate(item.date);
                            setViewMode("day");
                          }}
                          className="text-[10px] font-bold text-center text-[#4F46E5] hover:underline cursor-pointer py-0.5"
                        >
                          +{item.tasks.length - 3} more
                        </div>
                      )}
                    </div>

                    <div />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW: 7 Detailed Vertical Columns */}
        {viewMode === "week" && (
          <div className="grid grid-cols-7 divide-x divide-slate-200/80 dark:divide-slate-800 min-h-[450px]">
            {weekDays.map((col, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 space-y-2 flex flex-col",
                  col.isToday && "bg-indigo-50/20 dark:bg-indigo-950/20"
                )}
              >
                <div className="text-center pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="text-2xs font-bold text-slate-400 uppercase">
                    {col.date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={cn(
                      "w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold mt-1",
                      col.isToday ? "bg-[#4F46E5] text-white" : "text-slate-800 dark:text-slate-200"
                    )}
                  >
                    {col.date.getDate()}
                  </div>
                </div>

                {/* Day tasks in week column */}
                <div className="space-y-1.5 flex-1 overflow-y-auto">
                  {col.tasks.map((task) => {
                    const isAssignedByOwnerToMe =
                      (task.creator?.name?.toLowerCase().includes("mayank") ||
                        task.creator?.email?.toLowerCase().includes("mayank")) &&
                      task.assigneeId === currentMemberId;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer text-xs space-y-1 transition-all",
                          isAssignedByOwnerToMe
                            ? "border-amber-400 bg-amber-50/95 dark:bg-amber-950/60 ring-1 ring-amber-400 text-amber-950 dark:text-amber-100 font-semibold shadow-2xs"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-[#4F46E5]"
                        )}
                      >
                        <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1">
                          {isAssignedByOwnerToMe && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">⭐</span>
                          )}
                          <span>{task.title}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <TaskPriorityBadge priority={task.priority} />
                          {task.assignee?.user && (
                            <span
                              className={cn(
                                "font-medium",
                                isAssignedByOwnerToMe
                                  ? "text-amber-800 dark:text-amber-300 font-bold"
                                  : "text-slate-500"
                              )}
                            >
                              {task.assignee.user.name?.split(" ")[0]}
                              {isAssignedByOwnerToMe ? " (You)" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DAY VIEW: Focused Agenda */}
        {viewMode === "day" && (
          <div className="p-6 max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Schedule for {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <Badge variant="todo">
                {filteredTasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), currentDate)).length} items
              </Badge>
            </div>

            <div className="space-y-2">
              {filteredTasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), currentDate)).length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No tasks scheduled for this day</p>
                </div>
              ) : (
                filteredTasks
                  .filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), currentDate))
                  .map((task) => {
                    const isAssignedByOwnerToMe =
                      (task.creator?.name?.toLowerCase().includes("mayank") ||
                        task.creator?.email?.toLowerCase().includes("mayank")) &&
                      task.assigneeId === currentMemberId;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={cn(
                          "p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                          isAssignedByOwnerToMe
                            ? "border-amber-300 dark:border-amber-600 bg-gradient-to-r from-amber-50/90 via-indigo-50/40 to-surface dark:from-amber-950/30 dark:via-indigo-950/20 dark:to-surface ring-1 ring-amber-300 shadow-xs"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-[#4F46E5]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(task.id, e)}
                            className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0"
                          >
                            {(task.status === "DONE" || task.status === "CLOSED") && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                              {isAssignedByOwnerToMe && (
                                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 shrink-0 flex items-center gap-1 shadow-2xs">
                                  ⭐ Assigned to You by Mayank Parmar
                                </span>
                              )}
                            </div>
                            {task.description && <p className="text-xs text-slate-500">{task.description}</p>}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                              <span className="text-slate-400">Assigned by</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {task.creator?.name || "Mayank Parmar (Owner)"}
                              </span>
                              <span className="text-[#4F46E5] font-bold">&rarr;</span>
                              <span className="text-slate-400">To</span>
                              <span className="font-bold text-[#4F46E5] dark:text-indigo-400">
                                {task.assignee?.user ? (task.assignee.user.name || task.assignee.user.email) : "Unassigned"}
                                {isAssignedByOwnerToMe ? " (You)" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TaskPriorityBadge priority={task.priority} />
                          <TaskStatusBadge status={task.status} />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Social Media Post Modal (Creative Feature) */}
      {isSocialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-950 flex items-center justify-center text-pink-600">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Schedule Social Media Post
                  </h3>
                  <p className="text-xs text-slate-500">Plan and publish creative content on calendar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSocialModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSocialPost} className="space-y-3.5">
              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Platform
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: "Instagram", icon: InstagramIcon, color: "hover:border-pink-500" },
                    { name: "LinkedIn", icon: LinkedinIcon, color: "hover:border-blue-600" },
                    { name: "Twitter", icon: TwitterIcon, color: "hover:border-slate-600" },
                    { name: "YouTube", icon: YoutubeIcon, color: "hover:border-red-600" },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = socialPlatform === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSocialPlatform(p.name as any)}
                        className={cn(
                          "p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer",
                          isSelected
                            ? "border-[#4F46E5] bg-indigo-50 dark:bg-indigo-950 text-[#4F46E5]"
                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Post Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Post Title / Headline
                </label>
                <input
                  type="text"
                  value={socialTitle}
                  onChange={(e) => setSocialTitle(e.target.value)}
                  placeholder="e.g. Announcing our new Phase 04 release..."
                  required
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Post Caption & Hashtags
                </label>
                <textarea
                  rows={3}
                  value={socialCaption}
                  onChange={(e) => setSocialCaption(e.target.value)}
                  placeholder="Draft caption, hashtags, and links here..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              {/* Publish Date & Assignee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={socialDate}
                    onChange={(e) => setSocialDate(e.target.value)}
                    required
                    className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Content Creator
                  </label>
                  <select
                    value={socialAssigneeId}
                    onChange={(e) => setSocialAssigneeId(e.target.value)}
                    className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    {members
                      .filter(
                        (m) =>
                          m.role !== "OWNER" &&
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSocialModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !socialTitle.trim()}
                  className="bg-pink-600 hover:bg-pink-700 text-white font-semibold"
                >
                  {isPending ? "Scheduling..." : "Schedule Post"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-out Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          workspaceId={workspace.id}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onArchiveTask={handleArchiveTask}
          onSelectTask={(sub) => setSelectedTask(sub)}
        />
      )}
    </div>
  );
}
