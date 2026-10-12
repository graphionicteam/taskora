import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "Projects — Taskora",
  description: "Workspace projects, milestones, and leaf progress.",
};

export default function ProjectsPage() {
  return (
    <PlaceholderView
      title="Projects"
      section="Workspace"
      description="Project containers, member assignments, and progress tracking."
      phaseNote="Project lifecycle (Planned/Active/On Hold/Completed/Archived) and leaf completion formulas are scheduled for Phase 06."
      badgeVariant="todo"
    />
  );
}
