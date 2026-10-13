import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { InitialOwnerForm } from "./InitialOwnerForm";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Root Workspace Setup — Taskora",
  description: "Initialize the primary owner account and workspace for Taskora.",
};

export default async function InitialOwnerPage() {
  // Authoritative check: Permanently disable if any user already exists
  const userCount = await db.user.count();
  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] flex items-center justify-center text-white shadow-md">
            <span className="font-bold text-xl tracking-tight">T</span>
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Taskora System Initialization
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          First-run root owner and workspace provisioning
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <Card className="p-8 shadow-sm">
          <div className="mb-6 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold block mb-0.5">Dual-Key Security Verification</span>
              This initialization gateway is strictly locked. Submitting requires the server-side setup secret from your deployment configuration. Once completed, this route is permanently disabled.
            </div>
          </div>

          <InitialOwnerForm />
        </Card>
      </div>
    </div>
  );
}
