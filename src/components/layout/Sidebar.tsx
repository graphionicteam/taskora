"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  ListTodo,
  FolderKanban,
  Inbox,
  Users,
  Sparkles,
  BarChart3,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TaskoraLogo } from "./TaskoraLogo";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isHimi?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "WORKSPACE",
    items: [
      { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { title: "My Tasks", href: "/tasks/my", icon: CheckSquare },
      { title: "All Tasks", href: "/tasks", icon: ListTodo },
      { title: "Projects", href: "/projects", icon: FolderKanban },
    ],
  },
  {
    group: "COLLABORATION",
    items: [
      { title: "Inbox", href: "/inbox", icon: Inbox },
      { title: "Team", href: "/team", icon: Users },
      { title: "HIMI AI", href: "/himi", icon: Sparkles, isHimi: true },
    ],
  },
  {
    group: "INSIGHTS",
    items: [{ title: "Reports", href: "/reports", icon: BarChart3 }],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Profile", href: "/profile", icon: User },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="Sidebar navigation"
      className={cn(
        "hidden md:flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-200/80 dark:border-slate-800 bg-surface z-30 transition-[width] duration-180 ease-[cubic-bezier(0.2,0,0,1)]",
        collapsed ? "w-[72px]" : "w-[248px]"
      )}
    >
      {/* Header / Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5] rounded-md p-1"
        >
          <TaskoraLogo collapsed={collapsed} />
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            {!collapsed && (
              <h2 className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 select-none uppercase">
                {group.group}
              </h2>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors relative min-h-[40px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5]",
                      collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
                      isActive
                        ? item.isHimi
                          ? "bg-purple-50 text-[#6D28D9] dark:bg-purple-950/40 dark:text-[#A78BFA]"
                          : "bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 shrink-0",
                        isActive
                          ? item.isHimi
                            ? "text-[#8B5CF6]"
                            : "text-[#4F46E5] dark:text-indigo-400"
                          : "text-slate-400 dark:text-slate-500"
                      )}
                    />
                    {!collapsed && <span>{item.title}</span>}
                    {isActive && (
                      <span
                        className={cn(
                          "absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full",
                          item.isHimi ? "bg-[#8B5CF6]" : "bg-[#4F46E5]"
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer / Account & Settings */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-0.5">
        {FOOTER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors min-h-[40px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5]",
                collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
                isActive
                  ? "bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <Icon className="w-5 h-5 shrink-0 text-slate-400 dark:text-slate-500" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
};
