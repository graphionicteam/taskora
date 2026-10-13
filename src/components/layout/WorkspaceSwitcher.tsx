"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { switchWorkspaceAction, createWorkspaceAction } from "@/server/actions/workspace.actions";
import { WorkspaceRole } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface WorkspaceItem {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  role: WorkspaceRole;
}

interface WorkspaceSwitcherProps {
  activeWorkspace: {
    id: string;
    name: string;
    slug: string;
  } | null;
  workspaces: WorkspaceItem[];
}

export function WorkspaceSwitcher({
  activeWorkspace,
  workspaces,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) {
      setIsOpen(false);
      return;
    }
    startTransition(async () => {
      await switchWorkspaceAction(workspaceId);
      setIsOpen(false);
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setCreateError("");
    const formData = new FormData();
    formData.append("name", newWorkspaceName.trim());

    startTransition(async () => {
      const res = await createWorkspaceAction(null, formData);
      if (res?.error) {
        setCreateError(res.error);
      } else {
        setNewWorkspaceName("");
        setIsCreating(false);
        setIsOpen(false);
      }
    });
  };

  const displayName = activeWorkspace?.name || "Select Workspace";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-2 text-xs font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#4F46E5] max-w-[200px]"
        aria-label="Switch active workspace"
        aria-expanded={isOpen}
      >
        <div className="w-5 h-5 rounded-md bg-[#4F46E5]/10 border border-[#4F46E5]/20 flex items-center justify-center text-[#4F46E5] shrink-0 font-bold text-2xs">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <span className="truncate">{displayName}</span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl z-50 p-1.5 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Workspaces
          </div>

          <div className="space-y-0.5 max-h-52 overflow-y-auto">
            {workspaces.map((item) => {
              const isSelected = item.workspace.id === activeWorkspace?.id;
              return (
                <button
                  key={item.workspace.id}
                  type="button"
                  onClick={() => handleSwitch(item.workspace.id)}
                  disabled={isPending}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-300 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xs shrink-0 font-bold text-slate-600 dark:text-slate-300">
                      {item.workspace.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate">{item.workspace.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Badge variant={item.role === "OWNER" ? "done" : "todo"} className="text-[10px] py-0 px-1.5">
                      {item.role}
                    </Badge>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#4F46E5]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800">
            {isCreating ? (
              <form onSubmit={handleCreate} className="p-1 space-y-2">
                {createError && (
                  <p className="text-2xs text-rose-600 dark:text-rose-400">{createError}</p>
                )}
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="New workspace name"
                  autoFocus
                  required
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                />
                <div className="flex items-center gap-1.5">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !newWorkspaceName.trim()}
                    className="flex-1 h-7 text-xs bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                  >
                    {isPending ? "Creating..." : "Create"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setCreateError("");
                    }}
                    className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-[#4F46E5] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
