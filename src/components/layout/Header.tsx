"use client";

import React from "react";
import Link from "next/link";
import { Search, Bell, Plus } from "lucide-react";
import { TaskoraLogo } from "./TaskoraLogo";
import { Button } from "@/components/ui/Button";

export const Header: React.FC = () => {
  return (
    <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-surface/95 backdrop-blur-xs sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
      {/* Mobile Brand & Global Search */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-md">
        <div className="md:hidden">
          <Link href="/dashboard" aria-label="Taskora home">
            <TaskoraLogo collapsed={true} />
          </Link>
        </div>

        {/* Global Search Bar (Stage 06 Placeholder) */}
        <div className="relative w-full">
          <button
            type="button"
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-sm text-slate-500 dark:text-slate-400 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            aria-label="Search tasks, projects, members (Ctrl+K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3" />
              <span className="hidden sm:inline">Search tasks, projects...</span>
              <span className="sm:hidden">Search...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3 ml-3">
        {/* Quick Create (Stage 08 Title-First Placeholder) */}
        <Button
          size="md"
          variant="primary"
          className="hidden sm:inline-flex"
          aria-label="Create new task"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </Button>
        <button
          type="button"
          aria-label="Create new task"
          className="sm:hidden p-2 rounded-lg bg-[#4F46E5] text-white cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="View notifications"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 relative cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
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
          <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 border border-[#4F46E5]/20 flex items-center justify-center text-xs font-semibold text-[#4F46E5]">
            TA
          </div>
          <div className="hidden lg:block text-left text-xs leading-tight">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Workspace Member</p>
            <p className="text-slate-400 dark:text-slate-500">Designation</p>
          </div>
        </Link>
      </div>
    </header>
  );
};
