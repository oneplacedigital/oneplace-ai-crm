import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const registerTenantSchema = z.object({
  tenantName: z.string().min(2).max(120),
  tenantSlug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and dashes'),
  adminName: z.string().min(2).max(120),
  adminEmail: z.string().email(),
  adminPhone: z.string().min(7).max(20).optional(),
  password: z.string().min(8).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
