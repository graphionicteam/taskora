import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { ShellContainer } from "@/components/layout/ShellContainer";
import { getActiveWorkspaceContext, getUserWorkspaces, getWorkspaceActiveMembers } from "@/lib/workspace";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  // Authoritative server-side check: enforce authentication
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Resolve active workspace context and all workspaces for this user in parallel
  const [wsContext, userWorkspaces] = await Promise.all([
    getActiveWorkspaceContext(session.user.id),
    getUserWorkspaces(session.user.id),
  ]);

  // Fetch active members for active workspace using memoized cache
  const workspaceMembers = wsContext?.workspace
    ? await getWorkspaceActiveMembers(wsContext.workspace.id)
    : [];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Global 64px Header */}
        <Header
          user={session.user}
          activeWorkspace={
            wsContext?.workspace
              ? {
                  id: wsContext.workspace.id,
                  name: wsContext.workspace.name,
                  slug: wsContext.workspace.slug,
                }
              : null
          }
          workspaces={userWorkspaces}
          members={workspaceMembers}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
          <ShellContainer>{children}</ShellContainer>
        </main>
      </div>

      {/* Mobile 5-Tab Bar (Touch-first, <768px) */}
      <MobileTabBar />
    </div>
  );
}
