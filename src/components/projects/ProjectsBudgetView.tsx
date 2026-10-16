"use client";

import React, { useState } from "react";
import {
  FolderKanban,
  DollarSign,
  Building,
  Users,
  PieChart,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Percent,
  Sliders,
  Wallet,
  Calendar,
  Save,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  ProjectWithFinancials,
  createProject,
  updateProjectBudget,
  saveProjectSplits,
  toggleSplitStatus,
} from "@/server/actions/project.actions";

interface ProjectsBudgetViewProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  initialProjects: ProjectWithFinancials[];
  initialTreasury: {
    totalRevenue: number;
    companyVault: number;
    taxReserves: number;
    totalExpenses: number;
    totalTeamPayouts: number;
    disbursedPayouts: number;
    pendingPayouts: number;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
    designation: {
      name: string;
    } | null;
  }>;
}

export const ProjectsBudgetView: React.FC<ProjectsBudgetViewProps> = ({
  workspace,
  initialProjects,
  initialTreasury,
  members,
}) => {
  const [projects, setProjects] = useState<ProjectWithFinancials[]>(initialProjects);
  const [treasury, setTreasury] = useState(initialTreasury);
  const [activeTab, setActiveTab] = useState<"projects" | "splitter" | "vault">("projects");

  // Selected project for the Budget Splitter
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjects[0]?.id || ""
  );

  // New Project Form State
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newBudget, setNewBudget] = useState("500000");
  const [newCurrency, setNewCurrency] = useState("INR");
  const [newCompanyPct, setNewCompanyPct] = useState("40");
  const [newTaxPct, setNewTaxPct] = useState("10");
  const [newExpense, setNewExpense] = useState("25000");
  const [newDesc, setNewDesc] = useState("");

  // Edit / Splitter State for the currently selected project
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const [companyPercent, setCompanyPercent] = useState<number>(
    currentProject?.companyPercent ?? 40
  );
  const [taxPercent, setTaxPercent] = useState<number>(currentProject?.taxPercent ?? 10);
  const [expenseAmount, setExpenseAmount] = useState<number>(currentProject?.expenseAmount ?? 0);
  const [splits, setSplits] = useState<
    Array<{
      id?: string;
      memberId?: string | null;
      recipientName: string;
      role?: string | null;
      percentage: number;
      allocatedAmount: number;
      status: string;
    }>
  >(
    currentProject?.distributions.map((d) => ({
      id: d.id,
      memberId: d.memberId,
      recipientName: d.recipientName,
      role: d.role,
      percentage: d.percentage,
      allocatedAmount: d.allocatedAmount,
      status: d.status,
    })) || []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Update editor state when selected project changes
  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = projects.find((p) => p.id === projId);
    if (proj) {
      setCompanyPercent(proj.companyPercent);
      setTaxPercent(proj.taxPercent);
      setExpenseAmount(proj.expenseAmount);
      setSplits(
        proj.distributions.map((d) => ({
          id: d.id,
          memberId: d.memberId,
          recipientName: d.recipientName,
          role: d.role,
          percentage: d.percentage,
          allocatedAmount: d.allocatedAmount,
          status: d.status,
        }))
      );
    }
  };

  // Recalculate team pool & amounts dynamically
  const budget = currentProject?.totalBudget || 0;
  const companyAmount = Math.round(((budget * companyPercent) / 100) * 100) / 100;
  const taxAmount = Math.round(((budget * taxPercent) / 100) * 100) / 100;
  const teamPoolAmount = Math.max(0, budget - companyAmount - taxAmount - expenseAmount);

  // Auto-update allocatedAmount when percentage or pool changes
  const handleSplitPercentageChange = (index: number, newPct: number) => {
    const updated = [...splits];
    updated[index].percentage = newPct;
    updated[index].allocatedAmount = Math.round(((teamPoolAmount * newPct) / 100) * 100) / 100;
    setSplits(updated);
  };

  const handleAddCustomRecipient = () => {
    setSplits((prev) => [
      ...prev,
      {
        recipientName: "New Employee",
        role: "Employee",
        percentage: 10,
        allocatedAmount: Math.round(((teamPoolAmount * 10) / 100) * 100) / 100,
        status: "PENDING",
      },
    ]);
  };

  const handleRemoveSplit = (index: number) => {
    setSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const totalSplitPercentage = splits.reduce((acc, s) => acc + (s.percentage || 0), 0);
  const totalAllocatedToTeam = splits.reduce((acc, s) => acc + (s.allocatedAmount || 0), 0);

  const handleSaveBudgetConfiguration = async () => {
    if (!currentProject) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      // 1. Update project financial parameters
      await updateProjectBudget(currentProject.id, {
        companyPercent,
        taxPercent,
        expenseAmount,
      });

      // 2. Save distribution splits
      await saveProjectSplits(currentProject.id, splits);

      setSaveSuccessMsg("Budget split & company account allocations saved successfully!");

      // Update local state
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === currentProject.id) {
            return {
              ...p,
              companyPercent,
              taxPercent,
              expenseAmount,
              companyAmount,
              taxAmount,
              teamPoolAmount,
              allocatedTeamAmount: totalAllocatedToTeam,
              unallocatedTeamAmount: Math.max(0, teamPoolAmount - totalAllocatedToTeam),
              distributions: splits.map((s, idx) => ({
                id: s.id || `split-${idx}`,
                projectId: p.id,
                memberId: s.memberId || null,
                recipientName: s.recipientName,
                role: s.role || null,
                percentage: s.percentage,
                allocatedAmount: s.allocatedAmount,
                status: s.status,
                paidAt: null,
                notes: null,
              })),
            };
          }
          return p;
        })
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving budget distributions.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createProject({
        workspaceId: workspace.id,
        name: newProjName,
        clientName: newClientName,
        totalBudget: parseFloat(newBudget),
        currency: newCurrency,
        companyPercent: parseFloat(newCompanyPct),
        taxPercent: parseFloat(newTaxPct),
        expenseAmount: parseFloat(newExpense),
        description: newDesc,
      });

      if (res.project) {
        setIsCreatingProject(false);
        const newP: any = {
          ...res.project,
          companyAmount: Math.round(((res.project.totalBudget * res.project.companyPercent) / 100) * 100) / 100,
          taxAmount: Math.round(((res.project.totalBudget * res.project.taxPercent) / 100) * 100) / 100,
          teamPoolAmount: Math.max(0, res.project.totalBudget - (res.project.totalBudget * res.project.companyPercent) / 100 - (res.project.totalBudget * res.project.taxPercent) / 100 - res.project.expenseAmount),
          allocatedTeamAmount: 0,
          unallocatedTeamAmount: 0,
          distributions: [],
        };
        setProjects((prev) => [newP, ...prev]);
        setSelectedProjectId(res.project.id);
        setActiveTab("splitter");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  const handleToggleStatus = async (splitId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "DISBURSED" ? "APPROVED" : "DISBURSED";
    try {
      await toggleSplitStatus(splitId, nextStatus);
      setSplits((prev) =>
        prev.map((s) => (s.id === splitId ? { ...s, status: nextStatus } : s))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (amount: number, curr = "INR") => {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner: Company Treasury & Financial Health */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl border border-indigo-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <TrendingUp className="w-3.5 h-3.5" />
                Company Account & Budget Engine
              </span>
              <span className="text-xs text-indigo-300 font-medium">Taskora Financials</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Project Budgets & Revenue Split
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Track multi-project revenue, automate company account deductions, and distribute
              transparent team payouts based on project budgets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => setIsCreatingProject(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Budget Project
            </Button>
          </div>
        </div>

        {/* 4 Financial Highlight Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Total Project Revenue
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {formatCurrency(treasury.totalRevenue)}
            </span>
            <span className="text-[11px] text-indigo-300 mt-0.5 block">
              {projects.length} Active Projects
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 backdrop-blur-md">
            <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider block flex items-center gap-1">
              <Building className="w-3.5 h-3.5" /> Company Account Share
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {formatCurrency(treasury.companyVault)}
            </span>
            <span className="text-[11px] text-emerald-300/80 mt-0.5 block">
              Retained in Company Treasury
            </span>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 backdrop-blur-md">
            <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider block flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Team Payout Allocations
            </span>
            <span className="text-2xl font-black text-indigo-300 mt-1 block">
              {formatCurrency(treasury.totalTeamPayouts)}
            </span>
            <span className="text-[11px] text-indigo-200/80 mt-0.5 block">
              {formatCurrency(treasury.disbursedPayouts)} Disbursed
            </span>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 backdrop-blur-md">
            <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider block flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" /> Taxes & Operating
            </span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">
              {formatCurrency(treasury.taxReserves + treasury.totalExpenses)}
            </span>
            <span className="text-[11px] text-amber-200/80 mt-0.5 block">
              Tax reserves & tooling expenses
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-800/80 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("projects")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
              activeTab === "projects"
                ? "bg-white text-slate-900 shadow-md font-bold"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <FolderKanban className="w-4 h-4" />
            Projects Directory ({projects.length})
          </button>

          <button
            onClick={() => setActiveTab("splitter")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
              activeTab === "splitter"
                ? "bg-white text-slate-900 shadow-md font-bold"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <Sliders className="w-4 h-4" />
            Interactive Budget Splitter
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
              activeTab === "vault"
                ? "bg-white text-slate-900 shadow-md font-bold"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <Wallet className="w-4 h-4" />
            Company Account Vault
          </button>
        </div>
      </div>

      {/* TAB 1: PROJECTS DIRECTORY & BUDGET OVERVIEW */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => {
              const compAmt = (p.totalBudget * p.companyPercent) / 100;
              const taxAmt = (p.totalBudget * p.taxPercent) / 100;
              const teamPool = Math.max(0, p.totalBudget - compAmt - taxAmt - p.expenseAmount);

              return (
                <Card
                  key={p.id}
                  hoverable
                  className="p-6 border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-800"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                          {p.clientName || "Direct Client"}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                          {p.name}
                        </h3>
                      </div>
                      <Badge variant={p.status === "ACTIVE" ? "inProgress" : "done"}>
                        {p.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {p.description || "No project description provided."}
                    </p>

                    {/* Total Budget Card Highlight */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Total Project Budget</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {p.currency}
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatCurrency(p.totalBudget, p.currency)}
                      </div>
                    </div>

                    {/* Split Breakdown Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <span>Distribution Split</span>
                        <span>Company {p.companyPercent}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${p.companyPercent}%` }}
                          className="bg-emerald-500"
                          title={`Company Account: ${p.companyPercent}%`}
                        />
                        <div
                          style={{
                            width: `${(teamPool / (p.totalBudget || 1)) * 100}%`,
                          }}
                          className="bg-indigo-500"
                          title="Team Payouts"
                        />
                        <div
                          style={{ width: `${p.taxPercent}%` }}
                          className="bg-amber-500"
                          title={`Taxes: ${p.taxPercent}%`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Company: {formatCurrency(compAmt, p.currency)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          Team Pool: {formatCurrency(teamPool, p.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {p.distributions.length} Team Splits
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        handleSelectProject(p.id);
                        setActiveTab("splitter");
                      }}
                      className="text-xs font-semibold"
                    >
                      <Sliders className="w-3.5 h-3.5 mr-1" />
                      Configure Split
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE BUDGET SPLITTER & DISTRIBUTION ENGINE */}
      {activeTab === "splitter" && currentProject && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Configuration Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Active Project
                  </span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleSelectProject(e.target.value)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {currentProject.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client: {currentProject.clientName || "Direct"} • Total Budget:{" "}
                  <strong>
                    {formatCurrency(currentProject.totalBudget, currentProject.currency)}
                  </strong>
                </p>
              </div>

              {/* Sliders for Company Account and Taxes */}
              <div className="space-y-5 pt-2">
                {/* 1. Company Account Split */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <Building className="w-4 h-4" /> Company Account Share
                    </span>
                    <span className="text-base font-extrabold text-emerald-600">
                      {companyPercent}% ({formatCurrency(companyAmount, currentProject.currency)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="1"
                    value={companyPercent}
                    onChange={(e) => setCompanyPercent(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    Transferred directly to company vault for operations, company reserve, & profit.
                  </p>
                </div>

                {/* 2. Tax & Compliance Reserve */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Receipt className="w-4 h-4" /> Tax & Compliance Reserve
                    </span>
                    <span className="text-base font-extrabold text-amber-600">
                      {taxPercent}% ({formatCurrency(taxAmount, currentProject.currency)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                </div>

                {/* 3. Direct Operating / Tool Expenses */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <DollarSign className="w-4 h-4" /> Direct Expenses / Tools
                    </span>
                    <input
                      type="number"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(Number(e.target.value))}
                      className="w-28 text-right px-2 py-1 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Net Team Pool Summary */}
              <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                  Net Team Distribution Pool
                </span>
                <div className="text-2xl font-black text-indigo-900 dark:text-indigo-200">
                  {formatCurrency(teamPoolAmount, currentProject.currency)}
                </div>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                  Available to distribute to team members, developers, and leads.
                </p>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 rounded-lg text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <Button
                size="lg"
                variant="primary"
                disabled={isSaving}
                onClick={handleSaveBudgetConfiguration}
                className="w-full font-bold shadow-md bg-indigo-600 hover:bg-indigo-500"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving Configuration..." : "Save Budget & Splits"}
              </Button>
            </Card>
          </div>

          {/* Right Distribution Matrix Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Team Member Payout Matrix
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Allocate payout percentages or fixed shares to each developer and collaborator.
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAddCustomRecipient}
                  className="text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Recipient
                </Button>
              </div>

              {/* Total Allocation Progress */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Total Team Pool Allocated</span>
                  <span
                    className={cn(
                      "font-bold",
                      totalSplitPercentage === 100
                        ? "text-emerald-600"
                        : totalSplitPercentage > 100
                        ? "text-rose-600"
                        : "text-amber-600"
                    )}
                  >
                    {totalSplitPercentage}% of pool ({formatCurrency(totalAllocatedToTeam, currentProject.currency)})
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, totalSplitPercentage)}%` }}
                    className={cn(
                      "h-full transition-all",
                      totalSplitPercentage === 100
                        ? "bg-emerald-500"
                        : totalSplitPercentage > 100
                        ? "bg-rose-500"
                        : "bg-indigo-500"
                    )}
                  />
                </div>
              </div>

              {/* Splits List */}
              <div className="space-y-3">
                {splits.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={s.recipientName}
                          onChange={(e) => {
                            const updated = [...splits];
                            updated[idx].recipientName = e.target.value;
                            setSplits(updated);
                          }}
                          className="font-bold text-slate-900 dark:text-white text-sm bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500"
                        />
                        <div className="mt-1">
                          {s.recipientName.includes("Mayank") || s.role === "Owner" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              Owner
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Employee
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s.id!, s.status)}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full font-bold cursor-pointer transition-colors",
                              s.status === "DISBURSED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            )}
                          >
                            {s.status === "DISBURSED" ? "✓ Disbursed" : "⏳ Pending"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveSplit(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove split"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Split Sliders and Amount */}
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-7 sm:col-span-8 flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={s.percentage}
                          onChange={(e) =>
                            handleSplitPercentageChange(idx, Number(e.target.value))
                          }
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10 text-right">
                          {s.percentage}%
                        </span>
                      </div>

                      <div className="col-span-5 sm:col-span-4 text-right">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          {formatCurrency(s.allocatedAmount, currentProject.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: COMPANY VAULT & TREASURY OVERVIEW */}
      {activeTab === "vault" && (
        <div className="space-y-6">
          <Card className="p-8 border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Company Treasury Ledger
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  Company Account Retention & Disbursements
                </h2>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black text-lg">
                Vault: {formatCurrency(treasury.companyVault)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Total Budget</th>
                    <th className="py-3 px-3">Company Share</th>
                    <th className="py-3 px-3">Retained in Vault</th>
                    <th className="py-3 px-3">Team Distributed</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {projects.map((p) => {
                    const compAmount = (p.totalBudget * p.companyPercent) / 100;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-slate-400">{p.clientName}</span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(p.totalBudget, p.currency)}
                        </td>
                        <td className="py-3.5 px-3 text-xs font-bold text-emerald-600">
                          {p.companyPercent}%
                        </td>
                        <td className="py-3.5 px-3 font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(compAmount, p.currency)}
                        </td>
                        <td className="py-3.5 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(p.allocatedTeamAmount, p.currency)}
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge variant={p.status === "ACTIVE" ? "inProgress" : "done"}>
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {isCreatingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-600" />
                Create New Budget Project
              </h3>
              <button
                onClick={() => setIsCreatingProject(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewProject} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Workflow Platform"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client / Customer Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Horizon Labs Corp"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Budget
                  </label>
                  <input
                    type="number"
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company %
                  </label>
                  <input
                    type="number"
                    value={newCompanyPct}
                    onChange={(e) => setNewCompanyPct(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tax %
                  </label>
                  <input
                    type="number"
                    value={newTaxPct}
                    onChange={(e) => setNewTaxPct(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expenses
                  </label>
                  <input
                    type="number"
                    value={newExpense}
                    onChange={(e) => setNewExpense(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Key deliverables, timeline..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreatingProject(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="font-bold">
                  Create & Launch Budget
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
