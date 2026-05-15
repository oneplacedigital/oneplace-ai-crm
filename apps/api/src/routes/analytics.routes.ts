import { Router } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { requireAuth } from '../middleware/auth';

export const analyticsRoutes = Router();

analyticsRoutes.use(requireAuth);

analyticsRoutes.get('/funnel', async (req, res, next) => {
  try {
    res.json(await AnalyticsService.funnel(req.auth!.tid));
  } catch (e) {
    next(e);
  }
});
analyticsRoutes.get('/sources', async (req, res, next) => {
  try {
    res.json(await AnalyticsService.sourcePerformance(req.auth!.tid));
  } catch (e) {
    next(e);
  }
});
analyticsRoutes.get('/daily', async (req, res, next) => {
  try {
    const days = Math.min(180, Math.max(1, Number(req.query['days'] ?? 30)));
    res.json(await AnalyticsService.dailyTrend(req.auth!.tid, days));
  } catch (e) {
    next(e);
  }
});
analyticsRoutes.get('/time-to-convert', async (req, res, next) => {
  try {
    res.json(await AnalyticsService.timeToConvert(req.auth!.tid));
  } catch (e) {
    next(e);
  }
});
analyticsRoutes.get('/leaderboard', async (req, res, next) => {
  try {
    res.json(await AnalyticsService.leaderboard(req.auth!.tid));
  } catch (e) {
    next(e);
  }
});
