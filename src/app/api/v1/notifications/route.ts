import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/server/actions/inbox.actions";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const memberId = searchParams.get("memberId");

    if (!workspaceId || !memberId) {
      return NextResponse.json({ error: "workspaceId and memberId are required" }, { status: 400 });
    }

    const notifications = await db.notification.findMany({
      where: {
        workspaceId,
        recipientId: memberId,
      },
      include: {
        actor: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, markAll, workspaceId, memberId } = body;

    if (markAll && workspaceId && memberId) {
      await markAllNotificationsAsRead(workspaceId, memberId);
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (notificationId) {
      await markNotificationAsRead(notificationId);
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    }

    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
