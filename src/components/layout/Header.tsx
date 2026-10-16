"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Bell, Plus } from "lucide-react";
import { TaskoraLogo } from "./TaskoraLogo";
import { Button } from "@/components/ui/Button";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceRole } from "@prisma/client";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  activeWorkspace?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  workspaces?: Array<{
    workspace: {
      id: string;
      name: string;
      slug: string;
    };
    role: WorkspaceRole;
  }>;
  members?: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
    designation?: {
      name: string;
    } | null;
  }>;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeWorkspace,
  workspaces = [],
  members = [],
}) => {
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const getInitials = (name?: string | null, email?: string | null): string => {
    if (name) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2 && parts[0]?.[0] && parts[parts.length - 1]?.[0]) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase() || "TA";
    }
    if (email) {
      return email.slice(0, 2).toUpperCase() || "TA";
    }
    return "TA";
  };

  const initials = getInitials(user?.name, user?.email);
  const displayName = user?.name || user?.email || "Workspace Member";
  const displaySub = user?.email || "Member";

  return (
    <>
      <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-surface/95 backdrop-blur-xs sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
        {/* Brand & Workspace Switcher & Global Search */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-lg">
          <div className="md:hidden">
            <Link href="/dashboard" aria-label="Taskora home">
              <TaskoraLogo collapsed={true} />
            </Link>
          </div>

          {/* Workspace Switcher */}
          {activeWorkspace && (
            <div className="shrink-0">
              <WorkspaceSwitcher
                activeWorkspace={activeWorkspace}
                workspaces={workspaces}
              />
            </div>
          )}

          {/* Global Search Bar (Stage 06 Placeholder) */}
          <div className="relative w-full">
            <button
              type="button"
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
              aria-label="Search tasks, projects, members (Ctrl+K)"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3" />
                <span className="hidden sm:inline">Search tasks, projects...</span>
                <span className="sm:hidden">Search...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-3">
          {/* Quick Create Action */}
          <Button
            size="md"
            variant="primary"
            onClick={() => setIsNewTaskOpen(true)}
            className="hidden sm:inline-flex font-semibold shadow-xs"
            aria-label="Create new task"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </Button>
          <button
            type="button"
            onClick={() => setIsNewTaskOpen(true)}
            aria-label="Create new task"
            className="sm:hidden p-2 rounded-lg bg-[#4F46E5] text-white cursor-pointer hover:bg-[#4338CA] transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button
            type="button"
            aria-label="View notifications"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white relative cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5] transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#4F46E5]" />
          </button>

          {/* User Identity Avatar */}
          <Link
            href="/profile"
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            aria-label="User profile"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/70 dark:border-indigo-800 flex items-center justify-center text-xs font-bold text-[#4F46E5] dark:text-indigo-300 shrink-0">
              {initials}
            </div>
            <div className="hidden lg:block text-left text-xs leading-tight max-w-[140px] truncate">
              <p className="font-semibold text-slate-900 dark:text-white truncate">{displayName}</p>
              <p className="text-slate-500 dark:text-slate-400 truncate">{displaySub}</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Global New Task Modal */}
      {activeWorkspace && (
        <NewTaskModal
          isOpen={isNewTaskOpen}
          onClose={() => setIsNewTaskOpen(false)}
          workspaceId={activeWorkspace.id}
          members={members}
        />
      )}
    </>
  );
};
