import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, MulticastMessage, SendResponse } from "firebase-admin/messaging";
import { db } from "@/lib/db";

// Singleton initialization for Firebase Admin SDK
function getFirebaseAdmin(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDf4eIy6Ck0aR6r
lryriMH0B5409AycUWop28IX4c/7Al6TbILTeHYxwRbit1oWJOdjrkKaPyV0qMje
aReZCidOoBKVtG1vmaxSld5J33bZzqI6LzMaU9R/uYCCuDyRacozA0phuD9wc7g4
IYk0KsZdt1VMhwn628CKlTvV8o2tLanFIPkhf0/Zss/Pj3dw3gfzoMZjHZ4mWxaN
412Lil0WRktHEIY3l5PT8P0/RczfXKIrDBWsThlUgpymw7RUjV0PGwi2uBXcp0CJ
GDiirfwCS48FLw6J5Y/qzjQHDpDEdiF9UugcgWYfTFol0WR2jj++in3ax3zLEfy6
WAVAe4VXAgMBAAECggEADSKOh9gRGs8UCpMkbJfwcSXFRWwQFVe9d8k54PbRofNo
oxOZtVh67r5aXmDNe0EdBj8iDzSnOOnyJwJZbRQobDd9/6R/Sy3j61B5ozHmIi86
W1mLkP7cF8ZFYOX4P7vKLiYCRituJWXUqA5no1TjIHpyGbROhJZB/J92zD2XzFIm
ZZHjJ4A+3G05R4mcrrj/31sr41MYh97PAXAoU/KJSb/4TldpljO4WM8KWKnHj5Ka
uG/O9bUzlO2kVUHqwG1see1bgVkQEgK6JWMgf3YZ4BQaD/TcPh6H8vEDeCTDbxDP
bjNC7hAzoePqw/q0sqlnR7gbdkSdEVU4uzUbe7MnEQKBgQD6vZGlSAyxM4KMEDxT
LQBH/s/6YYCac7NLQ82Nh3rxp+V9q1AvCw3L2c1G27rBnQteUf2f/Ttqntgmwd8S
8faa7Drgy7kifYll5Bf6Zj6feauUUbuXhPNOFWVd7M9FXBQtqNPzrAO7BllWW7WB
lIjEFwkUxg2hkkd5fJT2HExVLwKBgQDklBdeaOak/wAlmj84N4Dl0Q8qhE+XcOsd
Xbcmwzhq0BmxKHQceeI6ucwmQ09fl6l2x2Co2XlDTrfkbG7qmaOMUPXEAEOADNZW
NZgvrraDVn3hh6WFEa2b0XvZ0g8eaTten6bk55f82f6fZM81Jrmm/V4td4aRQUtG
KKq2IwKYWQKBgAQ9OD0nHq/QQyDDFYICfMK62CFPjLEPy7Q2DT+bTsTPJd4eC1kA
QtdzczkDdgDX+t05XaRaz6pZzSW6mV7koFq2K7ipORQQM0Z5uL4PBHgFwpTbXOSO
5t4nFnOkEU0G5YBwHkU8X0PGM7R2EHeEX1uRWCH1xz04D+VJ6erPR6sZAoGBAM2q
0jwIdz8OkrtCxo92oWwnZ1YCJvtEhsitghZGoYS6KePVWmQk5wGgG6hx+AEzHS/a
xYYn54xAUAYf6sz74MRoNDpfYlzdMB3xqzV8JoyWTj2XJ79L4MHLA31CHIhodxr0
294q4/6Gxyv0MNzKM1GluA+A9HvOHETMYo3vgm5BAoGBAINOgRt1QSLfWKXUg6sj
gLwSnmHXEPVmNYYqyFqCcA7I5PSZZbfMXAuxQQ8yCYEoGWHzmYQ8hozLBDbWycKB
SNp9efwOPom5fkqcrabLBW9a8Z3W59GXA9Ultc5kRG+6OSIt+RooLSwwFL8lXwIK
lZnLebXQ0tfjFtUJXhg7AYsT
-----END PRIVATE KEY-----`;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "taskora-app-2aaaa";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@taskora-app-2aaaa.iam.gserviceaccount.com";
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : DEFAULT_PRIVATE_KEY;

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

  // Option 2: Discrete credentials (Project ID, Client Email, Private Key)
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
          icon: "/icon-192.png",
          badge: "/badge-72.png",
          vibrate: [300, 150, 300],
          renotify: true,
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
