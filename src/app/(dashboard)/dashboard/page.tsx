import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveWorkspaceContext, getWorkspaceActiveMembers } from "@/lib/workspace";
import { DashboardCalendarView } from "@/components/dashboard/DashboardCalendarView";
import { TaskItemData } from "@/components/tasks/TaskRow";
import { calculateLeafProgress } from "@/lib/tasks";
import { Card } from "@/components/ui/Card";
import { Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard — Taskora",
  description: "Full calendar schedule, team assignments, and task management.",
};

export default async function DashboardPage() {
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
            Please select or create an active workspace to view your calendar and tasks.
          </p>
        </Card>
      </div>
    );
  }

  // Fetch all active workspace tasks
  const tasks = await db.task.findMany({
    where: {
      workspaceId: wsContext.workspace.id,
      isArchived: false,
    },
    include: {
      assignee: {
        select: {
          id: true,
          role: true,
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
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      children: {
        where: { isArchived: false },
        include: {
          assignee: {
            select: {
              id: true,
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Calculate leaf task progress for each task and retain subtasks
  const initialTasks: TaskItemData[] = tasks.map((task) => {
    const leafProgress = calculateLeafProgress(task);
    return {
      ...task,
      leafProgress,
      children: (task.children as unknown as TaskItemData[]) || [],
    };
  });

  // Fetch active workspace members from memory cache
  const members = await getWorkspaceActiveMembers(wsContext.workspace.id);

  return (
    <DashboardCalendarView
      initialTasks={initialTasks}
      workspace={{
        id: wsContext.workspace.id,
        name: wsContext.workspace.name,
      }}
      members={members}
      currentMemberId={wsContext.member.id}
      currentUserName={session.user.name || session.user.email?.split("@")[0] || "User"}
    />
  );
}
