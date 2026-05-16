import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@oneplace/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { NotFound } from '../utils/errors';

export const coursesRoutes = Router();
coursesRoutes.use(requireAuth);

const createCourseSchema = z.object({
  name: z.string().min(2).max(180),
  code: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  durationWeeks: z.number().int().min(1).max(208).default(12),
  feeInr: z.number().int().nonnegative().default(0),
  pace: z.enum(['WEEKDAY', 'WEEKEND', 'EVENING', 'ONLINE', 'HYBRID']).default('WEEKDAY'),
  isActive: z.boolean().default(true),
});

const updateCourseSchema = createCourseSchema.partial();

coursesRoutes.get('/', async (req, res, next) => {
  try {
    const courses = await prisma.course.findMany({
      where: { tenantId: req.auth!.tid },
      orderBy: { createdAt: 'desc' },
    });
    res.json(courses);
  } catch (e) {
    next(e);
  }
});

coursesRoutes.post(
  '/',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: createCourseSchema }),
  async (req, res, next) => {
    try {
      const course = await prisma.course.create({
        data: { ...req.body, tenantId: req.auth!.tid },
      });
      res.status(201).json(course);
    } catch (e) {
      next(e);
    }
  },
);

coursesRoutes.patch(
  '/:id',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: updateCourseSchema }),
  async (req, res, next) => {
    try {
      const course = await prisma.course.findFirst({
        where: { id: req.params.id, tenantId: req.auth!.tid },
      });
      if (!course) throw NotFound('Course not found');
      const updated = await prisma.course.update({ where: { id: course.id }, data: req.body });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);
