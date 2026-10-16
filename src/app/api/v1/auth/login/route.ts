import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth";
import { getActiveWorkspaceContext } from "@/lib/workspace";

/**
 * Mobile & External Application Authentication Endpoint.
 * Standard JSON REST API for future Flutter, React Native, or mobile clients.
 *
 * Method: POST
 * Body: { email: string, password: string }
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request payload." },
        { status: 400 }
      );
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Valid email and password are required." },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Rate-limiting check designed for mobile app traffic
    const rateLimitKey = `api:login:${normalizedEmail}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 20, 60);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please wait a minute before trying again.",
          retryAfter: 60,
        },
        { status: 429 }
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database service unavailable." },
        { status: 503 }
      );
    }

    // Lookup user by email
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Reset rate-limit tracker on verified authentication
    await resetRateLimit(rateLimitKey);
    await resetRateLimit(`login:${normalizedEmail}`);

    // Resolve active workspace context for the mobile client
    const wsContext = await getActiveWorkspaceContext(user.id);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
        workspace: wsContext?.workspace
          ? {
              id: wsContext.workspace.id,
              name: wsContext.workspace.name,
              slug: wsContext.workspace.slug,
              role: wsContext.role,
              memberId: wsContext.member.id,
              designation: wsContext.member.designation?.name || null,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Mobile auth API error:", error);
    return NextResponse.json(
      { error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}
