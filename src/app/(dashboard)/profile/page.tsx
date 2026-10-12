import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "User Profile — Taskora",
  description: "Personal profile, credentials, and notification preferences.",
};

export default function ProfilePage() {
  return (
    <PlaceholderView
      title="Profile"
      section="Account"
      description="Personal details, notification settings, and appearance preferences."
      phaseNote="User profile management and personal notification preferences are scheduled for Phase 02 & 12."
      badgeVariant="default"
    />
  );
}
