import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "Team Directory — Taskora",
  description: "Workspace members, designations, and permission roles.",
};

export default function TeamPage() {
  return (
    <PlaceholderView
      title="Team"
      section="Collaboration"
      description="Member directory with explicit separation of designations from permission roles."
      phaseNote="Workspace member management, designation labels, and access roles are scheduled for Phase 03."
      badgeVariant="default"
    />
  );
}
