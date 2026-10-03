import { z } from 'zod';

export const createKeySchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100).trim(),
  type: z.enum(['publishable', 'secret']),
});

export type CreateKeyInput = z.infer<typeof createKeySchema>;
