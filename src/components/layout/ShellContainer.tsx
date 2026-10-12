import React from "react";
import { cn } from "@/lib/utils";

interface ShellContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const ShellContainer: React.FC<ShellContainerProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "w-full max-w-[1600px] mx-auto p-4 md:p-5 lg:p-6 pb-20 md:pb-6",
        className
      )}
    >
      {children}
    </div>
  );
};
