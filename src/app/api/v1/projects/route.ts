import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveWorkspaceContext } from "@/lib/workspace";
import { getProjectsWithFinancials, createProject } from "@/server/actions/project.actions";

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

    const data = await getProjectsWithFinancials(wsContext.workspace.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Projects API error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const wsContext = await getActiveWorkspaceContext(session.user.id, body.workspaceId || undefined);
    if (!wsContext) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const project = await createProject({
      ...body,
      workspaceId: wsContext.workspace.id,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("Create project API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create project" },
      { status: 400 }
    );
  }
}
