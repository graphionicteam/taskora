import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspaces, generateSlug } from "@/lib/workspace";
import { createWorkspaceSchema } from "@/lib/validations/workspace";

const DEFAULT_DESIGNATIONS = [
  "Product Manager",
  "UI/UX Designer",
  "Frontend Developer",
  "Backend Developer",
  "QA Engineer",
  "Operations Specialist",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await getUserWorkspaces(session.user.id);
  return NextResponse.json({ data: workspaces });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid workspace payload" },
        { status: 400 }
      );
    }

    const { name, description } = parsed.data;
    const slug = generateSlug(name);

    const result = await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          description: description || null,
        },
      });

      // Seed default designations
      await tx.designation.createMany({
        data: DEFAULT_DESIGNATIONS.map((title) => ({
          workspaceId: workspace.id,
          name: title,
        })),
      });

      // Add user as OWNER
      const member = await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      return { workspace, member };
    });

    return NextResponse.json({ data: result.workspace }, { status: 201 });
  } catch (error) {
    console.error("API POST /api/v1/workspaces error:", error);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
