import { z } from 'zod';
import { emailSchema } from './auth';

export const getUserSchema = z.object({
  // via session
});

export const updateUserSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  avatarUrl: z.string().url().max(500).optional().or(z.literal('')),
  // preferences as json
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const listUsersSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
