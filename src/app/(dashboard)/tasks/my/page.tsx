import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "My Tasks — Taskora",
  description: "Tasks assigned to the current user.",
};

export default function MyTasksPage() {
  return (
    <PlaceholderView
      title="My Tasks"
      section="Workspace"
      description="Personal task list view filtered by your assignments."
      phaseNote="List-first task interactions, status transitions, and contextual drawers are scheduled for Phase 04."
      badgeVariant="todo"
    />
  );
}
