import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "Inbox & Collaboration — Taskora",
  description: "Direct messages, group discussions, and task notifications.",
};

export default function InboxPage() {
  return (
    <PlaceholderView
      title="Inbox"
      section="Collaboration"
      description="Direct messaging, team groups, and activity notifications."
      phaseNote="Real-time messaging, 15-minute edit windows, cloud attachments, and unified notifications are scheduled for Phase 09."
      badgeVariant="default"
    />
  );
}
