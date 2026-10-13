import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "Dashboard Overview — Taskora",
  description: "Personal action-first productivity overview and KPI cards.",
};

export default function DashboardPage() {
  return (
    <PlaceholderView
      title="Overview"
      section="Workspace"
      description="Personal action-first productivity overview and priority queue."
      emptyTitle="Welcome to your Overview"
      emptyDescription="Your active priorities, tasks, and workspace updates will appear here as collaboration begins."
    />
  );
}
