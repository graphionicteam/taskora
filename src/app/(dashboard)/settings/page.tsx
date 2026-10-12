import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "Workspace Settings — Taskora",
  description: "Workspace configuration, member roles, and preferences.",
};

export default function SettingsPage() {
  return (
    <PlaceholderView
      title="Settings"
      section="Administration"
      description="Workspace profile, preferences, and organization settings."
      phaseNote="Workspace settings, timezone definitions, and security preferences are scheduled for Phase 12."
      badgeVariant="default"
    />
  );
}
