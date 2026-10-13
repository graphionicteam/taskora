"use client";

import React, { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/server/actions/auth.actions";

export const LogoutButton: React.FC = () => {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <Button
      variant="destructive"
      size="md"
      isLoading={isPending}
      disabled={isPending}
      onClick={handleLogout}
      className="gap-2"
    >
      <LogOut className="w-4 h-4" />
      <span>Log Out</span>
    </Button>
  );
};
