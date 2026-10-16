import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Taskora database on Supabase...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Users
  const mayankUser = await prisma.user.upsert({
    where: { email: "mayank@graphionic.com" },
    update: { name: "Mayank Parmar", passwordHash },
    create: {
      email: "mayank@graphionic.com",
      name: "Mayank Parmar",
      passwordHash,
    },
  });

  const rudraUser = await prisma.user.upsert({
    where: { email: "rudra@graphionic.com" },
    update: { name: "Rudra", passwordHash },
    create: {
      email: "rudra@graphionic.com",
      name: "Rudra",
      passwordHash,
    },
  });

  const vedantUser = await prisma.user.upsert({
    where: { email: "vedant@graphionic.com" },
    update: { name: "Vedant", passwordHash },
    create: {
      email: "vedant@graphionic.com",
      name: "Vedant",
      passwordHash,
    },
  });

  const layUser = await prisma.user.upsert({
    where: { email: "lay@graphionic.com" },
    update: { name: "Lay", passwordHash },
    create: {
      email: "lay@graphionic.com",
      name: "Lay",
      passwordHash,
    },
  });

  const bhumiUser = await prisma.user.upsert({
    where: { email: "bhumi@graphionic.com" },
    update: { name: "Bhumi", passwordHash },
    create: {
      email: "bhumi@graphionic.com",
      name: "Bhumi",
      passwordHash,
    },
  });

  // 2. Create Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "graphionic" },
    update: { name: "Graphionic" },
    create: {
      name: "Graphionic",
      slug: "graphionic",
      description: "Official workspace for Graphionic team.",
    },
  });

  // 3. Create Workspace Members
  // Mayank Parmar is OWNER
  const mayankMember = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: mayankUser.id,
      },
    },
    update: { role: "OWNER", status: "ACTIVE", designationId: null },
    create: {
      workspaceId: workspace.id,
      userId: mayankUser.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  // Other 4 are Employees (MEMBER)
  const rudraMember = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: rudraUser.id,
      },
    },
    update: { role: "MEMBER", status: "ACTIVE", designationId: null },
    create: {
      workspaceId: workspace.id,
      userId: rudraUser.id,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });

  const vedantMember = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: vedantUser.id,
      },
    },
    update: { role: "MEMBER", status: "ACTIVE", designationId: null },
    create: {
      workspaceId: workspace.id,
      userId: vedantUser.id,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });

  const layMember = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: layUser.id,
      },
    },
    update: { role: "MEMBER", status: "ACTIVE", designationId: null },
    create: {
      workspaceId: workspace.id,
      userId: layUser.id,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });

  const bhumiMember = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: bhumiUser.id,
      },
    },
    update: { role: "MEMBER", status: "ACTIVE", designationId: null },
    create: {
      workspaceId: workspace.id,
      userId: bhumiUser.id,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });

  // 4. Create Office Location (100m Geofence)
  await prisma.officeLocation.upsert({
    where: { workspaceId: workspace.id },
    update: {
      name: "Graphionic HQ",
      latitude: 23.0225,
      longitude: 72.5714,
      radiusMeters: 100.0,
      qrSecret: "GRAPHIONIC_OFFICE_SECRET_KEY",
    },
    create: {
      workspaceId: workspace.id,
      name: "Graphionic HQ",
      latitude: 23.0225,
      longitude: 72.5714,
      radiusMeters: 100.0,
      qrSecret: "GRAPHIONIC_OFFICE_SECRET_KEY",
    },
  });

  // 5. Create Initial Project with INR (₹) Splits
  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Enterprise Web & Mobile Suite",
      description: "Full-scale corporate platform with high-speed backend and mobile readiness.",
      clientName: "Nexus Global",
      totalBudget: 250000.0, // ₹2,50,000
      currency: "INR",
      status: "ACTIVE",
      companyPercent: 40.0, // 40% = ₹1,00,000
      taxPercent: 10.0,     // 10% = ₹25,000
      expenseAmount: 15000.0,
      distributions: {
        create: [
          {
            memberId: rudraMember.id,
            recipientName: "Rudra",
            role: "Fullstack Lead",
            percentage: 40.0,
            allocatedAmount: 44000.0,
            status: "APPROVED",
          },
          {
            memberId: vedantMember.id,
            recipientName: "Vedant",
            role: "Frontend Engineer",
            percentage: 30.0,
            allocatedAmount: 33000.0,
            status: "APPROVED",
          },
          {
            memberId: layMember.id,
            recipientName: "Lay",
            role: "UI/UX Designer",
            percentage: 15.0,
            allocatedAmount: 16500.0,
            status: "PENDING",
          },
          {
            memberId: bhumiMember.id,
            recipientName: "Bhumi",
            role: "QA & Mobile Tester",
            percentage: 15.0,
            allocatedAmount: 16500.0,
            status: "PENDING",
          },
        ],
      },
    },
  });

  // 6. Create General Discussion Channel
  const conversation = await prisma.conversation.create({
    data: {
      workspaceId: workspace.id,
      title: "General & Announcements",
      isGroup: true,
      participants: {
        create: [
          { memberId: mayankMember.id },
          { memberId: rudraMember.id },
          { memberId: vedantMember.id },
          { memberId: layMember.id },
          { memberId: bhumiMember.id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: mayankMember.id,
      content: "Welcome team! All office attendance, budget distributions, and task chats are now live.",
    },
  });

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
