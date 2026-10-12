import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  hoverable = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "bg-surface border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors",
        hoverable && "hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
