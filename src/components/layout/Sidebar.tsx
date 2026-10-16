"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  ListTodo,
  FolderKanban,
  QrCode,
  Inbox,
  Users,
  Sparkles,
  BarChart3,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  X,
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
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Attendance", href: "/attendance", icon: QrCode },
      { title: "My Tasks", href: "/tasks/my", icon: CheckSquare },
      { title: "All Tasks", href: "/tasks", icon: ListTodo },
      { title: "Projects & Budgets", href: "/projects", icon: FolderKanban },
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

function subscribeToDesktop(callback: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function getDesktopServerSnapshot() {
  return false;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const isDesktop = useSyncExternalStore(
    subscribeToDesktop,
    getDesktopSnapshot,
    getDesktopServerSnapshot
  );
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [tabletDrawerOpen, setTabletDrawerOpen] = useState(false);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && tabletDrawerOpen) {
        setTabletDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabletDrawerOpen]);

  const isDrawerVisible = !isDesktop && tabletDrawerOpen;

  // Determine whether the in-flow sidebar is collapsed
  // On desktop (>=1024px): depends on desktopCollapsed state
  // On tablet (768px-1023px): in-flow sidebar is always the compact rail (72px)
  const isCollapsed = isDesktop ? desktopCollapsed : true;

  const handleToggle = () => {
    if (isDesktop) {
      setDesktopCollapsed((prev) => !prev);
    } else {
      setTabletDrawerOpen(true);
    }
  };

  const renderNavList = (collapsed: boolean, onItemClick?: () => void) => (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            {!collapsed && (
              <h2 className="px-3 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 select-none uppercase">
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
                    prefetch={true}
                    onClick={onItemClick}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors relative min-h-[40px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5]",
                      collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
                      isActive
                        ? item.isHimi
                          ? "bg-purple-50/90 text-[#6D28D9] font-semibold dark:bg-purple-950/60 dark:text-[#A78BFA]"
                          : "bg-indigo-50/90 text-[#4F46E5] font-semibold dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 shrink-0 transition-colors",
                        isActive
                          ? item.isHimi
                            ? "text-[#8B5CF6]"
                            : "text-[#4F46E5] dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400"
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

      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-0.5">
        {FOOTER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={onItemClick}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors min-h-[40px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5]",
                collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
                isActive
                  ? "bg-indigo-50/90 text-[#4F46E5] font-semibold dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive
                    ? "text-[#4F46E5] dark:text-indigo-400"
                    : "text-slate-500 dark:text-slate-400"
                )}
              />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* Primary In-Flow Navigation:
          - Hidden on Mobile (<768px)
          - Compact Rail (72px) on Tablet (768px–1023px)
          - Collapsible Sidebar (248px / 72px) on Desktop (>=1024px)
      */}
      <aside
        aria-label="Navigation sidebar"
        className={cn(
          "hidden md:flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-200/80 dark:border-slate-800 bg-surface z-30 transition-[width] duration-180 ease-[cubic-bezier(0.2,0,0,1)]",
          isCollapsed ? "w-[72px]" : "w-[248px]"
        )}
      >
        {/* Header / Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5] rounded-md p-1"
          >
            <TaskoraLogo collapsed={isCollapsed} />
          </Link>
          <button
            type="button"
            onClick={handleToggle}
            aria-label={
              isDesktop
                ? isCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
                : "Open navigation drawer"
            }
            title={
              isDesktop
                ? isCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
                : "Open navigation drawer"
            }
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
          >
            {isDesktop ? (
              isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {renderNavList(isCollapsed)}
      </aside>

      {/* Adaptive Drawer for Tablet (768px–1023px) */}
      {isDrawerVisible && (
        <div className="fixed inset-0 z-50 lg:hidden" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setTabletDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            aria-label="Tablet navigation drawer"
            className="fixed inset-y-0 left-0 w-[248px] bg-surface flex flex-col z-50 shadow-2xl border-r border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-left duration-200 ease-out"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
              <Link
                href="/dashboard"
                onClick={() => setTabletDrawerOpen(false)}
                className="flex items-center gap-2.5 p-1"
              >
                <TaskoraLogo collapsed={false} />
              </Link>
              <button
                type="button"
                onClick={() => setTabletDrawerOpen(false)}
                aria-label="Close navigation drawer"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderNavList(false, () => setTabletDrawerOpen(false))}
          </aside>
        </div>
      )}
    </>
  );
};
