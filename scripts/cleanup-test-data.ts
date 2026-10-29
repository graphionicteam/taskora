import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting Taskora test & demo data cleanup...\n");

  // 1. Delete Notifications
  const deletedNotifications = await prisma.notification.deleteMany({});
  console.log(`✅ Deleted ${deletedNotifications.count} test/demo notifications.`);

  // 2. Delete Task Assignments
  const deletedAssignments = await prisma.taskAssignment.deleteMany({});
  console.log(`✅ Deleted ${deletedAssignments.count} task assignments.`);

  // 3. Delete Tasks (child and parent tasks)
  const deletedTasks = await prisma.task.deleteMany({});
  console.log(`✅ Deleted ${deletedTasks.count} test/demo tasks.`);

  // 4. Delete Project Budget Splits (if any remained)
  const deletedSplits = await prisma.projectBudgetSplit.deleteMany({});
  console.log(`✅ Deleted ${deletedSplits.count} project budget splits.`);

  // 5. Delete Projects (if any)
  const deletedProjects = await prisma.project.deleteMany({});
  console.log(`✅ Deleted ${deletedProjects.count} demo projects.`);

  // 6. Delete Test Chat Messages
  const deletedMessages = await prisma.message.deleteMany({});
  console.log(`✅ Deleted ${deletedMessages.count} test chat messages.`);

  // 7. Delete 1-on-1 test conversations (preserve "General & Announcements")
  const deletedDirectConvos = await prisma.conversation.deleteMany({
    where: {
      isGroup: false,
    },
  });
  console.log(`✅ Deleted ${deletedDirectConvos.count} test 1-on-1 conversation threads.`);

  // 8. Delete Attendance test records (if any)
  const deletedAttendance = await prisma.attendance.deleteMany({});
  console.log(`✅ Deleted ${deletedAttendance.count} attendance records.`);

  // 9. Clear Rate Limits
  const deletedRateLimits = await prisma.rateLimit.deleteMany({});
  console.log(`✅ Cleared ${deletedRateLimits.count} rate limits.`);

  console.log("\n--- VERIFYING CLEAN STATE ---");
  const remainingTasks = await prisma.task.count();
  const remainingNotifs = await prisma.notification.count();
  const remainingProjects = await prisma.project.count();
  const remainingMessages = await prisma.message.count();
  const users = await prisma.user.findMany({ select: { name: true, email: true } });

  console.log(`Tasks: ${remainingTasks}`);
  console.log(`Notifications: ${remainingNotifs}`);
  console.log(`Projects: ${remainingProjects}`);
  console.log(`Messages: ${remainingMessages}`);
  console.log(`Active Real Users Preserved (${users.length}):`, users.map((u) => u.name || u.email).join(", "));
  console.log("\n🎉 Clean-up completed successfully!");
}

main()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
