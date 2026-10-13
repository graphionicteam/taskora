"use client";

import React, { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { createDesignationAction, deleteDesignationAction } from "@/server/actions/workspace.actions";
import { Briefcase, Plus, Trash2, AlertCircle } from "lucide-react";

interface Designation {
  id: string;
  name: string;
  description?: string | null;
}

interface ManageDesignationsModalProps {
  workspaceId: string;
  designations: Designation[];
  isOpen: boolean;
  onClose: () => void;
}

export function ManageDesignationsModal({
  workspaceId,
  designations,
  isOpen,
  onClose,
}: ManageDesignationsModalProps) {
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setError("");
    const formData = new FormData();
    formData.append("name", newTitle.trim());

    startTransition(async () => {
      const res = await createDesignationAction(workspaceId, null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setNewTitle("");
      }
    });
  };

  const handleDelete = (id: string) => {
    setError("");
    startTransition(async () => {
      const res = await deleteDesignationAction(workspaceId, id);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Briefcase className="w-5 h-5 text-[#4F46E5]" />
            <span>Manage Job Designations</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Designations represent professional job titles (e.g. Lead Developer, Product Manager) and are distinct from access permissions.
          </p>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Designation Input */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Mobile Engineer"
              required
              className="flex-1 h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !newTitle.trim()}
              className="h-9 px-3 bg-[#4F46E5] text-white hover:bg-[#4338CA] text-xs font-medium shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </Button>
          </form>

          {/* Designations List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pt-1">
            {designations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No designations created yet.</p>
            ) : (
              designations.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{d.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(d.id)}
                    disabled={isPending}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    title="Delete designation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
