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
      description="Personal action-first dashboard and priority queue."
      phaseNote="Action-first KPIs (My Active, Due Today, Overdue, Completed This Week) and priority lists are scheduled for Phase 10 implementation."
      badgeVariant="inProgress"
    />
  );
}
