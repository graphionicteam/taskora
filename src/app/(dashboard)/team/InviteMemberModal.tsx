"use client";

import React, { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { createInvitationAction } from "@/server/actions/workspace.actions";
import { Mail, Copy, Check, UserPlus, AlertCircle } from "lucide-react";
import { WorkspaceRole } from "@prisma/client";

interface Designation {
  id: string;
  name: string;
}

interface InviteMemberModalProps {
  workspaceId: string;
  designations: Designation[];
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMemberModal({
  workspaceId,
  designations,
  isOpen,
  onClose,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("MEMBER");
  const [designationId, setDesignationId] = useState<string>("");
  const [error, setError] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError("");
    const formData = new FormData();
    formData.append("email", email.trim());
    formData.append("role", role);
    if (designationId) {
      formData.append("designationId", designationId);
    }

    startTransition(async () => {
      const res = await createInvitationAction(workspaceId, null, formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.data?.inviteUrl) {
        setGeneratedUrl(res.data.inviteUrl);
      }
    });
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setEmail("");
    setRole("MEMBER");
    setDesignationId("");
    setError("");
    setGeneratedUrl("");
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleReset()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="w-5 h-5 text-[#4F46E5]" />
            <span>Invite Team Member</span>
          </DialogTitle>
        </DialogHeader>

        {generatedUrl ? (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold block mb-0.5">Invitation Link Created</span>
              This single-use link is valid for 7 days. The raw token is stored as a secure SHA-256 hash in the database.
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-semibold text-slate-500 uppercase tracking-wider block">
                Shareable Invitation Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 select-all"
                />
                <Button
                  type="button"
                  onClick={handleCopy}
                  className="h-10 px-3 bg-[#4F46E5] text-white hover:bg-[#4338CA] text-xs flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="button" variant="outline" onClick={handleReset} className="h-9 text-xs">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Workspace Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              >
                <option value="MEMBER">Member (Full collaboration & task creation)</option>
                <option value="ADMIN">Admin (Member management & settings)</option>
                <option value="GUEST">Guest (Restricted task viewer)</option>
              </select>
            </div>

            {/* Designation Selection */}
            <div className="space-y-1.5">
              <label htmlFor="invite-designation" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Professional Designation (Optional)
              </label>
              <select
                id="invite-designation"
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              >
                <option value="">No specific designation</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleReset} className="h-9 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !email.trim()}
                className="h-9 px-4 bg-[#4F46E5] text-white hover:bg-[#4338CA] text-xs font-medium"
              >
                {isPending ? "Generating..." : "Generate Invitation Link"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
