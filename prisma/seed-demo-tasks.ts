import { PrismaClient, TaskPriority, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding realistic demo tasks and notifications for Taskora...");

  // 1. Fetch workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "graphionic" },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      projects: true,
    },
  });

  if (!workspace) {
    console.error("Workspace 'graphionic' not found!");
    return;
  }

  const project = workspace.projects[0];
  const members = workspace.members;

  const mayank = members.find((m) => m.role === "OWNER" || m.user.name?.includes("Mayank"));
  const rudra = members.find((m) => m.user.name?.toLowerCase().includes("rudra"));
  const vedant = members.find((m) => m.user.name?.toLowerCase().includes("vedant"));
  const lay = members.find((m) => m.user.name?.toLowerCase().includes("lay"));
  const bhumi = members.find((m) => m.user.name?.toLowerCase().includes("bhumi"));

  if (!mayank || !rudra || !vedant || !lay || !bhumi) {
    console.error("Required team members not found in workspace!");
    return;
  }

  const today = new Date();
  today.setHours(17, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  const threeDays = new Date(today);
  threeDays.setDate(today.getDate() + 3);

  const fiveDays = new Date(today);
  fiveDays.setDate(today.getDate() + 5);

  const demoTasks = [
    {
      title: "[Social:Instagram] Feature Launch Reel: Geofenced Attendance System",
      description: "Platform: Instagram. Showcase QR attendance verification within 100m office perimeter.",
      priority: "HIGH" as TaskPriority,
      status: "IN_PROGRESS" as TaskStatus,
      dueDate: today,
      assigneeId: rudra.id,
      creatorId: mayank.user.id,
      projectId: project?.id,
    },
    {
      title: "Client Review on UI/UX Deliverables for Nexus Global",
      description: "Present high-fidelity dashboard mockups and mobile tab navigation to client stakeholders.",
      priority: "URGENT" as TaskPriority,
      status: "TODO" as TaskStatus,
      dueDate: today,
      assigneeId: lay.id,
      creatorId: mayank.user.id,
      projectId: project?.id,
    },
    {
      title: "API Rate Limiter & Performance Validation on Supabase",
      description: "Verify sub-100ms response times on Tokyo pooler and load test attendance endpoints.",
      priority: "HIGH" as TaskPriority,
      status: "IN_PROGRESS" as TaskStatus,
      dueDate: today,
      assigneeId: vedant.id,
      creatorId: mayank.user.id,
      projectId: project?.id,
    },
    {
      title: "[Social:LinkedIn] Founder Tech Log: Why We Switched to Supabase Pooler",
      description: "Platform: LinkedIn. Technical writeup on IPv4 transaction pooling and in-memory session cache.",
      priority: "MEDIUM" as TaskPriority,
      status: "TODO" as TaskStatus,
      dueDate: tomorrow,
      assigneeId: rudra.id,
      creatorId: mayank.user.id,
      projectId: project?.id,
    },
    {
      title: "Mobile App Responsive Layout QA & Cross-Browser Test Cases",
      description: "Validate sticky bottom navigation, attendance punch slider, and chat input on iOS & Android.",
      priority: "MEDIUM" as TaskPriority,
      status: "TODO" as TaskStatus,
      dueDate: dayAfter,
      assigneeId: bhumi.id,
      creatorId: mayank.user.id,
      projectId: project?.id,
    },
    {
      title: "[Social:Twitter] Thread on Next.js 16 Turbopack & In-Memory Caching",
      description: "Platform: Twitter. 5-tweet breakdown of Turbopack compilation and instant page transitions.",
      priority: "LOW" as TaskPriority,
      status: "TODO" as TaskStatus,
      dueDate: threeDays,
      assigneeId: lay.id,
      creatorId: mayank.user.id,
      projectId: project?.id,
    },
    {
      title: "Office Wall QR Code Rotation & Security Review",
      description: "Verify physical QR rotation schedule and validate 100m geofence coordinate matching.",
      priority: "HIGH" as TaskPriority,
      status: "DONE" as TaskStatus,
      dueDate: threeDays,
      assigneeId: bhumi.id,
      creatorId: mayank.user.id,
      projectId: project?.id,
    },
    {
      title: "INR Budget Milestone 2 Reconciliation & Team Payouts",
      description: "Verify 40% company retention, 10% tax reserve, and employee split ledger in INR (₹).",
      priority: "URGENT" as TaskPriority,
      status: "IN_REVIEW" as TaskStatus,
      dueDate: fiveDays,
      assigneeId: vedant.id,
      creatorId: mayank.user.id,
      projectId: project?.id,
    },
  ];

  console.log(`Inserting ${demoTasks.length} demo tasks...`);

  for (const t of demoTasks) {
    const existing = await prisma.task.findFirst({
      where: {
        workspaceId: workspace.id,
        title: t.title,
      },
    });

    let taskId = existing?.id;

    if (!existing) {
      const created = await prisma.task.create({
        data: {
          workspaceId: workspace.id,
          ...t,
        },
      });
      taskId = created.id;
    } else {
      await prisma.task.update({
        where: { id: existing.id },
        data: {
          dueDate: t.dueDate,
          priority: t.priority,
          status: t.status,
          assigneeId: t.assigneeId,
        },
      });
    }

    if (taskId && t.assigneeId) {
      await prisma.taskAssignment.upsert({
        where: {
          taskId_memberId: {
            taskId,
            memberId: t.assigneeId,
          },
        },
        update: {},
        create: {
          taskId,
          memberId: t.assigneeId,
        },
      });
    }
  }

  // 2. Insert Demo Notifications for members
  console.log("Inserting demo notifications...");

  const allMembers = [rudra, vedant, lay, bhumi, mayank];

  for (const m of allMembers) {
    // Notification 1: Task Assignment
    await prisma.notification.create({
      data: {
        workspaceId: workspace.id,
        recipientId: m.id,
        actorId: mayank.id,
        type: "TASK_ASSIGNED",
        title: "New Task Assigned",
        content: `Mayank Parmar assigned you: "${demoTasks[0].title}" with High priority.`,
        link: "/dashboard",
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      },
    });

    // Notification 2: Budget update
    await prisma.notification.create({
      data: {
        workspaceId: workspace.id,
        recipientId: m.id,
        actorId: mayank.id,
        type: "OWNER_ALERT",
        title: "Project Milestone Approved",
        content: "Enterprise Web & Mobile Suite budget milestone has been approved in INR (₹).",
        link: "/projects",
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hrs ago
      },
    });

    // Notification 3: Attendance Alert
    await prisma.notification.create({
      data: {
        workspaceId: workspace.id,
        recipientId: m.id,
        actorId: mayank.id,
        type: "ATTENDANCE_VERIFIED",
        title: "Office Attendance Logged",
        content: "Your attendance was verified within 100m of Graphionic HQ.",
        link: "/attendance",
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      },
    });
  }

  console.log("✅ Demo tasks and notifications seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
