"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Plus, CheckCheck, CheckSquare, MapPin, Sparkles } from "lucide-react";
import { TaskoraLogo } from "./TaskoraLogo";
import { Button } from "@/components/ui/Button";
import { WorkspaceRole } from "@prisma/client";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: {
    user: {
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
  } | null;
}

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  currentMemberId?: string | null;
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
  currentMemberId: propMemberId,
  workspaces = [],
  members = [],
}) => {
  const router = useRouter();
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const matchedMember = members.find(
    (m) => m.user.email?.toLowerCase() === user?.email?.toLowerCase()
  );
  const currentMemberId = propMemberId || matchedMember?.id;

  // Fetch notifications
  useEffect(() => {
    if (!activeWorkspace?.id || !currentMemberId) return;

    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        const res = await fetch(
          `/api/v1/notifications?workspaceId=${activeWorkspace.id}&memberId=${currentMemberId}`, { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.notifications) {
            setNotifications(data.notifications);
          }
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // 5s auto-refresh

    const onRefresh = () => {
      fetchNotifications();
    };
    window.addEventListener("taskora:refresh-notifications", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("taskora:refresh-notifications", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, [activeWorkspace?.id, currentMemberId]);

  // Click outside to close notification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen]);

  const handleMarkAsRead = async (id: string, link: string | null) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch (err) {
      console.error(err);
    }
    const notifItem = notifications.find((n) => n.id === id);
    const destination = link || (notifItem?.type === "TASK_ASSIGNED" ? "/tasks" : null);

    if (destination) {
      setIsNotificationsOpen(false);
      router.push(destination);
    }
  };

  const handleMarkAllRead = async () => {
    if (!activeWorkspace?.id || !currentMemberId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markAll: true,
          workspaceId: activeWorkspace.id,
          memberId: currentMemberId,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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

  // Filter out Mayank Parmar (OWNER) so employees cannot assign tasks to the owner
  const assignableMembers = members.filter(
    (m) => m.role !== "OWNER" && !m.user.name?.toLowerCase().includes("mayank")
  );

  return (
    <>
      <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-surface/95 backdrop-blur-xs sticky top-0 z-40 px-3 sm:px-4 md:px-6 flex items-center justify-between w-full max-w-full">
        {/* Brand & Workspace Switcher & Global Search */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0 max-w-lg">
          <div className="md:hidden shrink-0">
            <Link href="/dashboard" aria-label="Taskora home">
              <TaskoraLogo collapsed={true} />
            </Link>
          </div>

          {/* Global Search Bar (hidden on <sm to prevent header blowouts on mobile) */}
          <div className="relative flex-1 min-w-0 max-w-[280px] md:max-w-md hidden sm:block">
            <button
              type="button"
              className="w-full h-9 md:h-10 pl-8 md:pl-9 pr-3 md:pr-4 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs md:text-sm text-slate-600 dark:text-slate-300 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
              aria-label="Search tasks, projects, members (Ctrl+K)"
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 dark:text-slate-400 absolute left-2.5 md:left-3" />
                <span className="hidden md:inline">Search tasks, projects...</span>
                <span className="md:hidden truncate">Search...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0 ml-1 sm:ml-2">
          {/* Quick Create Action - Single responsive button */}
          <button
            type="button"
            onClick={() => setIsNewTaskOpen(true)}
            aria-label="Create new task"
            className="h-9 px-2.5 sm:px-3.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">New Task</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              aria-label="View notifications"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white relative cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5] transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-md animate-pulse z-10">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
              )}
            </button>

            {/* Notification Popover Panel */}
            {isNotificationsOpen && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-16px)] sm:w-96 max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3.5 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] dark:text-indigo-400 cursor-pointer flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-medium">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id, n.link)}
                        className={`p-3.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex gap-3 items-start ${
                          !n.isRead ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        <span className="mt-0.5 p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-[#4F46E5] dark:text-indigo-300 shrink-0">
                          {n.type === "TASK_ASSIGNED" ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : n.type === "ATTENDANCE_VERIFIED" ? (
                            <MapPin className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-[#4F46E5] shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {n.content}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50/80 dark:bg-slate-850/80 border-t border-slate-100 dark:border-slate-800 text-center">
                  <Link
                    href="/inbox"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline block py-0.5"
                  >
                    View all notifications in Inbox &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

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

      {/* Global New Task Modal (Mayank Parmar excluded from assignees) */}
      {activeWorkspace && (
        <NewTaskModal
          isOpen={isNewTaskOpen}
          onClose={() => setIsNewTaskOpen(false)}
          workspaceId={activeWorkspace.id}
          members={assignableMembers}
        />
      )}
    </>
  );
};
