import { z } from 'zod';

export const projectEnvironmentSchema = z.object({
  environment: z.enum(['test', 'live']),
});
