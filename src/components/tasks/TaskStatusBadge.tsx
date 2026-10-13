import React from "react";
import { TaskStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  TODO: {
    label: "To Do",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-blue-50 dark:bg-blue-950/60",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-900",
  },
  IN_REVIEW: {
    label: "In Review",
    bg: "bg-amber-50 dark:bg-amber-950/60",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-900",
  },
  DONE: {
    label: "Done",
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-900",
  },
  CLOSED: {
    label: "Closed",
    bg: "bg-indigo-50 dark:bg-indigo-950/60",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-900",
  },
};

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.TODO;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border leading-4 select-none shrink-0",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full mr-1.5 shrink-0",
          status === "DONE"
            ? "bg-emerald-500"
            : status === "CLOSED"
            ? "bg-indigo-500"
            : status === "IN_PROGRESS"
            ? "bg-blue-500"
            : status === "IN_REVIEW"
            ? "bg-amber-500"
            : "bg-slate-400"
        )}
      />
      {config.label}
    </span>
  );
};
