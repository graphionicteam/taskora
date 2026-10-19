import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPushNotificationToUser } from "@/lib/firebase/admin";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokens = await db.devicePushToken.findMany({
      where: { userId: session.user.id },
    });

    if (tokens.length === 0) {
      return NextResponse.json(
        {
          error: "No registered device found for this account. Please click 'Enable Push Notifications' on your phone/browser first.",
        },
        { status: 400 }
      );
    }

    const result = await sendPushNotificationToUser(session.user.id, {
      title: "🎉 Taskora Live Push Alert",
      body: "Mobile push notifications are working smoothly on your device!",
      link: "/dashboard",
      data: {
        timestamp: new Date().toISOString(),
        type: "TEST_ALERT",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Test notification dispatched to ${tokens.length} device(s).`,
      result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send test push";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
