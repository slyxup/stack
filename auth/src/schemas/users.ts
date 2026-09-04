import { z } from 'zod';
import { emailSchema } from './auth';

export const getUserSchema = z.object({
  // via session
});

export const updateUserSchema = z.object({
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
  // preferences as json
  preferences: z.record(z.string(), z.unknown()).optional(),
  bio: z.string().trim().max(280).optional().nullable(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const enableTOTPSchema = z.object({
  code: z.string().regex(/^\d{6,8}$/, 'Code must be 6-8 digits'),
  secret: z.string().min(16).max(128),
});

export const verifyTOTPSchema = z.object({
  code: z.string().regex(/^\d{6,8}$/, 'Code must be 6-8 digits'),
});

export const disableTOTPSchema = z.object({
  code: z.string().regex(/^\d{6,8}$/, 'Code must be 6-8 digits'),
});

export const unlinkAccountSchema = z.object({
  provider: z.enum(['google', 'github']),
});

export const listUsersSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
