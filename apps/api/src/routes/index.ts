import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { leadsRoutes } from './leads.routes';
import { usersRoutes } from './users.routes';
import { coursesRoutes } from './courses.routes';
import { workflowsRoutes } from './workflows.routes';
import { aiRoutes } from './ai.routes';
import { integrationsRoutes } from './integrations.routes';
import { analyticsRoutes } from './analytics.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'oneplace-ai-crm-api', time: new Date().toISOString() });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/leads', leadsRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/courses', coursesRoutes);
apiRouter.use('/workflows', workflowsRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/integrations', integrationsRoutes);
apiRouter.use('/analytics', analyticsRoutes);
