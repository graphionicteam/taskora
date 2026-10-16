import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getConversationMessages, sendChatMessage } from "@/server/actions/inbox.actions";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const messages = await getConversationMessages(conversationId);
    return NextResponse.json({ success: true, messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, content, taskId } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "conversationId and content are required" },
        { status: 400 }
      );
    }

    const result = await sendChatMessage({
      conversationId,
      content,
      taskId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
