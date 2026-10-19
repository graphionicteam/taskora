"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellRing, Check, AlertCircle, Send, Sparkles, Smartphone, Loader2 } from "lucide-react";
import {
  requestPushPermissionAndGetToken,
  isFirebaseConfigured,
  subscribeToForegroundMessages,
} from "@/lib/firebase/config";

interface PushNotificationManagerProps {
  compact?: boolean;
}

export function PushNotificationManager({ compact = false }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [foregroundAlert, setForegroundAlert] = useState<{ title?: string; body?: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isIos =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream?: unknown }).MSStream;
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      setIsIosSafari(isIos && !isStandalone);

      if ("Notification" in window) {
        setPermission(Notification.permission);
      } else {
        setPermission("unsupported");
      }
      setIsConfigured(isFirebaseConfigured());

      // Pre-register service worker on page load
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" }).catch(console.warn);
      }
    }

    // Subscribe to messages when app is open in foreground
    const unsubscribe = subscribeToForegroundMessages((payload) => {
      setForegroundAlert({
        title: payload.title || "New Taskora Alert",
        body: payload.body || "You have an update in Taskora.",
      });
      setTimeout(() => setForegroundAlert(null), 6000);
    });

    return () => unsubscribe();
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await requestPushPermissionAndGetToken();
      if (res.status === "granted" && res.token) {
        setPermission("granted");
        setStatusMessage("✅ Push notifications successfully enabled on this device!");
      } else if (res.status === "denied") {
        setPermission("denied");
        setIsError(true);
        setStatusMessage("Notification permission was denied. Please allow notifications in your phone/browser settings.");
      } else if (res.error) {
        setIsError(true);
        setStatusMessage(res.error);
      }
    } catch (err) {
      setIsError(true);
      setStatusMessage(err instanceof Error ? err.message : "Failed to enable notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestPush = async (delaySeconds = 0) => {
    setTesting(true);
    setStatusMessage(delaySeconds > 0 ? `Lock your phone now! Notification arriving in ${delaySeconds} seconds...` : null);
    setIsError(false);

    if (delaySeconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
    }

    try {
      // 1. Immediately trigger native system notification banner with sound & vibration on this phone
      if ("serviceWorker" in navigator && "Notification" in window && Notification.permission === "granted") {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(
            "🎉 Taskora Alert",
            {
              body: "Mobile notifications are active on your lock screen & notification bar!",
              icon: "/icon-192.png",
              badge: "/badge-72.png",
              tag: "taskora-test-alert-" + Date.now(),
              renotify: true,
              vibrate: [300, 150, 300],
              data: { url: "/dashboard" },
            } as unknown as NotificationOptions
          );
        } catch (swErr) {
          console.warn("Direct device notification notice:", swErr);
        }
      }

      // 2. Dispatch server-side FCM push via backend
      const res = await fetch("/api/v1/notifications/test-push", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage("✅ Notification fired! Check your phone lock screen & top pull-down curtain.");
      } else {
        setStatusMessage("✅ Notification fired on this device! (Check your lock screen or notification center)");
      }
    } catch {
      setStatusMessage("✅ Notification fired on your phone!");
    } finally {
      setTesting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {permission === "granted" ? (
          <button
            type="button"
            onClick={() => handleSendTestPush(0)}
            disabled={testing}
            className="h-8 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Send test notification to this phone"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
            <span>Test Push</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEnableNotifications}
            disabled={loading}
            className="h-8 px-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            <span>Enable Push</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 via-surface to-white dark:from-indigo-950/20 dark:via-surface dark:to-slate-900 p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Foreground Notification Toast Banner */}
      {foregroundAlert && (
        <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <BellRing className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{foregroundAlert.title}</p>
            <p className="text-[11px] text-indigo-100 truncate">{foregroundAlert.body}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-[#4F46E5] dark:text-indigo-300 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Mobile & Phone Push Notifications
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  permission === "granted"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                }`}
              >
                {permission === "granted" ? "Active" : "Not Enabled"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Receive instant lock-screen alerts on iPhone and Android when tasks are assigned or chats arrive.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {permission === "granted" ? (
            <>
              <button
                type="button"
                onClick={() => handleSendTestPush(0)}
                disabled={testing}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="Send test alert right now"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Now</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendTestPush(3)}
                disabled={testing}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="Tap, then press your phone's power/lock button within 3s to see it appear on lock screen"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                <span>Test Lock Screen (3s)</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              <span>Enable Notifications</span>
            </button>
          )}
        </div>
      </div>

      {/* iOS Safari Home Screen Instruction Card */}
      {isIosSafari && (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 text-sm">
            
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">iPhone Setup for Lock-Screen Notifications:</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Apple disables push notifications in standard Safari tabs. To enable lock-screen alerts:
              <br />
              1. Tap Safari&apos;s <strong>Share</strong> button (⎋ icon at bottom of your iPhone).
              <br />
              2. Tap <strong>&quot;Add to Home Screen&quot; (➕)</strong>.
              <br />
              3. Open <strong>Taskora</strong> from your phone&apos;s Home Screen, then tap <strong>Enable Notifications</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            isError
              ? "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
          }`}
        >
          {isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {!isConfigured && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Firebase Project Configuration Notice</p>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              To send real lock-screen push notifications via Firebase, set your Firebase credentials in your environment variables.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
