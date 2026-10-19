/* eslint-disable no-undef */
// Taskora — Service Worker for Mobile & Web Push Notifications (FCM & Web Push)
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Firebase config defaults
const apiKey = "AIzaSyDPMAqbXB-VwXEX1zIOkAkgV-W0R5yadjs";
const projectId = "taskora-app-2aaaa";
const messagingSenderId = "263023964191";
const appId = "1:263023964191:web:a76210f266bcf69951a52a";

try {
  firebase.initializeApp({
    apiKey: apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId: projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: messagingSenderId,
    appId: appId,
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || payload.data?.title || "Taskora Alert";
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || "You have a new update in Taskora.",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: payload.data?.tag || "taskora-notification-" + Date.now(),
      renotify: true,
      vibrate: [300, 150, 300],
      data: {
        url: payload.data?.link || payload.fcmOptions?.link || "/dashboard",
      },
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn("FCM background messaging init warning:", err);
}

// Push event handler for direct Web Push payloads
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.notification?.title || data.title || "Taskora Notification";
    const options = {
      body: data.notification?.body || data.body || "New update in Taskora",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: data.tag || "taskora-notification-" + Date.now(),
      renotify: true,
      vibrate: [300, 150, 300],
      data: {
        url: data.link || data.data?.link || "/dashboard",
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Taskora Alert", {
        body: text,
        icon: "/icon-192.png",
        badge: "/badge-72.png",
        tag: "taskora-alert-" + Date.now(),
        renotify: true,
        vibrate: [300, 150, 300],
        data: { url: "/dashboard" },
      })
    );
  }
});

// Navigate or focus existing app window when user taps the notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(location.origin) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
