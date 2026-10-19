import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, platform, userAgent } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Upsert device push token for user
    const deviceToken = await db.devicePushToken.upsert({
      where: { token },
      update: {
        userId: session.user.id,
        platform: platform || "web",
        userAgent: userAgent || null,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        token,
        platform: platform || "web",
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: deviceToken.id,
        platform: deviceToken.platform,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to register push token";
    console.error("Error registering push token:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (token) {
      await db.devicePushToken.deleteMany({
        where: {
          token,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove push token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
