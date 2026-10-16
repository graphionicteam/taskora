import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveWorkspaceContext, getWorkspaceActiveMembers } from "@/lib/workspace";
import { getProjectsWithFinancials } from "@/server/actions/project.actions";
import { ProjectsBudgetView } from "@/components/projects/ProjectsBudgetView";

export const metadata: Metadata = {
  title: "Projects & Budget Splitting — Taskora",
  description: "Multi-project tracking, budget allocation, company account splits, and team payouts.",
};

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const wsContext = await getActiveWorkspaceContext(session.user.id);
  if (!wsContext) {
    redirect("/dashboard");
  }

  const [{ projects, treasury }, members] = await Promise.all([
    getProjectsWithFinancials(wsContext.workspace.id),
    getWorkspaceActiveMembers(wsContext.workspace.id),
  ]);

  return (
    <ProjectsBudgetView
      workspace={{
        id: wsContext.workspace.id,
        name: wsContext.workspace.name,
        slug: wsContext.workspace.slug,
      }}
      initialProjects={projects}
      initialTreasury={treasury}
      members={members}
    />
  );
}
