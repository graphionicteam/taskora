"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getActiveWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export interface ProjectWithFinancials {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  clientName: string | null;
  totalBudget: number;
  currency: string;
  status: string;
  companyPercent: number;
  taxPercent: number;
  expenseAmount: number;
  companyAmount: number;
  taxAmount: number;
  teamPoolAmount: number;
  allocatedTeamAmount: number;
  unallocatedTeamAmount: number;
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  distributions: Array<{
    id: string;
    projectId: string;
    memberId: string | null;
    recipientName: string;
    role: string | null;
    percentage: number;
    allocatedAmount: number;
    status: string;
    paidAt: Date | null;
    notes: string | null;
    member?: {
      user: {
        name: string | null;
        email: string;
        avatarUrl: string | null;
      };
      designation?: {
        name: string;
      } | null;
    } | null;
  }>;
}

export async function getProjectsWithFinancials(workspaceId: string): Promise<{
  projects: ProjectWithFinancials[];
  treasury: {
    totalRevenue: number;
    companyVault: number;
    taxReserves: number;
    totalExpenses: number;
    totalTeamPayouts: number;
    disbursedPayouts: number;
    pendingPayouts: number;
  };
}> {
  const projects = await db.project.findMany({
    where: { workspaceId },
    include: {
      distributions: {
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              designation: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { allocatedAmount: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let totalRevenue = 0;
  let companyVault = 0;
  let taxReserves = 0;
  let totalExpenses = 0;
  let totalTeamPayouts = 0;
  let disbursedPayouts = 0;
  let pendingPayouts = 0;

  const enrichedProjects: ProjectWithFinancials[] = projects.map((p) => {
    const budget = p.totalBudget || 0;
    const companyAmount = Math.round((budget * (p.companyPercent / 100)) * 100) / 100;
    const taxAmount = Math.round((budget * (p.taxPercent / 100)) * 100) / 100;
    const expenseAmount = p.expenseAmount || 0;
    const teamPoolAmount = Math.max(0, budget - companyAmount - taxAmount - expenseAmount);

    let allocatedTeamAmount = 0;
    p.distributions.forEach((d) => {
      allocatedTeamAmount += d.allocatedAmount;
      if (d.status === "DISBURSED") {
        disbursedPayouts += d.allocatedAmount;
      } else {
        pendingPayouts += d.allocatedAmount;
      }
    });

    const unallocatedTeamAmount = Math.max(0, teamPoolAmount - allocatedTeamAmount);

    totalRevenue += budget;
    companyVault += companyAmount;
    taxReserves += taxAmount;
    totalExpenses += expenseAmount;
    totalTeamPayouts += allocatedTeamAmount;

    return {
      ...p,
      companyAmount,
      taxAmount,
      teamPoolAmount,
      allocatedTeamAmount,
      unallocatedTeamAmount,
    };
  });

  return {
    projects: enrichedProjects,
    treasury: {
      totalRevenue,
      companyVault,
      taxReserves,
      totalExpenses,
      totalTeamPayouts,
      disbursedPayouts,
      pendingPayouts,
    },
  };
}

export async function createProject(data: {
  workspaceId: string;
  name: string;
  description?: string;
  clientName?: string;
  totalBudget: number;
  currency?: string;
  status?: string;
  companyPercent?: number;
  taxPercent?: number;
  expenseAmount?: number;
  startDate?: string;
  dueDate?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wsContext = await getActiveWorkspaceContext(session.user.id, data.workspaceId);
  if (!wsContext) throw new Error("Workspace not found");

  const project = await db.project.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description,
      clientName: data.clientName,
      totalBudget: Number(data.totalBudget),
      currency: data.currency || "INR",
      status: data.status || "ACTIVE",
      companyPercent: data.companyPercent !== undefined ? Number(data.companyPercent) : 40.0,
      taxPercent: data.taxPercent !== undefined ? Number(data.taxPercent) : 10.0,
      expenseAmount: data.expenseAmount !== undefined ? Number(data.expenseAmount) : 0.0,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  // Automatically seed distribution splits from active workspace members
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: data.workspaceId, status: "ACTIVE" },
    include: { user: true },
  });

  if (members.length > 0) {
    const budget = Number(data.totalBudget);
    const compPct = data.companyPercent !== undefined ? Number(data.companyPercent) : 40.0;
    const taxPct = data.taxPercent !== undefined ? Number(data.taxPercent) : 10.0;
    const exp = data.expenseAmount !== undefined ? Number(data.expenseAmount) : 0.0;
    const teamPool = Math.max(0, budget - (budget * compPct) / 100 - (budget * taxPct) / 100 - exp);

    const basePct = Math.floor(100 / members.length);
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const isOwner = m.role === "OWNER" || (m.user.name && m.user.name.includes("Mayank"));
      const pct = i === members.length - 1 ? 100 - basePct * (members.length - 1) : basePct;
      const amount = Math.round((teamPool * (pct / 100)) * 100) / 100;

      await db.projectBudgetSplit.create({
        data: {
          projectId: project.id,
          memberId: m.id,
          recipientName: m.user.name || m.user.email,
          role: isOwner ? "Owner" : "Employee",
          percentage: pct,
          allocatedAmount: amount,
          status: "PENDING",
        },
      });
    }
  }

  revalidatePath("/projects");
  return { success: true, project };
}

export async function updateProjectBudget(
  projectId: string,
  data: {
    name?: string;
    clientName?: string;
    totalBudget?: number;
    currency?: string;
    status?: string;
    companyPercent?: number;
    taxPercent?: number;
    expenseAmount?: number;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.clientName !== undefined && { clientName: data.clientName }),
      ...(data.totalBudget !== undefined && { totalBudget: Number(data.totalBudget) }),
      ...(data.currency && { currency: data.currency }),
      ...(data.status && { status: data.status }),
      ...(data.companyPercent !== undefined && { companyPercent: Number(data.companyPercent) }),
      ...(data.taxPercent !== undefined && { taxPercent: Number(data.taxPercent) }),
      ...(data.expenseAmount !== undefined && { expenseAmount: Number(data.expenseAmount) }),
    },
  });

  revalidatePath("/projects");
  return { success: true, project };
}

export async function saveProjectSplits(
  projectId: string,
  splits: Array<{
    id?: string;
    memberId?: string | null;
    recipientName: string;
    role?: string | null;
    percentage: number;
    allocatedAmount: number;
    status: string;
    notes?: string | null;
  }>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Delete existing splits and replace with updated set
  await db.projectBudgetSplit.deleteMany({
    where: { projectId },
  });

  for (const s of splits) {
    await db.projectBudgetSplit.create({
      data: {
        projectId,
        memberId: s.memberId || null,
        recipientName: s.recipientName,
        role: s.role || null,
        percentage: Number(s.percentage),
        allocatedAmount: Number(s.allocatedAmount),
        status: s.status || "PENDING",
        notes: s.notes || null,
        paidAt: s.status === "DISBURSED" ? new Date() : null,
      },
    });
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function toggleSplitStatus(splitId: string, status: "PENDING" | "APPROVED" | "DISBURSED") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const split = await db.projectBudgetSplit.update({
    where: { id: splitId },
    data: {
      status,
      paidAt: status === "DISBURSED" ? new Date() : null,
    },
  });

  revalidatePath("/projects");
  return { success: true, split };
}
