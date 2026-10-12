import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "All Tasks — Taskora",
  description: "Workspace-wide task list and tree view.",
};

export default function AllTasksPage() {
  return (
    <PlaceholderView
      title="All Tasks"
      section="Workspace"
      description="Full workspace task view with unlimited nesting and hierarchy navigation."
      phaseNote="Unlimited subtasks, strict hierarchical parent completion, and leaf-based progress calculations are scheduled for Phase 04–05."
      badgeVariant="todo"
    />
  );
}
