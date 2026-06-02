/**
 * Custom fields per workspace — each tenant defines their own fields on leads.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@oneplace/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { NotFound, Conflict } from '../utils/errors';

export const customFieldsRoutes = Router();
customFieldsRoutes.use(requireAuth);

const FIELD_TYPES = ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN', 'URL', 'EMAIL'] as const;

const fieldSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, underscore (e.g. property_type)'),
  label: z.string().trim().min(2).max(80),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  placeholder: z.string().trim().max(120).optional(),
  description: z.string().trim().max(300).optional(),
  order: z.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const updateSchema = fieldSchema.partial();

customFieldsRoutes.get('/', async (req, res, next) => {
  try {
    const items = await prisma.customFieldDefinition.findMany({
      where: { tenantId: req.auth!.tid, entityType: 'LEAD' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

customFieldsRoutes.post(
  '/',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: fieldSchema }),
  async (req, res, next) => {
    try {
      const existing = await prisma.customFieldDefinition.findUnique({
        where: {
          tenantId_entityType_key: {
            tenantId: req.auth!.tid,
            entityType: 'LEAD',
            key: req.body.key,
          },
        },
      });
      if (existing) throw Conflict('A field with this key already exists');
      const field = await prisma.customFieldDefinition.create({
        data: {
          tenantId: req.auth!.tid,
          entityType: 'LEAD',
          key: req.body.key,
          label: req.body.label,
          type: req.body.type,
          required: req.body.required ?? false,
          options: req.body.options ?? undefined,
          placeholder: req.body.placeholder,
          description: req.body.description,
          order: req.body.order ?? 0,
          isActive: req.body.isActive ?? true,
        },
      });
      res.status(201).json(field);
    } catch (e) {
      next(e);
    }
  },
);

customFieldsRoutes.patch(
  '/:id',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: updateSchema }),
  async (req, res, next) => {
    try {
      const existing = await prisma.customFieldDefinition.findFirst({
        where: { id: req.params.id, tenantId: req.auth!.tid },
      });
      if (!existing) throw NotFound('Custom field not found');
      const updated = await prisma.customFieldDefinition.update({
        where: { id: existing.id },
        data: {
          ...(req.body.label !== undefined && { label: req.body.label }),
          ...(req.body.type !== undefined && { type: req.body.type }),
          ...(req.body.required !== undefined && { required: req.body.required }),
          ...(req.body.options !== undefined && { options: req.body.options }),
          ...(req.body.placeholder !== undefined && { placeholder: req.body.placeholder }),
          ...(req.body.description !== undefined && { description: req.body.description }),
          ...(req.body.order !== undefined && { order: req.body.order }),
          ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
        },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

customFieldsRoutes.delete(
  '/:id',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const existing = await prisma.customFieldDefinition.findFirst({
        where: { id: req.params.id, tenantId: req.auth!.tid },
      });
      if (!existing) throw NotFound('Custom field not found');
      await prisma.customFieldDefinition.delete({ where: { id: existing.id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);
