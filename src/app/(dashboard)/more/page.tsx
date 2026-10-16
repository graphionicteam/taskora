import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  Sparkles,
  BarChart3,
  Settings,
  User,
  ChevronRight,
  QrCode,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "More Navigation — Taskora",
  description: "Access team, HIMI AI, reports, settings, and profile.",
};

interface MoreItem {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isHimi?: boolean;
}

const MORE_LINKS: MoreItem[] = [
  {
    title: "Office Attendance & Geofence",
    subtitle: "Daily QR code check-in & 100m proximity",
    href: "/attendance",
    icon: QrCode,
  },
  {
    title: "Team Directory",
    subtitle: "Members, designations, and permissions",
    href: "/team",
    icon: Users,
  },
  {
    title: "HIMI AI Companion",
    subtitle: "Context-aware AI productivity assistant",
    href: "/himi",
    icon: Sparkles,
    isHimi: true,
  },
  {
    title: "Reports & Insights",
    subtitle: "Task, project, and team metric summaries",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "Workspace Settings",
    subtitle: "Preferences, timezones, and configurations",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "User Profile",
    subtitle: "Personal account, credentials, and theme",
    href: "/profile",
    icon: User,
  },
];

export default function MorePage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Navigation
          </span>
          <Badge variant="default">Mobile Hub</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          More Options
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Access workspace collaboration, insights, and account preferences.
        </p>
      </div>

      {/* Navigation Links List */}
      <div className="space-y-2.5">
        {MORE_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5] rounded-xl"
            >
              <Card
                hoverable
                className="flex items-center justify-between p-4 min-h-[56px] transition-all group-hover:border-indigo-200 dark:group-hover:border-indigo-900/60"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      item.isHimi
                        ? "bg-purple-100 text-[#6D28D9] dark:bg-purple-950/60 dark:text-[#A78BFA]"
                        : "bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/50 dark:text-indigo-400 group-hover:bg-[#4F46E5] group-hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#4F46E5] dark:group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </span>
                      {item.isHimi && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-[#6D28D9] dark:text-[#A78BFA] border border-purple-200 dark:border-purple-800">
                          AI
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-[#4F46E5] dark:group-hover:text-indigo-300 transition-transform group-hover:translate-x-0.5" />
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Touch-First Note */}
      <div className="pt-2 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Comfortable Touch-First Navigation • Taskora Stage 06 & 11
        </p>
      </div>
    </div>
  );
}
