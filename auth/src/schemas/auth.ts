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
  // Optional username — can be used as an alternative sign-in identifier.
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(
      /^[a-z0-9_]+$/i,
      'Username may contain letters, numbers and underscores'
    )
    .toLowerCase()
    .optional(),
  // For hosted pages flow
  redirectUrl: z.string().url().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// Sign In — email/password OR username/password
export const signInSchema = z
  .object({
    email: emailSchema.optional(),
    password: passwordSchema,
    projectId: projectIdSchema.optional(),
    username: z.string().trim().min(1).max(60).toLowerCase().optional(),
  })
  .refine((d) => !!(d.email || d.username), {
    message: 'email or username is required',
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
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(
      /^[a-z0-9_]+$/i,
      'Username may contain letters, numbers and underscores'
    )
    .toLowerCase()
    .optional()
    .nullable(),
});

// 2FA / TOTP
export const enableTOTPSchema = z.object({
  code: z.string().regex(/^\d{6,8}$/, 'Code must be 6-8 digits'),
  secret: z.string().min(16).max(128),
});

export const verifyTOTPSchema = z.object({
  code: z.string().regex(/^\d{6,8}$/, 'Code must be 6-8 digits'),
});

export const disableTOTPSchema = z.object({
  password: passwordSchema.optional(),
  code: z
    .string()
    .regex(/^\d{6,8}$/, 'Code must be 6-8 digits')
    .optional(),
});

export const signInTOTPSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6,8}$/, 'Code must be 6-8 digits')
    .or(z.string().min(10).max(24)),
  recoveryCode: z.string().optional(),
});

// Complete 2FA sign-in step
export const signIn2FASchema = z.object({
  challengeToken: z.string().min(10),
  code: z
    .string()
    .regex(/^\d{6,8}$/, 'Code must be 6-8 digits')
    .optional(),
  recoveryCode: z
    .string()
    .regex(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i, 'Invalid recovery code')
    .optional(),
});

// Delete account
export const deleteAccountSchema = z.object({
  password: passwordSchema.optional(), // require password if not OAuth
});
