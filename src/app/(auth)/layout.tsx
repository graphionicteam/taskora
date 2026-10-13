import React from "react";
import Link from "next/link";
import { TaskoraLogo } from "@/components/layout/TaskoraLogo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-background text-foreground">
      {/* Brand Header */}
      <div className="mb-8 select-none">
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5] rounded-lg p-1 transition-opacity hover:opacity-90"
          aria-label="Taskora Home"
        >
          <TaskoraLogo collapsed={false} />
        </Link>
      </div>

      {/* Auth Card Container */}
      <main className="w-full max-w-[420px]">{children}</main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 select-none">
        <p>Taskora Productivity Platform</p>
      </footer>
    </div>
  );
}
