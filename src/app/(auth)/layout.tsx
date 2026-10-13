import React from "react";
import Link from "next/link";
import { TaskoraLogo } from "@/components/layout/TaskoraLogo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-950 text-foreground">
      {/* Brand Header */}
      <div className="mb-6 select-none">
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5] rounded-lg p-1"
        >
          <TaskoraLogo collapsed={false} />
        </Link>
      </div>

      {/* Auth Card Container */}
      <main className="w-full max-w-[420px]">{children}</main>

      {/* Footer / Privacy note */}
      <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
        <p>Taskora Productivity Platform • Phase 02 Secure Identity</p>
      </footer>
    </div>
  );
}
