"use client";

import React, { useState } from "react";
import {
  FolderKanban,
  Building,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  Percent,
  Sliders,
  Wallet,
  Save,
  Plus,
  ShieldCheck,
  CreditCard,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  ProjectWithFinancials,
  createProject,
  updateProjectBudget,
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
  const [activeTab, setActiveTab] = useState<"projects" | "ledger" | "vault">("projects");

  // Selected project for the Company Ledger
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjects[0]?.id || ""
  );

  // New Project Form State
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newBudget, setNewBudget] = useState("500000");
  const [newTaxPct, setNewTaxPct] = useState("10");
  const [newExpense, setNewExpense] = useState("15000");
  const [newDesc, setNewDesc] = useState("");

  // Edit / Financials State for the currently selected project
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const [taxPercent, setTaxPercent] = useState<number>(currentProject?.taxPercent ?? 10);
  const [expenseAmount, setExpenseAmount] = useState<number>(currentProject?.expenseAmount ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Update editor state when selected project changes
  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = projects.find((p) => p.id === projId);
    if (proj) {
      setTaxPercent(proj.taxPercent);
      setExpenseAmount(proj.expenseAmount);
      setSaveSuccessMsg(null);
    }
  };

  const budget = currentProject ? currentProject.totalBudget : 0;
  const companyAmount = budget; // 100% goes to Company Account
  const taxAmount = Math.round(((budget * taxPercent) / 100) * 100) / 100;
  const netCompanyProfit = Math.max(0, budget - expenseAmount - taxAmount);
  const profitMargin = budget > 0 ? ((netCompanyProfit / budget) * 100).toFixed(1) : "0.0";

  const handleSaveBudgetConfiguration = async () => {
    if (!currentProject) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      // Update project financial parameters (100% to company account)
      await updateProjectBudget(currentProject.id, {
        companyPercent: 100.0,
        taxPercent,
        expenseAmount,
      });

      setSaveSuccessMsg("Company budget & project P&L saved successfully!");

      // Update local state
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === currentProject.id) {
            return {
              ...p,
              companyPercent: 100.0,
              taxPercent,
              expenseAmount,
              companyAmount: p.totalBudget,
              taxAmount: Math.round(((p.totalBudget * taxPercent) / 100) * 100) / 100,
              teamPoolAmount: 0,
              allocatedTeamAmount: 0,
              unallocatedTeamAmount: 0,
              distributions: [],
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    try {
      const res = await createProject({
        workspaceId: workspace.id,
        name: newProjName.trim(),
        description: newDesc.trim() || undefined,
        clientName: newClientName.trim() || undefined,
        totalBudget: Number(newBudget) || 0,
        currency: "INR",
        companyPercent: 100.0,
        taxPercent: Number(newTaxPct) || 10,
        expenseAmount: Number(newExpense) || 0,
      });

      if (res.project) {
        setIsCreatingProject(false);
        const newP: any = {
          ...res.project,
          companyPercent: 100.0,
          companyAmount: res.project.totalBudget,
          taxAmount: Math.round(((res.project.totalBudget * res.project.taxPercent) / 100) * 100) / 100,
          teamPoolAmount: 0,
          allocatedTeamAmount: 0,
          unallocatedTeamAmount: 0,
          distributions: [],
        };
        setProjects((prev) => [newP, ...prev]);
        setSelectedProjectId(res.project.id);
        setActiveTab("ledger");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create project");
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
                Company Account & Treasury
              </span>
              <span className="text-xs text-indigo-300 font-medium">Graphionic Corporate Vault</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Project Budgets & Company Account
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              100% of client project revenue is routed directly to the Graphionic Company Account.
              Track project P&L, operating expenses, and corporate vault reserves.
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

        {/* Global Treasury Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-xs font-medium text-slate-400 block mb-1">
              Total Contract Revenue
            </span>
            <span className="text-2xl font-black text-white">
              {formatCurrency(treasury.totalRevenue)}
            </span>
            <span className="text-[11px] text-emerald-400 block mt-1 font-semibold">
              100% Company Revenue
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xs">
            <span className="text-xs font-medium text-emerald-300 block mb-1">
              Company Account Vault
            </span>
            <span className="text-2xl font-black text-emerald-400">
              {formatCurrency(treasury.companyVault)}
            </span>
            <span className="text-[11px] text-emerald-300 block mt-1 font-medium">
              Net Profit & Reserve
            </span>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-xs">
            <span className="text-xs font-medium text-amber-300 block mb-1">
              Tax & GST Reserves
            </span>
            <span className="text-2xl font-black text-amber-400">
              {formatCurrency(treasury.taxReserves)}
            </span>
            <span className="text-[11px] text-amber-300 block mt-1 font-medium">
              Compliance Reserve
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-xs font-medium text-slate-400 block mb-1">
              Operating / Tool Expenses
            </span>
            <span className="text-2xl font-black text-rose-300">
              {formatCurrency(treasury.totalExpenses)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1 font-medium">
              Software & Cloud APIs
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("projects")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
              activeTab === "projects"
                ? "bg-indigo-600 text-white shadow-md font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <FolderKanban className="w-4 h-4" />
            Projects Directory ({projects.length})
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
              activeTab === "ledger"
                ? "bg-indigo-600 text-white shadow-md font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Sliders className="w-4 h-4" />
            Company Project Ledger & P&L
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
              activeTab === "vault"
                ? "bg-indigo-600 text-white shadow-md font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Wallet className="w-4 h-4" />
            Company Account Vault
          </button>
        </div>
      </div>

      {/* TAB 1: PROJECTS DIRECTORY */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => {
              const compAmt = p.totalBudget;
              const taxAmt = (p.totalBudget * p.taxPercent) / 100;
              const netVault = Math.max(0, p.totalBudget - p.expenseAmount - taxAmt);

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
                        <span>Total Project Revenue</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          INR (₹)
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatCurrency(p.totalBudget, p.currency)}
                      </div>
                    </div>

                    {/* 100% Company Account Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <span>Revenue Credited</span>
                        <span className="text-emerald-600 font-bold">100% Company Account</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: "100%" }}
                          className="bg-emerald-500"
                          title="100% directly to Company Account"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-semibold text-emerald-600">
                          <Building className="w-3 h-3" />
                          Vault Net: {formatCurrency(netVault, p.currency)}
                        </span>
                        <span>Expenses: {formatCurrency(p.expenseAmount, p.currency)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      100% Company Vault
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        handleSelectProject(p.id);
                        setActiveTab("ledger");
                      }}
                      className="text-xs font-semibold"
                    >
                      <Sliders className="w-3.5 h-3.5 mr-1" />
                      Company P&L Ledger
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY REVENUE & PROJECT P&L (NO SPLITS - 100% COMPANY ACCOUNT) */}
      {activeTab === "ledger" && currentProject && (
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
                  Client: {currentProject.clientName || "Direct"} • Total Contract:{" "}
                  <strong>
                    {formatCurrency(currentProject.totalBudget, currentProject.currency)}
                  </strong>
                </p>
              </div>

              {/* Company Financial Allocation Parameters */}
              <div className="space-y-5 pt-2">
                {/* 1. Company Account Share (100% - No Splits) */}
                <div className="space-y-2 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Building className="w-4 h-4" /> Company Account Share
                    </span>
                    <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                      100% ({formatCurrency(companyAmount, currentProject.currency)})
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed">
                    100% of client project funds are transferred directly to Graphionic Company Vault.
                    No team fee-splitting is applied.
                  </p>
                </div>

                {/* 2. Direct Operating / Software Tool Expenses (INR) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Receipt className="w-4 h-4 text-slate-500" /> Direct Expenses / Tools (₹)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500">₹</span>
                      <input
                        type="number"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(Number(e.target.value))}
                        className="w-28 text-right px-2.5 py-1 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#4F46E5]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Hosting, third-party APIs, and software tools deducted from project revenue.
                  </p>
                </div>

                {/* 3. Tax & GST Compliance Reserve */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Percent className="w-4 h-4" /> Tax & GST Reserve ({taxPercent}%)
                    </span>
                    <span className="text-sm font-bold text-amber-600">
                      {formatCurrency(taxAmount, currentProject.currency)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    Statutory tax & compliance retention held by company.
                  </p>
                </div>
              </div>

              {/* Net Company Vault Retained Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-emerald-50/50 dark:from-indigo-950/40 dark:to-emerald-950/30 border border-indigo-200 dark:border-indigo-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                    Net Company Retained Profit
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {profitMargin}% Margin
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(netCompanyProfit, currentProject.currency)}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Transferred 100% to Graphionic Company Vault after expenses and compliance reserve.
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
                className="w-full font-bold shadow-md bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving Financials..." : "Save Company Financials"}
              </Button>
            </Card>
          </div>

          {/* Right Column: Company Account & Treasury Ledger (No Splits) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    Graphionic Corporate Treasury & Bank Settlement
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All client project revenue is deposited 100% into the company account.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✓ 100% Company Vault
                </span>
              </div>

              {/* Company Beneficiary Bank Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-600 text-white">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Primary Corporate Account
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Beneficiary: Graphionic Technologies Pvt. Ltd.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">
                    INR (₹) Account
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Account Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Current Account</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Settlement Method</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">NEFT / RTGS / Escrow</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Revenue Routing</span>
                    <span className="font-semibold text-emerald-600">100% Corporate</span>
                  </div>
                </div>
              </div>

              {/* Project P&L Breakdown Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Project Profit & Loss (P&L) Ledger
                </h4>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-3.5 flex items-center justify-between text-xs bg-white dark:bg-slate-900">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      Gross Client Contract Revenue
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      + {formatCurrency(budget, currentProject.currency)}
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between text-xs bg-white dark:bg-slate-900">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-rose-500" />
                      Direct Software & Tool Expenses
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                      - {formatCurrency(expenseAmount, currentProject.currency)}
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between text-xs bg-white dark:bg-slate-900">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-500" />
                      GST & Statutory Tax Reserve ({taxPercent}%)
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                      - {formatCurrency(taxAmount, currentProject.currency)}
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between text-xs bg-emerald-50/60 dark:bg-emerald-950/30">
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                        Net Company Retained Vault Balance
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        100% credited to Graphionic Corporate Vault
                      </span>
                    </div>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
                      = {formatCurrency(netCompanyProfit, currentProject.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Team Compensation & Payroll Policy Card */}
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 flex items-start gap-3">
                <FileText className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Corporate Payroll Policy (Fixed Employee Salaries)
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Team members (Rudra, Vedant, Lay, Bhumi) are full-time employees compensated via fixed monthly payroll managed through Office Attendance & HR. No client fee-splitting or freelance shares apply.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: COMPANY VAULT OVERVIEW */}
      {activeTab === "vault" && (
        <div className="space-y-6">
          <Card className="p-8 border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Company Treasury Ledger
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  Company Account Retention & Treasury
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
                    <th className="py-3 px-3">Total Contract</th>
                    <th className="py-3 px-3">Company Share</th>
                    <th className="py-3 px-3">Retained in Vault</th>
                    <th className="py-3 px-3">Direct Expenses</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {projects.map((p) => {
                    const taxAmt = (p.totalBudget * p.taxPercent) / 100;
                    const netVault = Math.max(0, p.totalBudget - p.expenseAmount - taxAmt);
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
                          100%
                        </td>
                        <td className="py-3.5 px-3 font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(netVault, p.currency)}
                        </td>
                        <td className="py-3.5 px-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {formatCurrency(p.expenseAmount, p.currency)}
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

      {/* Modal: Create New Budget Project */}
      {isCreatingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-600" />
                Create New Budget Project
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingProject(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Nexus Global Mobile Application"
                  required
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Name / Account
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Nexus Global Corp"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contract Value (₹ INR) *
                  </label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Direct Tools / Expenses (₹)
                  </label>
                  <input
                    type="number"
                    value={newExpense}
                    onChange={(e) => setNewExpense(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tax & GST Reserve (%)
                </label>
                <input
                  type="number"
                  value={newTaxPct}
                  onChange={(e) => setNewTaxPct(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Scope of work, deliverables, and timeline..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingProject(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Project
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
