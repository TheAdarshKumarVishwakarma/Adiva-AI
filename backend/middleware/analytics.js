import analyticsService from '../services/analyticsService.js';
import AdminSettings from '../models/AdminSettings.js';

export const trackAnalytics = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const adminSettings = await AdminSettings.getSettings();
    if (adminSettings.settings.featureToggles?.analytics === false) {
      return next();
    }
  } catch (error) {
    // If admin settings fail, keep analytics running
  }

  analyticsService.trackRequest(req);

  const originalJson = res.json;
  res.json = function (data) {
    const responseTime = Date.now() - startTime;
    analyticsService.trackResponseTime(responseTime);

    if (data.taskType) {
      analyticsService.trackTaskType(data.taskType);
    }

    return originalJson.call(this, data);
  };

  next();
};

export const ensureAnalyticsEnabled = async (res) => {
  const adminSettings = await AdminSettings.getSettings();
  if (adminSettings.settings.featureToggles?.analytics === false) {
    res.status(403).json({ error: 'Analytics disabled' });
    return false;
  }
  return true;
};
