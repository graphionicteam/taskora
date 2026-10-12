import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "Reports & Insights — Taskora",
  description: "Task, project, and team reporting metrics.",
};

export default function ReportsPage() {
  return (
    <PlaceholderView
      title="Reports"
      section="Insights"
      description="Visual reporting across Tasks, Projects, and Team workloads."
      phaseNote="Visual reporting with leaf-based completion formulas and historical completion trends is scheduled for Phase 10."
      badgeVariant="default"
    />
  );
}
