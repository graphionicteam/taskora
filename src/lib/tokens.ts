// Taskora — Approved Design Tokens (Stage 01–12 Locked Reference)

export const TOKENS = {
  colors: {
    primary: {
      DEFAULT: "#4F46E5", // Core Refined Indigo
      hover: "#4338CA",
      light: "#EEF2FF",
      foreground: "#FFFFFF",
    },
    himi: {
      DEFAULT: "#8B5CF6", // Electric Violet
      lightText: "#6D28D9",
      darkAccent: "#A78BFA",
    },
    status: {
      todo: {
        label: "To Do",
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-300 dark:border-slate-700",
        hex: "#64748B",
      },
      inProgress: {
        label: "In Progress",
        bg: "bg-blue-50 dark:bg-blue-950/50",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-300 dark:border-blue-800",
        hex: "#3B82F6",
      },
      inReview: {
        label: "In Review",
        bg: "bg-amber-50 dark:bg-amber-950/50",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-300 dark:border-amber-800",
        hex: "#F59E0B",
      },
      done: {
        label: "Done",
        bg: "bg-emerald-50 dark:bg-emerald-950/50",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-300 dark:border-emerald-800",
        hex: "#10B981",
      },
      closed: {
        label: "Closed",
        bg: "bg-indigo-50 dark:bg-indigo-950/50",
        text: "text-indigo-700 dark:text-indigo-300",
        border: "border-indigo-300 dark:border-indigo-800",
        hex: "#6366F1",
      },
    },
    priority: {
      low: {
        label: "Low",
        text: "text-slate-600 dark:text-slate-400",
        bg: "bg-slate-100 dark:bg-slate-800",
        hex: "#64748B",
      },
      medium: {
        label: "Medium",
        text: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900/40",
        hex: "#3B82F6",
      },
      high: {
        label: "High",
        text: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-100 dark:bg-amber-900/40",
        hex: "#F59E0B",
      },
      urgent: {
        label: "Urgent",
        text: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-100 dark:bg-rose-900/40",
        hex: "#EF4444",
      },
    },
  },
  dimensions: {
    sidebar: {
      expanded: 248,
      collapsed: 72,
    },
    headerHeight: 64,
    taskRowHeight: 52,
    controlHeight: {
      sm: 32,
      md: 40, // Default interactive control height
      lg: 48,
    },
    touchTargetMin: 44, // 44–48 logical px
    maxContentWidth: 1600,
    contentPadding: {
      mobile: 16,
      tablet: 20,
      desktop: 24,
    },
    radii: {
      sm: "6px",
      md: "8px",
      lg: "12px", // Standard card radius
      xl: "16px",
      pill: "9999px",
    },
  },
} as const;

export type TaskStatus = keyof typeof TOKENS.colors.status;
export type TaskPriority = keyof typeof TOKENS.colors.priority;
