import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("💼 Updating all projects to 100% Company Account (No team splits)...");

  // 1. Delete all team distribution splits
  const deletedSplits = await prisma.projectBudgetSplit.deleteMany({});
  console.log(`Deleted ${deletedSplits.count} residual team budget splits.`);

  // 2. Set all projects to 100% companyPercent and INR currency
  const updatedProjects = await prisma.project.updateMany({
    data: {
      companyPercent: 100.0,
      currency: "INR",
    },
  });
  console.log(`Updated ${updatedProjects.count} projects to 100% Company Account.`);

  console.log("✅ Database successfully updated to 100% Company Account model!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
