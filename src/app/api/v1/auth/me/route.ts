import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveWorkspaceContext } from "@/lib/workspace";

/**
 * Mobile & Client Session Status Endpoint.
 * Returns profile details and active workspace permissions for authenticated sessions.
 *
 * Method: GET
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Active session required." },
        { status: 401 }
      );
    }

    const wsContext = await getActiveWorkspaceContext(session.user.id);

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
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
    console.error("Session verification API error:", error);
    return NextResponse.json(
      { error: "Failed to verify session." },
      { status: 500 }
    );
  }
}
