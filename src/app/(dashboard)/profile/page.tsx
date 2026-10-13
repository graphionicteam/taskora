import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LogoutButton } from "./LogoutButton";

export const metadata: Metadata = {
  title: "User Profile — Taskora",
  description: "View and manage your authenticated Taskora user account.",
};

export default async function ProfilePage() {
  const session = await auth();

  // Authoritative server-side authentication check
  if (!session?.user) {
    redirect("/login");
  }

  let userRecord = null;
  if (process.env.DATABASE_URL && session.user.id) {
    try {
      userRecord = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.warn("Could not query user in ProfilePage:", error);
    }
  }

  const displayName = userRecord?.name || session.user.name || "Workspace Member";
  const displayEmail = userRecord?.email || session.user.email || "No email available";
  const userId = userRecord?.id || session.user.id || "Session ID";
  const joinedDate = userRecord?.createdAt
    ? new Date(userRecord.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Active Session";

  const getInitials = (str: string) => {
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(displayName);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Account
            </span>
            <Badge variant="done">Authenticated</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Your personal identity on Taskora
          </p>
        </div>

        <LogoutButton />
      </div>

      {/* Profile Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-[#4F46E5]/10 border border-[#4F46E5]/20 flex items-center justify-center text-xl font-bold text-[#4F46E5] shadow-xs shrink-0">
            {initials}
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {displayName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
              {displayEmail}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                User ID: <code className="text-slate-600 dark:text-slate-400">{userId}</code>
              </span>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 dark:text-slate-500 block">
              Member Since
            </span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
              {joinedDate}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 dark:text-slate-500 block">
              Session Strategy
            </span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
              Stateless JWT (HttpOnly Cookie)
            </span>
          </div>
        </div>
      </Card>

      {/* Security & Token Revocation Disclosure */}
      <Card className="p-5 border-dashed bg-slate-50/50 dark:bg-slate-900/40">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          Session & Security Governance
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Taskora utilizes encrypted, signed <code className="text-slate-700 dark:text-slate-300">HttpOnly</code> session cookies designed for serverless execution. Logging out deletes the session cookie in your active browser. In accordance with stateless JWT architecture, tokens operate under designated rolling TTL expiration and are cryptographically verified per request.
        </p>
      </Card>
    </div>
  );
}
