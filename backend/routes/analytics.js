import express from 'express';
import dotenv from 'dotenv';
import {
  getAnalyticsOverview,
  getDailyAnalytics,
  getHourlyAnalytics,
  getTaskTypeAnalytics,
  trackAnalyticsEvent,
  resetAnalytics
} from '../controllers/analyticsController.js';
import { trackAnalytics } from '../middleware/analytics.js';

dotenv.config();

const router = express.Router();

router.use(trackAnalytics);

router.get('/analytics/overview', getAnalyticsOverview);
router.get('/analytics/daily', getDailyAnalytics);
router.get('/analytics/hourly', getHourlyAnalytics);
router.get('/analytics/task-types', getTaskTypeAnalytics);
router.post('/analytics/track', trackAnalyticsEvent);
router.delete('/analytics/reset', resetAnalytics);

export default router;
