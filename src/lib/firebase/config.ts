"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging, isSupported } from "firebase/messaging";

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  vapidKey?: string;
}

export const getFirebaseConfig = (): FirebaseClientConfig => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDPMAqbXB-VwXEX1zIOkAkgV-W0R5yadjs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "taskora-app-2aaaa.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "taskora-app-2aaaa",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "taskora-app-2aaaa.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "263023964191",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:263023964191:web:a76210f266bcf69951a52a",
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BH7LKC8vqKcap4z6bFXIEN41hC9IfB38ZtEtBiJb-UUXmtH6cFHTzukdJfhxEAJs8iPD0nnIfrsyn1NPoKpzofE",
});

export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId && config.messagingSenderId);
};

export const initFirebaseApp = (): FirebaseApp | null => {
  if (typeof window === "undefined") return null;

  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
    projectId: config.projectId,
    storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });
};

/**
 * Register Service Worker and request Push Notification permission
 * Returns FCM device token or null
 */
export const requestPushPermissionAndGetToken = async (
  showWelcome = true
): Promise<{
  token: string | null;
  error?: string;
  status: "granted" | "denied" | "default" | "unsupported";
}> => {
  if (typeof window === "undefined") {
    return { token: null, status: "unsupported", error: "Window undefined" };
  }

  // Detect iOS Safari outside of standalone PWA mode
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isIos && !isStandalone && !("Notification" in window)) {
    return {
      token: null,
      status: "unsupported",
      error:
        "On iPhone, Apple requires you to add Taskora to your Home Screen first. Tap Safari's Share button (⎋), tap 'Add to Home Screen' (➕), then open Taskora from your Home Screen to enable lock-screen notifications.",
    };
  }

  if (!("Notification" in window)) {
    return { token: null, status: "unsupported", error: "Notifications not supported on this browser" };
  }

  // 1. Request OS permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { token: null, status: permission, error: "Notification permission was not granted" };
  }

  // 2. Register standard Service Worker without query strings
  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
  } catch (swErr) {
    console.error("Service Worker registration error:", swErr);
    return {
      token: null,
      status: "granted",
      error: "Service Worker error: " + (swErr instanceof Error ? swErr.message : String(swErr)),
    };
  }

  // 3. Display a native phone notification to verify lock screen & banner capability (when requested)
  if (showWelcome) {
    try {
      await registration.showNotification(
        "🔔 Taskora Notifications Active",
        {
          body: "You will now receive instant phone alerts for tasks and team chats!",
          icon: "/icon-192.png",
          badge: "/badge-72.png",
          tag: "taskora-welcome-alert",
          vibrate: [300, 150, 300],
          renotify: true,
          data: { url: "/dashboard" },
        } as unknown as NotificationOptions
      );
    } catch (notifErr) {
      console.warn("Direct notification display notice:", notifErr);
    }
  }

  // 4. Connect to Firebase Cloud Messaging (FCM)
  const app = initFirebaseApp();
  if (!app) {
    return {
      token: null,
      status: "granted",
      error: "Firebase project config is not yet initialized.",
    };
  }

  try {
    const config = getFirebaseConfig();
    const messaging = getMessaging(app);
    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: config.vapidKey,
    });

    if (currentToken) {
      // Save token to database
      await fetch("/api/v1/notifications/push-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: currentToken,
          platform: isIos ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "web",
          userAgent: navigator.userAgent,
        }),
      });

      return { token: currentToken, status: "granted" };
    } else {
      return { token: null, status: "granted", error: "No registration token returned from Firebase." };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to obtain push token";
    console.error("FCM Token Error:", err);
    return { token: null, status: "granted", error: message };
  }
};

/**
 * Foreground message listener (when user is inside the app)
 */
export const subscribeToForegroundMessages = (
  callback: (payload: { title?: string; body?: string; link?: string }) => void
) => {
  if (typeof window === "undefined") return () => {};

  const app = initFirebaseApp();
  if (!app) return () => {};

  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title;
      const body = payload.notification?.body || payload.data?.body;
      const link = payload.data?.link || payload.fcmOptions?.link;
      callback({ title, body, link });
    });
  } catch (err) {
    console.warn("Foreground message subscription warning:", err);
    return () => {};
  }
};
