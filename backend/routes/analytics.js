import express from "express";
import dotenv from 'dotenv';
import analyticsService from '../services/analyticsService.js';
import AdminSettings from '../models/AdminSettings.js';

dotenv.config();

const router = express.Router();

// Middleware to track analytics
const trackAnalytics = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const adminSettings = await AdminSettings.getSettings();
    if (adminSettings.settings.featureToggles?.analytics === false) {
      return next();
    }
  } catch (error) {
    // If admin settings fail, keep analytics running
  }
  
  // Track request
  analyticsService.trackRequest(req);
  
  // Override res.json to track response time
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    analyticsService.trackResponseTime(responseTime);
    
    // Track task type if available
    if (data.taskType) {
      analyticsService.trackTaskType(data.taskType);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Apply analytics tracking to all routes
router.use(trackAnalytics);

const ensureAnalyticsEnabled = async (res) => {
  const adminSettings = await AdminSettings.getSettings();
  if (adminSettings.settings.featureToggles?.analytics === false) {
    res.status(403).json({ error: 'Analytics disabled' });
    return false;
  }
  return true;
};

// GET /api/analytics/overview
router.get('/analytics/overview', async (req, res) => {
  console.log('INCOMING /analytics/overview from', req.ip, 'headers:', req.headers);
  try {
    if (!(await ensureAnalyticsEnabled(res))) return;
    const overview = analyticsService.getOverview();
    console.log('Returning overview');
    return res.json(overview);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to retrieve analytics overview' });
  }
});


// GET /api/analytics/daily
router.get('/analytics/daily', async (req, res) => {
  try {
    if (!(await ensureAnalyticsEnabled(res))) return;
    const { days = 7 } = req.query;
    const dailyStats = analyticsService.getDailyStats(days);
    return res.json(dailyStats);
  } catch (error) {
    console.error('❌ Daily analytics error:', error);
    return res.status(500).json({ error: 'Failed to retrieve daily analytics' });
  }
});

// GET /api/analytics/hourly
router.get('/analytics/hourly', async (req, res) => {
  try {
    if (!(await ensureAnalyticsEnabled(res))) return;
    const hourlyStats = analyticsService.getHourlyStats();
    return res.json(hourlyStats);
  } catch (error) {
    console.error('❌ Hourly analytics error:', error);
    return res.status(500).json({ error: 'Failed to retrieve hourly analytics' });
  }
});

// GET /api/analytics/task-types
router.get('/analytics/task-types', async (req, res) => {
  try {
    if (!(await ensureAnalyticsEnabled(res))) return;
    const overview = analyticsService.getOverview();
    const taskTypeStats = Object.entries(overview.taskTypeDistribution).map(([type, count]) => ({
      type,
      count,
      percentage: overview.totalRequests > 0 ? Math.round((count / overview.totalRequests) * 100) : 0
    }));
    
    return res.json({
      taskTypes: taskTypeStats,
      totalRequests: overview.totalRequests,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Task type analytics error:', error);
    return res.status(500).json({ error: 'Failed to retrieve task type analytics' });
  }
});

// POST /api/analytics/track
router.post('/analytics/track', async (req, res) => {
  try {
    if (!(await ensureAnalyticsEnabled(res))) return;
    const { event, data } = req.body;
    
    switch (event) {
      case 'conversation_started':
        analyticsService.trackConversation();
        break;
        
      case 'tokens_used':
        analyticsService.trackTokens(data.tokens || 0);
        break;
        
      case 'error_occurred':
        analyticsService.trackError();
        break;
        
      default:
        console.log(`📊 Unknown analytics event: ${event}`);
    }
    
    return res.json({ success: true, message: 'Analytics event tracked' });
  } catch (error) {
    console.error('❌ Analytics tracking error:', error);
    return res.status(500).json({ error: 'Failed to track analytics event' });
  }
});

// DELETE /api/analytics/reset
router.delete('/analytics/reset', (req, res) => {
  try {
    analyticsService.reset();
    
    return res.json({ 
      success: true, 
      message: 'Analytics data reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Analytics reset error:', error);
    return res.status(500).json({ error: 'Failed to reset analytics data' });
  }
});

export default router;
