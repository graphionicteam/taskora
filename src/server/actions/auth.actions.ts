"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

export interface ActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Server Action for authenticating an existing user.
 */
export async function loginAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  const parsed = loginSchema.safeParse({
    email: emailRaw,
    password: passwordRaw,
  });

  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  const { email, password } = parsed.data;

  // Serverless rate-limiting check
  const rateLimitKey = `login:${email}`;
  const rateLimit = await checkRateLimit(rateLimitKey, 5, 60);
  if (!rateLimit.success) {
    return {
      error: "Too many login attempts. Please wait a minute before trying again.",
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      error: "Database is not connected. Please configure DATABASE_URL in .env.local.",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Generic error message to prevent user enumeration
      return { error: "Invalid email or password." };
    }
    console.error("Unexpected error during login:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Server Action for registering a new user under a server-side gate.
 */
export async function registerAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  // Server-Side Registration Gate:
  // Disabled by default unless explicitly configured in environment.
  const isRegistrationAllowed = process.env.ALLOW_REGISTRATION === "true";
  if (!isRegistrationAllowed) {
    return {
      error:
        "Public registration is currently closed. Accounts may only be provisioned by workspace administrators.",
    };
  }

  const nameRaw = formData.get("name");
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  const parsed = registerSchema.safeParse({
    name: nameRaw,
    email: emailRaw,
    password: passwordRaw,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return { error: firstIssue || "Invalid registration information." };
  }

  const { name, email, password } = parsed.data;

  // Serverless rate-limiting check
  const rateLimitKey = `register:${email}`;
  const rateLimit = await checkRateLimit(rateLimitKey, 3, 300);
  if (!rateLimit.success) {
    return {
      error:
        "Too many registration requests from this network. Please wait a few minutes.",
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      error: "Database is not connected. Please configure DATABASE_URL in .env.local.",
    };
  }

  try {
    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      // Generic failure to prevent account enumeration
      return {
        error:
          "Registration could not be completed with this email. Please check your credentials or log in.",
      };
    }

    // Hash password using bcryptjs with work factor 12
    const passwordHash = await bcrypt.hash(password, 12);

    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to register user:", error);
    return {
      error: "Unable to create account at this time. Please try again later.",
    };
  }
}

/**
 * Server Action for terminating an active session.
 */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
