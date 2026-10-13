"use client";

import React, { useActionState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction, ActionResult } from "@/server/actions/workspace.actions";
import { Button } from "@/components/ui/Button";
import { ArrowRight, UserCheck, Lock, User } from "lucide-react";

interface AcceptInviteFormProps {
  token: string;
  email: string;
  isAuthenticated: boolean;
  currentUserEmail?: string;
}

export function AcceptInviteForm({
  token,
  email,
  isAuthenticated,
  currentUserEmail,
}: AcceptInviteFormProps) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const res = await acceptInvitationAction(token, prev, formData);
      if (res?.success) {
        router.push("/dashboard");
        router.refresh();
      }
      return res;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-sm text-rose-700 dark:text-rose-400">
          {state.error}
        </div>
      )}

      {isAuthenticated ? (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            Accepting with your signed-in account:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {currentUserEmail}
            </span>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isPending ? "Joining Workspace..." : "Accept Invitation & Join"}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Invited Email Address
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Your Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Jordan Smith"
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Set Account Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="At least 8 characters (mixed case + number)"
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            <span>
              {isPending ? "Creating Account..." : "Create Account & Join Workspace"}
            </span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </form>
  );
}
