import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface PlaceholderViewProps {
  title: string;
  section: string;
  description: string;
  phaseNote: string;
  badgeVariant?: "default" | "todo" | "inProgress" | "closed";
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  title,
  section,
  description,
  phaseNote,
  badgeVariant = "default",
}) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              {section}
            </span>
            <Badge variant={badgeVariant}>Shell Ready</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {description}
          </p>
        </div>
      </div>

      {/* Placeholder Boundary Card */}
      <Card className="flex flex-col items-center justify-center text-center py-16 px-6 border-dashed border-2">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-[#4F46E5] dark:text-indigo-400 mb-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
          {title} Application Shell
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-4">
          {phaseNote}
        </p>
        <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-mono">
          Phase 01 Scaffold Verified
        </span>
      </Card>
    </div>
  );
};
