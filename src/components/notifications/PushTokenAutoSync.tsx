"use client";

import React, { useEffect, useState } from "react";
import { Bell, X, Check, Loader2 } from "lucide-react";
import {
  requestPushPermissionAndGetToken,
  subscribeToForegroundMessages,
} from "@/lib/firebase/config";

export function PushTokenAutoSync() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foregroundAlert, setForegroundAlert] = useState<{ title?: string; body?: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // 1. If already granted, auto-sync and refresh device token silently
    if (currentPermission === "granted") {
      requestPushPermissionAndGetToken(false).catch((err) =>
        console.warn("[PushTokenAutoSync notice]:", err)
      );
    } else if (currentPermission === "default") {
      // On mobile or standalone PWA, show quick prompt banner if not dismissed today
      const dismissed = localStorage.getItem("taskora_push_prompt_dismissed");
      const isDismissedToday =
        dismissed && Date.now() - Number(dismissed) < 1000 * 60 * 60 * 24;

      // For iPhone, only show banner if already running in standalone mode (installed to home screen)
      if (!isDismissedToday && (!isIos || isStandalone)) {
        setShowPromptBanner(true);
      }
    }

    // 2. Foreground real-time notification listener
    const unsubscribe = subscribeToForegroundMessages((payload) => {
      setForegroundAlert({
        title: payload.title || "Taskora Notification",
        body: payload.body || "You have an update on your tasks.",
      });
      setTimeout(() => setForegroundAlert(null), 6000);
    });

    return () => unsubscribe();
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await requestPushPermissionAndGetToken(true);
      if (res.status === "granted") {
        setPermission("granted");
        setShowPromptBanner(false);
      }
    } catch (err) {
      console.warn("Enable notifications error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPromptBanner(false);
    localStorage.setItem("taskora_push_prompt_dismissed", Date.now().toString());
  };

  return (
    <>
      {/* Foreground Toast Alert (when looking directly at the open app) */}
      {foregroundAlert && (
        <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 p-3.5 rounded-2xl bg-indigo-600 text-white shadow-2xl border border-indigo-400/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{foregroundAlert.title}</p>
            <p className="text-[11px] text-indigo-100 line-clamp-2">{foregroundAlert.body}</p>
          </div>
          <button
            type="button"
            onClick={() => setForegroundAlert(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Permission Prompt Banner for Mobile Users */}
      {showPromptBanner && permission === "default" && (
        <div className="fixed top-16 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-xl border border-indigo-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Enable Phone Alerts</p>
                <p className="text-[10px] text-indigo-200 truncate">
                  Get lock-screen notifications when tasks are assigned to you!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Enable</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
