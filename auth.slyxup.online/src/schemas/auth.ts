import { z } from 'zod';

// Common
export const emailSchema = z.string().email().max(255).toLowerCase().trim();
export const passwordSchema = z.string().min(8).max(128);
export const projectIdSchema = z.string().uuid();

// Sign Up — creates user + session
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  projectId: projectIdSchema.optional(), // if not provided, use default project from publishable key
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  // For hosted pages flow
  redirectUrl: z.string().url().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// Sign In — email/password
export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  projectId: projectIdSchema.optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;

// Sign Out — requires session token (via cookie or header)
export const signOutSchema = z.object({
  // no body, session from cookie
});

export const refreshSchema = z.object({
  // refresh via HttpOnly cookie
});

// Email verification
export const verifyEmailSchema = z.object({
  token: z.string().min(10).max(500),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
  projectId: projectIdSchema.optional(),
});

// Password reset
export const forgotPasswordSchema = z.object({
  email: emailSchema,
  projectId: projectIdSchema.optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(500),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

// Update profile
export const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  avatarUrl: z.string().url().max(500).optional().or(z.literal('')),
});

// Delete account
export const deleteAccountSchema = z.object({
  password: passwordSchema.optional(), // require password if not OAuth
});
