import crypto from "crypto";
import { db } from "@/lib/db";

/**
 * Computes deterministic SHA-256 hash of an invitation token.
 * Raw tokens are NEVER stored in the database.
 */
export function hashInvitationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Generates a secure random 32-byte raw token and returns both the raw token and its SHA-256 hash.
 */
export function generateInvitationToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashInvitationToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Verifies an incoming raw token against the database.
 * Returns the invitation record if valid, pending, and not expired.
 */
export async function getValidInvitation(rawToken: string) {
  if (!rawToken || rawToken.length < 32) {
    return null;
  }

  const tokenHash = hashInvitationToken(rawToken);
  const now = new Date();

  const invitation = await db.workspaceInvitation.findUnique({
    where: { tokenHash },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      designation: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return null;
  }

  // Check status and expiration
  if (invitation.status !== "PENDING" || invitation.expiresAt < now) {
    return null;
  }

  return invitation;
}
