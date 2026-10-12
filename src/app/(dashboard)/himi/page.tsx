import { Metadata } from "next";
import { PlaceholderView } from "@/components/layout/PlaceholderView";

export const metadata: Metadata = {
  title: "HIMI AI Companion — Taskora",
  description: "AI productivity assistant with explicit permission gating.",
};

export default function HimiPage() {
  return (
    <PlaceholderView
      title="HIMI AI"
      section="Collaboration"
      description="Context-aware AI productivity companion for drafting, proposals, and task queries."
      phaseNote="HIMI AI integration is a dedicated track scheduled after the 14 web phases and before Flutter. State mutations require explicit user confirmation."
      badgeVariant="inProgress"
    />
  );
}
