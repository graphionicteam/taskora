import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveWorkspaceContext } from "@/lib/workspace";
import {
  getOfficeConfig,
  generateDailyOfficeQr,
  getWorkspaceAttendance,
} from "@/server/actions/attendance.actions";
import { AttendanceView } from "@/components/attendance/AttendanceView";

export const metadata: Metadata = {
  title: "Office Attendance & Geofence — Taskora",
  description: "Daily office QR code punch in/out with 100-meter GPS proximity verification.",
};

export default async function AttendancePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const wsContext = await getActiveWorkspaceContext(session.user.id);
  if (!wsContext) {
    redirect("/dashboard");
  }

  const today = new Date().toISOString().split("T")[0];
  const [qrData, records] = await Promise.all([
    generateDailyOfficeQr(wsContext.workspace.id),
    getWorkspaceAttendance(wsContext.workspace.id, today),
  ]);
  const office = qrData.office;

  return (
    <AttendanceView
      workspace={{
        id: wsContext.workspace.id,
        name: wsContext.workspace.name,
        slug: wsContext.workspace.slug,
      }}
      office={{
        id: office.id,
        name: office.name,
        latitude: office.latitude,
        longitude: office.longitude,
        radiusMeters: office.radiusMeters,
        qrSecret: office.qrSecret,
      }}
      qrDataUrl={qrData.qrDataUrl}
      todayDate={today}
      currentUserMemberId={wsContext.member.id}
      currentUserName={session.user.name || session.user.email?.split("@")[0] || "User"}
      currentUserRole={wsContext.role}
      records={records}
    />
  );
}
