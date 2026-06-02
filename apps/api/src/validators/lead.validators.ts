import { z } from 'zod';

export const leadSourceSchema = z.enum([
  'META_ADS',
  'GOOGLE_ADS',
  'ORGANIC_SEARCH',
  'REFERRAL',
  'WALK_IN',
  'WEBSITE_FORM',
  'WHATSAPP',
  'PHONE_CALL',
  'IMPORT',
  'MANUAL',
  'OTHER',
]);

export const leadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
]);

export const activityTypeSchema = z.enum([
  'NOTE',
  'CALL',
  'WHATSAPP_SENT',
  'WHATSAPP_RECEIVED',
  'EMAIL_SENT',
  'EMAIL_RECEIVED',
  'DEMO_SCHEDULED',
  'DEMO_COMPLETED',
  'STATUS_CHANGE',
  'ASSIGNMENT_CHANGE',
  'PAYMENT_LOGGED',
  'AI_SUGGESTION',
  'SYSTEM',
]);

export const createLeadSchema = z.object({
  fullName: z.string().min(2).max(150),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional(),
  whatsapp: z.string().min(7).max(20).optional(),
  city: z.string().max(80).optional(),
  source: leadSourceSchema.optional(),
  sourceDetail: z.string().max(255).optional(),
  courseId: z.string().cuid().optional(),
  assignedToId: z.string().cuid().optional(),
  notes: z.string().max(5000).optional(),
  budgetInr: z.number().int().nonnegative().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: leadStatusSchema.optional(),
  priority: z.number().int().min(1).max(3).optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  lostReason: z.string().max(500).optional(),
});

export const transitionSchema = z.object({
  status: leadStatusSchema,
});

export const listLeadsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: leadStatusSchema.optional(),
  source: leadSourceSchema.optional(),
  assignedToId: z.string().cuid().optional(),
  search: z.string().max(120).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'score', 'priority']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const addActivitySchema = z.object({
  type: activityTypeSchema,
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });
