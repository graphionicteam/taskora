import React from "react";
import { cn } from "@/lib/utils";

interface TaskoraLogoProps {
  collapsed?: boolean;
  className?: string;
}

export const TaskoraLogo: React.FC<TaskoraLogoProps> = ({
  collapsed = false,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* A1 Interlocking Layers mark — Solid flat 2D #4F46E5 */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="13"
          height="13"
          rx="3.5"
          fill="#4F46E5"
        />
        <rect
          x="12"
          y="12"
          width="13"
          height="13"
          rx="3.5"
          fill="#4F46E5"
          fillOpacity="0.82"
        />
        <rect
          x="12"
          y="3"
          width="13"
          height="13"
          rx="3.5"
          stroke="#4F46E5"
          strokeWidth="2"
        />
      </svg>

      {!collapsed && (
        <span className="font-semibold text-lg tracking-tight text-slate-900 dark:text-white transition-opacity duration-150">
          Taskora
        </span>
      )}
    </div>
  );
};
