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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
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
export const requestPushPermissionAndGetToken = async (): Promise<{
  token: string | null;
  error?: string;
  status: "granted" | "denied" | "default" | "unsupported";
}> => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { token: null, status: "unsupported", error: "Notifications not supported on this browser" };
  }

  const supported = await isSupported();
  if (!supported) {
    return { token: null, status: "unsupported", error: "Firebase messaging is not supported in this browser" };
  }

  // Check notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { token: null, status: permission, error: "Notification permission was not granted" };
  }

  const app = initFirebaseApp();
  if (!app) {
    return {
      token: null,
      status: "granted",
      error: "Firebase project config is not yet configured. Please provide Firebase environment variables.",
    };
  }

  try {
    const config = getFirebaseConfig();

    // Register service worker with dynamic query params for background handler
    const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(config.apiKey || "")}&projectId=${encodeURIComponent(config.projectId || "")}&messagingSenderId=${encodeURIComponent(config.messagingSenderId || "")}&appId=${encodeURIComponent(config.appId || "")}`;
    const registration = await navigator.serviceWorker.register(swUrl, { scope: "/" });
    await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);
    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: config.vapidKey,
    });

    if (currentToken) {
      // Save token to backend
      await fetch("/api/v1/notifications/push-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: currentToken,
          platform: /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "web",
          userAgent: navigator.userAgent,
        }),
      });

      return { token: currentToken, status: "granted" };
    } else {
      return { token: null, status: "granted", error: "No registration token available. Request permission to generate one." };
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
