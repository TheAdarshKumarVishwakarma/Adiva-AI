import analyticsService from '../services/analyticsService.js';
import { ensureAnalyticsEnabled } from '../middleware/analytics.js';

export const getAnalyticsOverview = async (req, res) => {
  console.log('INCOMING /analytics/overview from', req.ip);
  try {
    if (!(await ensureAnalyticsEnabled(res))) return;
    const overview = analyticsService.getOverview();
    console.log('Returning overview');
    return res.json(overview);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to retrieve analytics overview' });
  }
};

export const getDailyAnalytics = async (req, res) => {
  try {
    if (!(await ensureAnalyticsEnabled(res))) return;
    const { days = 7 } = req.query;
    const dailyStats = analyticsService.getDailyStats(days);
    return res.json(dailyStats);
  } catch (error) {
    console.error('❌ Daily analytics error:', error);
    return res.status(500).json({ error: 'Failed to retrieve daily analytics' });
  }
};

export const getHourlyAnalytics = async (req, res) => {
  try {
    if (!(await ensureAnalyticsEnabled(res))) return;
    const hourlyStats = analyticsService.getHourlyStats();
    return res.json(hourlyStats);
  } catch (error) {
    console.error('❌ Hourly analytics error:', error);
    return res.status(500).json({ error: 'Failed to retrieve hourly analytics' });
  }
};

export const getTaskTypeAnalytics = async (req, res) => {
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
};

export const trackAnalyticsEvent = async (req, res) => {
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
};

export const resetAnalytics = (req, res) => {
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
};
