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

// Retrieve dynamic Firebase config passed via service worker URL query parameters
const urlParams = new URLSearchParams(location.search);
const apiKey = urlParams.get("apiKey");
const projectId = urlParams.get("projectId");
const messagingSenderId = urlParams.get("messagingSenderId");
const appId = urlParams.get("appId");

if (projectId) {
  try {
    firebase.initializeApp({
      apiKey: apiKey || "",
      authDomain: `${projectId}.firebaseapp.com`,
      projectId: projectId,
      storageBucket: `${projectId}.appspot.com`,
      messagingSenderId: messagingSenderId || "",
      appId: appId || "",
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title || payload.data?.title || "Taskora Alert";
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || "You have a new update in Taskora.",
        icon: "/globe.svg",
        badge: "/globe.svg",
        tag: payload.data?.tag || "taskora-notification",
        vibrate: [200, 100, 200],
        data: {
          url: payload.data?.link || payload.fcmOptions?.link || "/dashboard",
        },
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (err) {
    console.warn("FCM background initialization:", err);
  }
}

// Fallback push event handler for Web Push payloads
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.notification?.title || data.title || "Taskora Notification";
    const options = {
      body: data.notification?.body || data.body || "New update in Taskora",
      icon: "/globe.svg",
      badge: "/globe.svg",
      tag: data.tag || "taskora-notification",
      vibrate: [200, 100, 200],
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
        icon: "/globe.svg",
        badge: "/globe.svg",
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
