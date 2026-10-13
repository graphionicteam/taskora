"use client";

import React, { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  updateMemberRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/server/actions/workspace.actions";
import { WorkspaceRole, MemberStatus } from "@prisma/client";
import { UserCog, AlertCircle, ShieldAlert, ArrowRightLeft, UserX } from "lucide-react";

interface Designation {
  id: string;
  name: string;
}

interface Member {
  id: string;
  role: WorkspaceRole;
  status: MemberStatus;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  designation: {
    id: string;
    name: string;
  } | null;
}

interface MemberActionsModalProps {
  workspaceId: string;
  actorRole: WorkspaceRole;
  member: Member | null;
  designations: Designation[];
  isOpen: boolean;
  onClose: () => void;
}

export function MemberActionsModal({
  workspaceId,
  actorRole,
  member,
  designations,
  isOpen,
  onClose,
}: MemberActionsModalProps) {
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>(member?.role || "MEMBER");
  const [selectedDesignationId, setSelectedDesignationId] = useState<string>(
    member?.designation?.id || ""
  );
  const [error, setError] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!member) return null;

  const isOwner = actorRole === "OWNER";
  const isTargetOwner = member.role === "OWNER";

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const res = await updateMemberRoleAction(
        workspaceId,
        member.id,
        selectedRole,
        selectedDesignationId || null
      );
      if (res?.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  };

  const handleTransferOwnership = () => {
    setError("");
    startTransition(async () => {
      const res = await transferOwnershipAction(workspaceId, member.id);
      if (res?.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  };

  const handleRemoveMember = () => {
    setError("");
    startTransition(async () => {
      const res = await removeMemberAction(workspaceId, member.id);
      if (res?.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserCog className="w-5 h-5 text-[#4F46E5]" />
            <span>Manage Member — {member.user.name || member.user.email}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {confirmTransfer ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-3">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-semibold block mb-1">Confirm Ownership Transfer</span>
                  You are about to transfer primary workspace ownership to{" "}
                  <strong>{member.user.name || member.user.email}</strong>. You will automatically become an Administrator. This action cannot be undone unilaterally.
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmTransfer(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={handleTransferOwnership}
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isPending ? "Transferring..." : "Confirm Transfer"}
                </Button>
              </div>
            </div>
          ) : confirmRemove ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3">
              <div className="flex items-start gap-2 text-rose-800 dark:text-rose-300 text-xs">
                <UserX className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <span className="font-semibold block mb-1">Suspend Member Access</span>
                  This will suspend <strong>{member.user.name || member.user.email}</strong> from the workspace. Their task history and audit trail will be safely preserved.
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRemove(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={handleRemoveMember}
                  className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isPending ? "Suspending..." : "Confirm Suspension"}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Access Role
                </label>
                {isTargetOwner ? (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Owner (Single active owner — use ownership transfer to change)
                  </div>
                ) : (
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as WorkspaceRole)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="MEMBER">Member (Standard collaborator)</option>
                    {isOwner && <option value="ADMIN">Admin (Workspace administrator)</option>}
                    <option value="GUEST">Guest (Restricted task viewer)</option>
                  </select>
                )}
              </div>

              {/* Designation */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Professional Designation
                </label>
                <select
                  value={selectedDesignationId}
                  onChange={(e) => setSelectedDesignationId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value="">No designation</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  {!isTargetOwner && (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(true)}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      Suspend Member
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || isTargetOwner}
                    className="h-9 px-4 bg-[#4F46E5] text-white hover:bg-[#4338CA] text-xs font-medium"
                  >
                    {isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>

              {/* Transfer Ownership Option for Owner */}
              {isOwner && !isTargetOwner && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-500">Need to pass leadership?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmTransfer(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Transfer Ownership</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
