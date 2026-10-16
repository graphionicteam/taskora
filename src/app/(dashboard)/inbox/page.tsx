import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveWorkspaceContext } from "@/lib/workspace";
import { getInboxData } from "@/server/actions/inbox.actions";
import { InboxView } from "@/components/inbox/InboxView";

export const metadata: Metadata = {
  title: "Inbox, Chat & Collaboration — Taskora",
  description: "One-to-one and team chat, multi-task dispatching, and owner notifications.",
};

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const wsContext = await getActiveWorkspaceContext(session.user.id);
  if (!wsContext) {
    redirect("/dashboard");
  }

  const inboxData = await getInboxData(wsContext.workspace.id);

  return (
    <InboxView
      workspace={{
        id: wsContext.workspace.id,
        name: wsContext.workspace.name,
        slug: wsContext.workspace.slug,
      }}
      currentMemberId={inboxData.currentMemberId}
      currentUserName={session.user.name || session.user.email?.split("@")[0] || "User"}
      currentUserRole={inboxData.currentUserRole}
      ownerMemberId={inboxData.ownerMemberId}
      ownerName={inboxData.ownerName}
      initialConversations={inboxData.conversations as any}
      members={inboxData.members as any}
      initialNotifications={inboxData.notifications as any}
    />
  );
}
