"use client";

import React, { useActionState } from "react";
import { useRouter } from "next/navigation";
import { initialOwnerSetupAction, ActionResult } from "@/server/actions/workspace.actions";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, ArrowRight, Building2, User, Mail, Lock, KeyRound } from "lucide-react";

export function InitialOwnerForm() {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const res = await initialOwnerSetupAction(prev, formData);
      if (res?.success) {
        router.push("/dashboard");
        router.refresh();
      }
      return res;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-sm text-rose-700 dark:text-rose-400">
          {state.error}
        </div>
      )}

      {/* Setup Secret Key */}
      <div className="space-y-1.5">
        <label
          htmlFor="setupSecret"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
        >
          Authorization Setup Secret
        </label>
        <div className="relative">
          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="setupSecret"
            name="setupSecret"
            type="password"
            required
            autoComplete="off"
            placeholder="Enter INITIAL_SETUP_SECRET from server"
            className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all"
          />
        </div>
        <p className="text-2xs text-slate-500 dark:text-slate-400">
          Required one-time authorization key configured in your deployment environment.
        </p>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Owner Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Alex Taylor"
              className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Work Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="alex@company.com"
              className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Master Password
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

        {/* Workspace Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="workspaceName"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Initial Workspace Name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="workspaceName"
              name="workspaceName"
              type="text"
              required
              placeholder="e.g. Acme Corp or Product Team"
              className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
      >
        <ShieldCheck className="w-4 h-4" />
        <span>{isPending ? "Initializing Root Deployment..." : "Initialize Root Workspace"}</span>
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </form>
  );
}
