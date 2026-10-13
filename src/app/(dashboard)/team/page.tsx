import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveWorkspaceContext } from "@/lib/workspace";
import { TeamDirectoryView } from "./TeamDirectoryView";
import { Card } from "@/components/ui/Card";
import { Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Team Directory — Taskora",
  description: "Workspace members, designations, and permission roles.",
};

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const wsContext = await getActiveWorkspaceContext(session.user.id);

  if (!wsContext) {
    return (
      <div className="py-8 max-w-xl mx-auto">
        <Card className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center mx-auto text-[#4F46E5]">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            No Active Workspace Found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You do not currently belong to an active workspace. Please create an initial workspace or request an invitation from your team administrator.
          </p>
        </Card>
      </div>
    );
  }

  // Fetch all members in this active workspace
  const members = await db.workspaceMember.findMany({
    where: {
      workspaceId: wsContext.workspace.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      designation: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { role: "asc" }, // Enum order
      { joinedAt: "asc" },
    ],
  });

  // Fetch all designations for this workspace
  const designations = await db.designation.findMany({
    where: {
      workspaceId: wsContext.workspace.id,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <TeamDirectoryView
      workspace={{
        id: wsContext.workspace.id,
        name: wsContext.workspace.name,
      }}
      currentMemberRole={wsContext.role}
      currentUserId={session.user.id}
      members={members}
      designations={designations}
    />
  );
}
