import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assignTaskFromInbox } from "@/server/actions/inbox.actions";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, title, description, priority, dueDate, assigneeMemberIds, conversationId } = body;

    if (!workspaceId || !title || !assigneeMemberIds || assigneeMemberIds.length === 0) {
      return NextResponse.json(
        { error: "workspaceId, title, and at least one assigneeMemberId are required" },
        { status: 400 }
      );
    }

    const result = await assignTaskFromInbox({
      workspaceId,
      title,
      description,
      priority,
      dueDate,
      assigneeMemberIds,
      conversationId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to assign task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
