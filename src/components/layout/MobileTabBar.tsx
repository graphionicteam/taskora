"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Inbox,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabItem[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Tasks", href: "/tasks/my", icon: CheckSquare },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Inbox", href: "/inbox", icon: Inbox },
  { title: "More", href: "/more", icon: Menu },
];

export const MobileTabBar: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-xs border-t border-slate-200/80 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-14 px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.title}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] transition-colors relative focus-visible:outline-hidden",
                isActive
                  ? "text-[#4F46E5] dark:text-indigo-400 font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{tab.title}</span>
              {isActive && (
                <span
                  className="absolute top-0 w-8 h-0.5 rounded-full bg-[#4F46E5]"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
