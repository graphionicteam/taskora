import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveWorkspaceContext } from "@/lib/workspace";
import {
  getOfficeConfig,
  recordAttendance,
  getWorkspaceAttendance,
  getAttendanceHistory,
} from "@/server/actions/attendance.actions";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    const wsContext = await getActiveWorkspaceContext(session.user.id, workspaceIdParam || undefined);
    if (!wsContext) {
      return NextResponse.json({ error: "Workspace context not found" }, { status: 404 });
    }

    const workspaceId = wsContext.workspace.id;
    const [office, todayRecords, history] = await Promise.all([
      getOfficeConfig(workspaceId),
      getWorkspaceAttendance(workspaceId),
      getAttendanceHistory(workspaceId, 20),
    ]);

    return NextResponse.json({
      office,
      records: todayRecords,
      history,
      currentMemberId: wsContext.member.id,
    });
  } catch (error) {
    console.error("Attendance API error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, latitude, longitude, action, notes } = body;

    const wsContext = await getActiveWorkspaceContext(session.user.id, workspaceId || undefined);
    if (!wsContext) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const result = await recordAttendance({
      workspaceId: wsContext.workspace.id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      action: action === "CHECK_OUT" ? "CHECK_OUT" : "CHECK_IN",
      notes: notes || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Punch API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record punch" },
      { status: 400 }
    );
  }
}
