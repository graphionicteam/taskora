"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loginAction } from "@/server/actions/auth.actions";

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");

  // Validate callbackUrl to prevent open redirects (must be relative path starting with /)
  const callbackUrl =
    rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/dashboard";

  const registered = searchParams.get("registered") === "true";

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(null, formData);
      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.success) {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  return (
    <Card className="p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm rounded-xl bg-surface">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome to Taskora
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
          Sign in to your productivity workspace
        </p>
      </div>

      {registered && (
        <div
          role="status"
          className="mb-5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300"
        >
          Account created successfully! Please sign in with your credentials.
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-300"
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            placeholder="you@company.com"
            className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 disabled:opacity-50 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isPending}
            placeholder="••••••••"
            className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 disabled:opacity-50 transition-colors"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isPending}
            disabled={isPending}
            className="w-full font-semibold shadow-xs"
          >
            Sign In
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-600 dark:text-slate-400">
        <span>Need an account? </span>
        <Link
          href="/register"
          className="font-semibold text-[#4F46E5] hover:text-[#4338CA] dark:text-indigo-400 underline underline-offset-4"
        >
          Sign up
        </Link>
      </div>
    </Card>
  );
};
