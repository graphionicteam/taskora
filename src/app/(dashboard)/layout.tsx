import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { ShellContainer } from "@/components/layout/ShellContainer";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar (248px / 72px) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Global 64px Header */}
        <Header />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
          <ShellContainer>{children}</ShellContainer>
        </main>
      </div>

      {/* Mobile 5-Tab Bar (Touch-first, <768px) */}
      <MobileTabBar />
    </div>
  );
}
