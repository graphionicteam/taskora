import { z } from "zod";

export const initialOwnerSchema = z.object({
  setupSecret: z.string().min(1, "Setup authorization secret is required."),
  name: z.string().trim().min(2, "Full name must be at least 2 characters."),
  email: z.string().trim().email("Please enter a valid work email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  workspaceName: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(50, "Workspace name must be under 50 characters."),
});

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(50, "Workspace name must be under 50 characters."),
  description: z.string().trim().max(200, "Description must be under 200 characters.").optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(50, "Workspace name must be under 50 characters.")
    .optional(),
  description: z.string().trim().max(200, "Description must be under 200 characters.").optional(),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email("Please enter a valid recipient email address."),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]),
  designationId: z.string().cuid().optional().nullable(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(32, "Invalid or malformed invitation token."),
  name: z.string().trim().min(2, "Full name must be at least 2 characters.").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "GUEST"]),
  designationId: z.string().cuid().optional().nullable(),
});

export const createDesignationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Designation title must be at least 2 characters.")
    .max(60, "Designation title must be under 60 characters."),
  description: z.string().trim().max(200).optional(),
});
