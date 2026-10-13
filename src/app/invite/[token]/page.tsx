import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getValidInvitation } from "@/lib/invitations";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AcceptInviteForm } from "./AcceptInviteForm";
import { Building2, AlertTriangle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Workspace Invitation — Taskora",
  description: "Accept an invitation to collaborate on Taskora.",
};

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invitation = await getValidInvitation(token);
  const session = await auth();

  if (!invitation) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Invitation Link Invalid
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This invitation link is invalid, expired, or has already been accepted. Please contact your workspace administrator for a new invitation.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4F46E5] hover:underline"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const roleBadgeVariant: "done" | "inReview" | "todo" | "inProgress" =
    invitation.role === "ADMIN"
      ? "inReview"
      : invitation.role === "MEMBER"
      ? "todo"
      : "inProgress";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] flex items-center justify-center text-white shadow-md">
            <span className="font-bold text-xl tracking-tight">T</span>
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Workspace Invitation
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          You have been invited to join a Taskora workspace
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="p-8 shadow-sm space-y-6">
          {/* Workspace Invitation Banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 border border-[#4F46E5]/20 flex items-center justify-center text-[#4F46E5] shrink-0 font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                  {invitation.workspace.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Invited by {invitation.invitedBy.name || invitation.invitedBy.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800 text-xs">
              <span className="text-slate-400 dark:text-slate-500">Assigned Role:</span>
              <Badge variant={roleBadgeVariant}>{invitation.role}</Badge>
              {invitation.designation && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium truncate">
                    {invitation.designation.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <AcceptInviteForm
            token={token}
            email={invitation.email}
            isAuthenticated={Boolean(session?.user?.id)}
            currentUserEmail={session?.user?.email || undefined}
          />
        </Card>
      </div>
    </div>
  );
}
