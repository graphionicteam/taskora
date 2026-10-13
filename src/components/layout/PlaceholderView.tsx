import React from "react";
import { Card } from "@/components/ui/Card";

interface PlaceholderViewProps {
  title: string;
  section: string;
  description: string;
  emptyTitle?: string;
  emptyDescription?: string;
  phaseNote?: string;
  badgeVariant?: "default" | "todo" | "inProgress" | "closed";
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  title,
  section,
  description,
  emptyTitle,
  emptyDescription,
}) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none mb-1 block">
            {section}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {description}
          </p>
        </div>
      </div>

      {/* Clean Intentional Empty State Card */}
      <Card className="flex flex-col items-center justify-center text-center py-16 px-6 border border-slate-200/90 dark:border-slate-800 rounded-xl bg-surface shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-[#4F46E5] dark:text-indigo-400 mb-4 shadow-2xs">
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
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
          {emptyTitle || `Welcome to ${title}`}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
          {emptyDescription || "This section is ready for your team's workflow and will populate as items are created."}
        </p>
      </Card>
    </div>
  );
};
