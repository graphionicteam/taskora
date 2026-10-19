import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, MulticastMessage, SendResponse } from "firebase-admin/messaging";
import { db } from "@/lib/db";

// Singleton initialization for Firebase Admin SDK
function getFirebaseAdmin(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  // Option 1: Full JSON Service Account string
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(parsed),
      });
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", err);
    }
  }

  // Option 2: Discrete env vars (Project ID, Client Email, Private Key)
  if (projectId && clientEmail && privateKey) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (err) {
      console.error("Failed to initialize Firebase Admin with discrete credentials:", err);
    }
  }

  // Option 3: Fallback using Project ID only (for local testing / mocked environments)
  if (projectId) {
    try {
      return initializeApp({
        projectId,
      });
    } catch (err) {
      console.warn("Firebase Admin fallback initialization notice:", err);
    }
  }

  return null;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
}

/**
 * Dispatch Push Notification to all registered devices of a User (iOS, Android, Web)
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sentCount: number; failureCount: number; error?: string }> {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      console.warn("[FCM Server] Firebase Admin is not configured. Push skipped.");
      return { sentCount: 0, failureCount: 0, error: "Firebase Admin is not configured" };
    }

    // Retrieve active device tokens for the user
    const tokens = await db.devicePushToken.findMany({
      where: { userId },
      select: { token: true, id: true },
    });

    if (tokens.length === 0) {
      return { sentCount: 0, failureCount: 0 };
    }

    const registrationTokens = tokens.map((t) => t.token);

    const message: MulticastMessage = {
      tokens: registrationTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: "/globe.svg",
          badge: "/globe.svg",
          vibrate: [200, 100, 200],
        },
        fcmOptions: {
          link: payload.link || "/dashboard",
        },
      },
      data: {
        link: payload.link || "/dashboard",
        ...(payload.data || {}),
      },
    };

    const messaging = getMessaging(adminApp);
    const response = await messaging.sendEachForMulticast(message);

    // Clean up stale or unregistered tokens from database
    const failedTokens: string[] = [];
    response.responses.forEach((resp: SendResponse, idx: number) => {
      if (!resp.success) {
        const error = resp.error;
        if (
          error?.code === "messaging/registration-token-not-registered" ||
          error?.code === "messaging/invalid-registration-token"
        ) {
          failedTokens.push(registrationTokens[idx]!);
        }
      }
    });

    if (failedTokens.length > 0) {
      await db.devicePushToken.deleteMany({
        where: { token: { in: failedTokens } },
      });
    }

    return {
      sentCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[FCM Server Error]:", error);
    return { sentCount: 0, failureCount: 0, error: message };
  }
}
