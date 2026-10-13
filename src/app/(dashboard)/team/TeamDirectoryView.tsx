"use client";

import React, { useState, useMemo } from "react";
import { Search, UserPlus, Briefcase, MoreHorizontal, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { WorkspaceRole, MemberStatus } from "@prisma/client";
import { InviteMemberModal } from "./InviteMemberModal";
import { ManageDesignationsModal } from "./ManageDesignationsModal";
import { MemberActionsModal } from "./MemberActionsModal";

interface Designation {
  id: string;
  name: string;
  description?: string | null;
}

interface Member {
  id: string;
  role: WorkspaceRole;
  status: MemberStatus;
  joinedAt: Date | string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  designation: {
    id: string;
    name: string;
  } | null;
}

interface TeamDirectoryViewProps {
  workspace: {
    id: string;
    name: string;
  };
  currentMemberRole: WorkspaceRole;
  currentUserId: string;
  members: Member[];
  designations: Designation[];
}

export function TeamDirectoryView({
  workspace,
  currentMemberRole,
  currentUserId,
  members,
  designations,
}: TeamDirectoryViewProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [designationFilter, setDesignationFilter] = useState<string>("ALL");

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDesignationsOpen, setIsDesignationsOpen] = useState(false);
  const [activeManagingMember, setActiveManagingMember] = useState<Member | null>(null);

  const canManage = currentMemberRole === "OWNER" || currentMemberRole === "ADMIN";

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // 1. Search filter
      const searchLower = search.toLowerCase();
      const nameMatch = m.user.name?.toLowerCase().includes(searchLower) || false;
      const emailMatch = m.user.email.toLowerCase().includes(searchLower);
      const desigMatch = m.designation?.name.toLowerCase().includes(searchLower) || false;
      const matchesSearch = !search || nameMatch || emailMatch || desigMatch;

      // 2. Role filter
      const matchesRole = roleFilter === "ALL" || m.role === roleFilter;

      // 3. Designation filter
      const matchesDesignation =
        designationFilter === "ALL" ||
        (designationFilter === "NONE" ? !m.designation : m.designation?.id === designationFilter);

      return matchesSearch && matchesRole && matchesDesignation;
    });
  }, [members, search, roleFilter, designationFilter]);

  const getRoleVariant = (role: WorkspaceRole): "done" | "inReview" | "todo" | "inProgress" => {
    switch (role) {
      case "OWNER":
        return "done";
      case "ADMIN":
        return "inReview";
      case "MEMBER":
        return "todo";
      case "GUEST":
        return "inProgress";
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return (email || "TM").slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Collaboration
            </span>
            <Badge variant="todo">{members.length} Members</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Team Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Members, roles, and professional designations for {workspace.name}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDesignationsOpen(true)}
              className="h-9 px-3 text-xs gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Job Titles</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsInviteOpen(true)}
              className="h-9 px-3.5 bg-[#4F46E5] text-white hover:bg-[#4338CA] text-xs font-medium gap-1.5 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, title..."
            className="w-full h-9 pl-9 pr-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs">
            {["ALL", "OWNER", "ADMIN", "MEMBER", "GUEST"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-md text-2xs font-semibold uppercase tracking-wider transition-colors ${
                  roleFilter === r
                    ? "bg-white dark:bg-slate-900 text-[#4F46E5] shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Designation Dropdown */}
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          >
            <option value="ALL">All Titles</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const isMe = member.user.id === currentUserId;
          const initials = getInitials(member.user.name, member.user.email);
          const isSuspended = member.status === "SUSPENDED";

          return (
            <Card
              key={member.id}
              className={`p-4 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700 ${
                isSuspended ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/30" : ""
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 border border-[#4F46E5]/20 flex items-center justify-center text-xs font-bold text-[#4F46E5] shrink-0">
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {member.user.name || "Team Member"}
                        </h3>
                        {isMe && (
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {member.user.email}
                      </p>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setActiveManagingMember(member)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Manage member"
                      aria-label="Manage member"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Role and Designation Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant={getRoleVariant(member.role)}>
                    {member.role}
                  </Badge>

                  {member.designation && (
                    <span className="text-2xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {member.designation.name}
                    </span>
                  )}

                  {isSuspended && (
                    <Badge variant="urgent">Suspended</Badge>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-2xs text-slate-400">
                <span>
                  Joined {new Date(member.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                {member.role === "OWNER" && (
                  <span className="inline-flex items-center gap-1 text-[#4F46E5] font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Primary Owner</span>
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <Card className="p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No team members found
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search criteria or role filters.
          </p>
        </Card>
      )}

      {/* Modals */}
      <InviteMemberModal
        workspaceId={workspace.id}
        designations={designations}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />

      <ManageDesignationsModal
        workspaceId={workspace.id}
        designations={designations}
        isOpen={isDesignationsOpen}
        onClose={() => setIsDesignationsOpen(false)}
      />

      {activeManagingMember && (
        <MemberActionsModal
          workspaceId={workspace.id}
          actorRole={currentMemberRole}
          member={activeManagingMember}
          designations={designations}
          isOpen={Boolean(activeManagingMember)}
          onClose={() => setActiveManagingMember(null)}
        />
      )}
    </div>
  );
}
