"use client";

import React, { useState, useMemo } from "react";
import {
  FolderKanban,
  Building,
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
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  CheckSquare,
  Square,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  ProjectWithFinancials,
  createProject,
  updateProjectBudget,
  deleteProject,
  deleteMultipleProjects,
  bulkUpdateProjects,
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
  members,
}) => {
  const [projects, setProjects] = useState<ProjectWithFinancials[]>(initialProjects);
  const [activeTab, setActiveTab] = useState<"projects" | "ledger" | "vault">("projects");

  // Multi-selection state for bulk actions
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("ACTIVE");
  const [bulkTaxPercent, setBulkTaxPercent] = useState<string>("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Single Edit state
  const [editingProject, setEditingProject] = useState<ProjectWithFinancials | null>(null);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editExpense, setEditExpense] = useState("");
  const [editTax, setEditTax] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editDesc, setEditDesc] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Single Delete state
  const [deletingProject, setDeletingProject] = useState<ProjectWithFinancials | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Feedback notification toast
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg((current) => (current?.text === text ? null : current));
    }, 4500);
  };

  // Dynamic treasury calculations directly tied to active projects for instant response
  const treasury = useMemo(() => {
    let totalRevenue = 0;
    let companyVault = 0;
    let taxReserves = 0;
    let totalExpenses = 0;

    for (const p of projects) {
      const b = p.totalBudget || 0;
      const taxAmt = Math.round((b * (p.taxPercent / 100)) * 100) / 100;
      const exp = p.expenseAmount || 0;
      const netVault = Math.max(0, b - exp - taxAmt);

      totalRevenue += b;
      companyVault += netVault;
      taxReserves += taxAmt;
      totalExpenses += exp;
    }

    return {
      totalRevenue,
      companyVault,
      taxReserves,
      totalExpenses,
      totalTeamPayouts: 0,
      disbursedPayouts: 0,
      pendingPayouts: 0,
    };
  }, [projects]);

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
      await updateProjectBudget(currentProject.id, {
        companyPercent: 100.0,
        taxPercent,
        expenseAmount,
      });

      setSaveSuccessMsg("Company budget & project P&L saved successfully!");
      showFeedback("success", `Updated financials for "${currentProject.name}"`);

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
      showFeedback("error", "Failed to update project budget.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- SELECTION HELPERS ---
  const handleToggleSelectAll = () => {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(projects.map((p) => p.id));
    }
  };

  const handleToggleSelectOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // --- SINGLE EDIT ---
  const handleOpenEdit = (p: ProjectWithFinancials, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProject(p);
    setEditName(p.name);
    setEditClient(p.clientName || "");
    setEditBudget(String(p.totalBudget));
    setEditExpense(String(p.expenseAmount));
    setEditTax(String(p.taxPercent));
    setEditStatus(p.status);
    setEditDesc(p.description || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const parsedBudget = Number(editBudget) || 0;
    const parsedTax = Number(editTax) || 0;
    const parsedExpense = Number(editExpense) || 0;

    // Fast optimistic UI update (0ms lag)
    const prevProjects = [...projects];
    const updatedProject: ProjectWithFinancials = {
      ...editingProject,
      name: editName.trim(),
      clientName: editClient.trim() || null,
      totalBudget: parsedBudget,
      expenseAmount: parsedExpense,
      taxPercent: parsedTax,
      status: editStatus,
      description: editDesc.trim() || null,
      companyAmount: parsedBudget,
      taxAmount: Math.round(((parsedBudget * parsedTax) / 100) * 100) / 100,
    };

    setProjects((prev) =>
      prev.map((p) => (p.id === editingProject.id ? updatedProject : p))
    );
    if (selectedProjectId === editingProject.id) {
      setTaxPercent(parsedTax);
      setExpenseAmount(parsedExpense);
    }

    setEditingProject(null);
    showFeedback("success", `Updated "${updatedProject.name}" successfully!`);

    // Background server action
    try {
      setIsSavingEdit(true);
      await updateProjectBudget(editingProject.id, {
        name: updatedProject.name,
        clientName: updatedProject.clientName || undefined,
        totalBudget: updatedProject.totalBudget,
        expenseAmount: updatedProject.expenseAmount,
        taxPercent: updatedProject.taxPercent,
        status: updatedProject.status,
        description: updatedProject.description || undefined,
      });
    } catch {
      setProjects(prevProjects);
      showFeedback("error", `Failed to save changes for "${editingProject.name}". Restored.`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // --- SINGLE DELETE ---
  const handleOpenDelete = (p: ProjectWithFinancials, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingProject(p);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    const targetId = deletingProject.id;
    const targetName = deletingProject.name;

    // Fast optimistic UI update (0ms lag)
    const prevProjects = [...projects];
    setProjects((prev) => prev.filter((p) => p.id !== targetId));
    setSelectedProjectIds((prev) => prev.filter((id) => id !== targetId));

    if (selectedProjectId === targetId) {
      const remaining = prevProjects.filter((p) => p.id !== targetId);
      if (remaining.length > 0) {
        setSelectedProjectId(remaining[0].id);
      }
    }

    setDeletingProject(null);
    showFeedback("success", `Deleted "${targetName}" successfully!`);

    // Background server action
    try {
      setIsDeletingSingle(true);
      await deleteProject(targetId);
    } catch {
      setProjects(prevProjects);
      showFeedback("error", `Failed to delete "${targetName}". Restored.`);
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // --- BULK DELETE ---
  const handleBulkDelete = async () => {
    if (selectedProjectIds.length === 0) return;
    const count = selectedProjectIds.length;
    const idsToDelete = [...selectedProjectIds];

    // Fast optimistic UI update (0ms lag)
    const prevProjects = [...projects];
    setProjects((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
    setSelectedProjectIds([]);
    setShowBulkDeleteConfirm(false);

    if (idsToDelete.includes(selectedProjectId)) {
      const remaining = prevProjects.filter((p) => !idsToDelete.includes(p.id));
      if (remaining.length > 0) {
        setSelectedProjectId(remaining[0].id);
      }
    }

    showFeedback("success", `Successfully deleted ${count} project${count > 1 ? "s" : ""}!`);

    // Background server action
    try {
      setIsBulkProcessing(true);
      await deleteMultipleProjects(idsToDelete);
    } catch {
      setProjects(prevProjects);
      setSelectedProjectIds(idsToDelete);
      showFeedback("error", "Failed to delete selected projects on server. Restored.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- BULK EDIT ---
  const handleBulkEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProjectIds.length === 0) return;

    const idsToUpdate = [...selectedProjectIds];
    const prevProjects = [...projects];

    const updates: { status?: string; taxPercent?: number } = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkTaxPercent !== "") updates.taxPercent = Number(bulkTaxPercent);

    // Fast optimistic UI update (0ms lag)
    setProjects((prev) =>
      prev.map((p) => {
        if (!idsToUpdate.includes(p.id)) return p;
        const newTax = updates.taxPercent !== undefined ? updates.taxPercent : p.taxPercent;
        const newStatus = updates.status || p.status;
        const newTaxAmt = Math.round(((p.totalBudget * newTax) / 100) * 100) / 100;
        return {
          ...p,
          status: newStatus,
          taxPercent: newTax,
          taxAmount: newTaxAmt,
        };
      })
    );

    setShowBulkEditModal(false);
    showFeedback("success", `Updated ${idsToUpdate.length} project${idsToUpdate.length > 1 ? "s" : ""} successfully!`);

    // Background server action
    try {
      setIsBulkProcessing(true);
      await bulkUpdateProjects(idsToUpdate, updates);
    } catch {
      setProjects(prevProjects);
      showFeedback("error", "Failed to bulk update projects. Restored.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- CREATE NEW PROJECT ---
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
        showFeedback("success", `Created new project "${res.project.name}"`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  const formatCurrency = (amount: number, _curr = "INR") => {
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

      {/* Floating / Sticky Bulk Action Bar for Multiple Select */}
      {selectedProjectIds.length > 0 && (
        <div className="sticky top-20 z-30 p-3 sm:p-4 rounded-2xl bg-indigo-950/95 dark:bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl text-white flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-md">
              {selectedProjectIds.length}
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedProjectIds.length} project{selectedProjectIds.length > 1 ? "s" : ""} selected</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-800/80 text-indigo-200 border border-indigo-700">
                  Multiple Selection
                </span>
              </p>
              <p className="text-xs text-indigo-300">
                Execute batch edit or fast delete across selected projects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowBulkEditModal(true)}
              className="bg-white/15 hover:bg-white/25 text-white border-white/20 text-xs font-bold"
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Bulk Edit ({selectedProjectIds.length})
            </Button>

            <Button
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-950/50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete Selected ({selectedProjectIds.length})
            </Button>

            <button
              onClick={() => setSelectedProjectIds([])}
              className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-colors ml-1"
              title="Deselect all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real-time Feedback Banner */}
      {feedbackMsg && (
        <div
          className={cn(
            "p-3 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all animate-in fade-in",
            feedbackMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
          )}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-1 w-full overflow-hidden flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setActiveTab("projects")}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              activeTab === "projects"
                ? "bg-indigo-600 text-white shadow-md font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <FolderKanban className="w-4 h-4 shrink-0" />
            <span>Projects Directory ({projects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              activeTab === "ledger"
                ? "bg-indigo-600 text-white shadow-md font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Company Project Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              activeTab === "vault"
                ? "bg-indigo-600 text-white shadow-md font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Company Account Vault</span>
          </button>
        </div>

        {/* Quick Toolbar: Select All toggle */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <button
              onClick={handleToggleSelectAll}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {selectedProjectIds.length === projects.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Select All ({projects.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: PROJECTS DIRECTORY */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <FolderKanban className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No budget projects yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create a budget project to start tracking corporate revenue, tool expenses, and company vault retention.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreatingProject(true)}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => {
                const taxAmt = (p.totalBudget * p.taxPercent) / 100;
                const netVault = Math.max(0, p.totalBudget - p.expenseAmount - taxAmt);
                const isSelected = selectedProjectIds.includes(p.id);

                return (
                  <Card
                    key={p.id}
                    className={cn(
                      "p-6 border flex flex-col justify-between shadow-xs transition-all relative overflow-hidden",
                      isSelected
                        ? "border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800"
                    )}
                  >
                    <div className="space-y-4">
                      {/* Card Top: Multi-select Checkbox, Client Tag, Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelectOne(p.id, e)}
                            className="mt-0.5 p-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                            title={isSelected ? "Deselect project" : "Select project"}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-100 dark:fill-indigo-950" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 hover:text-slate-400" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block truncate">
                              {p.clientName || "Direct Client"}
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                              {p.name}
                            </h3>
                          </div>
                        </div>
                        <Badge
                          variant={
                            p.status === "ACTIVE"
                              ? "inProgress"
                              : p.status === "COMPLETED"
                              ? "done"
                              : "todo"
                          }
                          className="shrink-0 text-[10px]"
                        >
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

                    {/* Card Actions: Separate Edit, Separate Delete, and P&L Ledger buttons */}
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {/* Separate Edit Button */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => handleOpenEdit(p, e)}
                          className="h-8 px-2.5 text-xs font-semibold hover:border-indigo-300 text-slate-700 dark:text-slate-200"
                          title="Edit project budget & parameters"
                        >
                          <Pencil className="w-3.5 h-3.5 sm:mr-1 text-indigo-600 dark:text-indigo-400" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>

                        {/* Separate Delete Button */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => handleOpenDelete(p, e)}
                          className="h-8 px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>

                      {/* Ledger View Button */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          handleSelectProject(p.id);
                          setActiveTab("ledger");
                        }}
                        className="h-8 px-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        <Sliders className="w-3.5 h-3.5 sm:mr-1 text-slate-500" />
                        <span className="hidden sm:inline">Ledger</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPANY REVENUE & PROJECT P&L (NO SPLITS - 100% COMPANY ACCOUNT) */}
      {activeTab === "ledger" && currentProject && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Configuration Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-4 sm:p-6 border-slate-200 dark:border-slate-800 space-y-4 sm:space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Active Project
                  </span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => handleSelectProject(e.target.value)}
                      className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-w-[140px] truncate"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {/* Quick Edit button for active project */}
                    <button
                      onClick={() => handleOpenEdit(currentProject)}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Edit project details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Delete button for active project */}
                    <button
                      onClick={() => handleOpenDelete(currentProject)}
                      className="p-1 rounded-lg border border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Receipt className="w-4 h-4 text-slate-500 shrink-0" /> Direct Expenses / Tools (₹)
                    </span>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
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
                      <Percent className="w-4 h-4 shrink-0" /> Tax & GST Reserve ({taxPercent}%)
                    </span>
                    <span className="text-sm font-bold text-amber-600 shrink-0">
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
          <Card className="p-6 sm:p-8 border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Company Treasury Ledger
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  Company Account Retention & Treasury
                </h2>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black text-lg self-start sm:self-auto">
                Vault: {formatCurrency(treasury.companyVault)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3 w-8">
                      <button
                        onClick={handleToggleSelectAll}
                        className="p-1 hover:text-indigo-600 cursor-pointer"
                        title="Select all"
                      >
                        {selectedProjectIds.length === projects.length && projects.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Total Contract</th>
                    <th className="py-3 px-3">Company Share</th>
                    <th className="py-3 px-3">Retained in Vault</th>
                    <th className="py-3 px-3">Direct Expenses</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {projects.map((p) => {
                    const taxAmt = (p.totalBudget * p.taxPercent) / 100;
                    const netVault = Math.max(0, p.totalBudget - p.expenseAmount - taxAmt);
                    const isSelected = selectedProjectIds.includes(p.id);

                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "transition-colors",
                          isSelected
                            ? "bg-indigo-50/40 dark:bg-indigo-950/30"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        )}
                      >
                        <td className="py-3.5 px-3">
                          <button
                            onClick={(e) => handleToggleSelectOne(p.id, e)}
                            className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-slate-400">{p.clientName || "Direct"}</span>
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
                          <Badge
                            variant={
                              p.status === "ACTIVE"
                                ? "inProgress"
                                : p.status === "COMPLETED"
                                ? "done"
                                : "todo"
                            }
                            className="text-[10px]"
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => handleOpenEdit(p, e)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit project"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleOpenDelete(p, e)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                handleSelectProject(p.id);
                                setActiveTab("ledger");
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="View Ledger"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* MODAL 1: Create New Budget Project */}
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
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
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

      {/* MODAL 2: SEPARATE EDIT PROJECT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                Edit Budget Project
              </h3>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={editClient}
                    onChange={(e) => setEditClient(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PLANNING">PLANNING</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Contract Budget (₹) *
                  </label>
                  <input
                    type="number"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
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
                    value={editExpense}
                    onChange={(e) => setEditExpense(e.target.value)}
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
                  min="0"
                  max="30"
                  value={editTax}
                  onChange={(e) => setEditTax(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              {/* Live Preview Box */}
              {(() => {
                const b = Number(editBudget) || 0;
                const exp = Number(editExpense) || 0;
                const t = Number(editTax) || 0;
                const taxVal = Math.round((b * (t / 100)) * 100) / 100;
                const net = Math.max(0, b - exp - taxVal);
                const margin = b > 0 ? ((net / b) * 100).toFixed(1) : "0.0";
                return (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Net Vault Retained</span>
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(net)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">Net Margin</span>
                      <span className="font-bold text-slate-900 dark:text-white">{margin}%</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProject(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingEdit}
                  className="font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 3: SEPARATE DELETE CONFIRMATION MODAL */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Budget Project?
                </h3>
                <p className="text-xs text-slate-500">
                  This action permanently removes the project budget.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                {deletingProject.name}
              </p>
              <p className="text-slate-500">
                Client: {deletingProject.clientName || "Direct"} • Total Contract:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatCurrency(deletingProject.totalBudget, deletingProject.currency)}
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingProject(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeletingSingle}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Delete Project
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 4: BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete {selectedProjectIds.length} Selected Projects?
                </h3>
                <p className="text-xs text-slate-500">
                  This action permanently removes all selected project budgets from the company ledger.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete these {selectedProjectIds.length} projects? This will update corporate treasury reserves and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleBulkDelete}
                isLoading={isBulkProcessing}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Delete {selectedProjectIds.length} Projects
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 5: BULK EDIT MODAL */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Bulk Edit ({selectedProjectIds.length} Projects)
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Change Status for all selected
                </label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PLANNING">PLANNING</option>
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Change Tax & GST Reserve (%) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={bulkTaxPercent}
                  onChange={(e) => setBulkTaxPercent(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isBulkProcessing}
                  className="font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Apply to {selectedProjectIds.length} Projects
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
