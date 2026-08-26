import { z } from 'zod';

// ── Admin: plan management ──
export const planCreateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  paddlePriceId: z.string().min(1).max(100),
  amount: z.number().int().min(0), // cents
  currency: z.string().length(3).default('USD'),
  interval: z.enum(['month', 'year']).default('month'),
  trialDays: z.number().int().min(0).max(365).default(0),
  features: z.array(z.string().max(200)).max(20).default([]),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const planUpdateSchema = planCreateSchema
  .omit({ projectId: true })
  .partial();

// ── Checkout ──
export const checkoutSchema = z.object({
  planId: z.string().min(1),
  successUrl: z.string().url().optional(),
});
