import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8 px-3 text-xs gap-1.5 min-h-[32px]",
      md: "h-10 px-4 text-sm gap-2 min-h-[40px]", // Default 40px control target
      lg: "h-12 px-5 text-base gap-2.5 min-h-[48px]",
    }[size];

    const variantClasses = {
      primary:
        "bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xs focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400",
      outline:
        "border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-slate-400",
      ghost:
        "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-slate-400",
      destructive:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-rose-500/40",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none outline-hidden focus-visible:ring-offset-2",
          sizeClasses,
          variantClasses,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
