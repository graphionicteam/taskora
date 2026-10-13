"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { registerAction } from "@/server/actions/auth.actions";

export const RegisterForm: React.FC = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await registerAction(null, formData);
      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.success) {
        router.push("/login?registered=true");
      }
    });
  };

  return (
    <Card className="p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create Taskora Account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Join your organization&apos;s workspace
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-300"
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            disabled={isPending}
            placeholder="Jane Doe"
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-50 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Work Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            placeholder="jane@company.com"
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-50 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            disabled={isPending}
            placeholder="At least 8 characters (letters & numbers)"
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-50 transition-colors"
          />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Must be 8–128 characters with at least one letter and one number.
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isPending}
            disabled={isPending}
            className="w-full"
          >
            Register Account
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <span>Already have an account? </span>
        <Link
          href="/login"
          className="font-medium text-[#4F46E5] hover:text-[#4338CA] dark:text-indigo-400 underline underline-offset-2"
        >
          Sign in
        </Link>
      </div>
    </Card>
  );
};
