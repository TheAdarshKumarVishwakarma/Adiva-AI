import mongoose from 'mongoose';

const dailyStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  messagesSent: {
    type: Number,
    default: 0
  },
  messagesReceived: {
    type: Number,
    default: 0
  },
  tokensUsed: {
    type: Number,
    default: 0
  },
  sessionsCount: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  modelsUsed: [{
    model: String,
    count: Number
  }],
  featuresUsed: [{
    feature: String,
    count: Number
  }]
});

const userAnalyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Overall Statistics
  totalStats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalSessions: {
      type: Number,
      default: 0
    },
    totalTimeSpent: {
      type: Number, // in minutes
      default: 0
    },
    averageSessionDuration: {
      type: Number, // in minutes
      default: 0
    },
    averageMessagesPerSession: {
      type: Number,
      default: 0
    },
    averageTokensPerMessage: {
      type: Number,
      default: 0
    }
  },
  
  // Model Usage Statistics
  modelUsage: [{
    model: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      default: 0
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Feature Usage Statistics
  featureUsage: [{
    feature: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Daily Statistics
  dailyStats: [dailyStatsSchema],
  
  // Time-based Patterns
  timePatterns: {
    mostActiveHour: {
      type: Number,
      default: 12
    },
    mostActiveDay: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: 'Monday'
    },
    peakUsageTimes: [{
      hour: Number,
      count: Number
    }],
    weeklyPattern: [{
      day: String,
      count: Number
    }]
  },
  
  // Learning Patterns
  learningPatterns: {
    topicsDiscussed: [{
      topic: String,
      frequency: Number,
      lastDiscussed: Date
    }],
    complexityTrend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable'],
      default: 'stable'
    },
    preferredResponseLength: {
      type: String,
      enum: ['short', 'medium', 'long'],
      default: 'medium'
    }
  },
  
  // Performance Metrics
  performanceMetrics: {
    averageResponseTime: {
      type: Number, // in milliseconds
      default: 0
    },
    errorRate: {
      type: Number, // percentage
      default: 0
    },
    satisfactionScore: {
      type: Number, // 1-5 scale
      default: 0
    },
    retentionRate: {
      type: Number, // percentage
      default: 0
    }
  },
  
  // Last Updated
  lastActivity: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // Analytics Settings
  analyticsSettings: {
    trackBehavior: {
      type: Boolean,
      default: true
    },
    shareAnonymousData: {
      type: Boolean,
      default: false
    },
    receiveInsights: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
userAnalyticsSchema.index({ user: 1 }, { unique: true });
userAnalyticsSchema.index({ lastActivity: -1 });
userAnalyticsSchema.index({ 'dailyStats.date': -1 });

// Method to update daily stats
userAnalyticsSchema.methods.updateDailyStats = function(date = new Date()) {
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);
  
  let dailyStat = this.dailyStats.find(stat => 
    stat.date.getTime() === today.getTime()
  );
  
  if (!dailyStat) {
    dailyStat = {
      date: today,
      messagesSent: 0,
      messagesReceived: 0,
      tokensUsed: 0,
      sessionsCount: 0,
      timeSpent: 0,
      modelsUsed: [],
      featuresUsed: []
    };
    this.dailyStats.push(dailyStat);
  }
  
  return dailyStat;
};

// Method to record message
userAnalyticsSchema.methods.recordMessage = function(role, model, tokens = 0, features = []) {
  const dailyStat = this.updateDailyStats();
  
  if (role === 'user') {
    dailyStat.messagesSent++;
    this.totalStats.totalMessages++;
  } else {
    dailyStat.messagesReceived++;
    this.totalStats.totalMessages++;
  }
  
  // Update token usage
  dailyStat.tokensUsed += tokens;
  this.totalStats.totalTokens += tokens;
  
  // Update model usage
  let modelUsage = this.modelUsage.find(m => m.model === model);
  if (!modelUsage) {
    modelUsage = { model, count: 0, tokensUsed: 0, lastUsed: new Date() };
    this.modelUsage.push(modelUsage);
  }
  modelUsage.count++;
  modelUsage.tokensUsed += tokens;
  modelUsage.lastUsed = new Date();
  
  // Update daily model usage
  let dailyModelUsage = dailyStat.modelsUsed.find(m => m.model === model);
  if (!dailyModelUsage) {
    dailyModelUsage = { model, count: 0 };
    dailyStat.modelsUsed.push(dailyModelUsage);
  }
  dailyModelUsage.count++;
  
  // Update feature usage
  features.forEach(feature => {
    let featureUsage = this.featureUsage.find(f => f.feature === feature);
    if (!featureUsage) {
      featureUsage = { feature, count: 0, lastUsed: new Date() };
      this.featureUsage.push(featureUsage);
    }
    featureUsage.count++;
    featureUsage.lastUsed = new Date();
    
    let dailyFeatureUsage = dailyStat.featuresUsed.find(f => f.feature === feature);
    if (!dailyFeatureUsage) {
      dailyFeatureUsage = { feature, count: 0 };
      dailyStat.featuresUsed.push(dailyFeatureUsage);
    }
    dailyFeatureUsage.count++;
  });
  
  this.lastActivity = new Date();
  return this.save();
};

// Method to record session
userAnalyticsSchema.methods.recordSession = function(duration = 0) {
  const dailyStat = this.updateDailyStats();
  
  dailyStat.sessionsCount++;
  dailyStat.timeSpent += duration;
  
  this.totalStats.totalSessions++;
  this.totalStats.totalTimeSpent += duration;
  this.totalStats.averageSessionDuration = this.totalStats.totalTimeSpent / this.totalStats.totalSessions;
  this.totalStats.averageMessagesPerSession = this.totalStats.totalMessages / this.totalStats.totalSessions;
  
  if (this.totalStats.totalMessages > 0) {
    this.totalStats.averageTokensPerMessage = this.totalStats.totalTokens / this.totalStats.totalMessages;
  }
  
  this.lastLogin = new Date();
  return this.save();
};

// Method to update time patterns
userAnalyticsSchema.methods.updateTimePatterns = function() {
  const now = new Date();
  const hour = now.getHours();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Update peak usage times
  let peakTime = this.timePatterns.peakUsageTimes.find(p => p.hour === hour);
  if (!peakTime) {
    peakTime = { hour, count: 0 };
    this.timePatterns.peakUsageTimes.push(peakTime);
  }
  peakTime.count++;
  
  // Update weekly pattern
  let weeklyDay = this.timePatterns.weeklyPattern.find(p => p.day === dayName);
  if (!weeklyDay) {
    weeklyDay = { day: dayName, count: 0 };
    this.timePatterns.weeklyPattern.push(weeklyDay);
  }
  weeklyDay.count++;
  
  // Find most active hour and day
  if (this.timePatterns.peakUsageTimes.length > 0) {
    this.timePatterns.mostActiveHour = this.timePatterns.peakUsageTimes.reduce((max, current) => 
      current.count > max.count ? current : max
    ).hour;
  }
  
  if (this.timePatterns.weeklyPattern.length > 0) {
    this.timePatterns.mostActiveDay = this.timePatterns.weeklyPattern.reduce((max, current) => 
      current.count > max.count ? current : max
    ).day;
  }
  
  return this.save();
};

// Method to get insights
userAnalyticsSchema.methods.getInsights = function() {
  const insights = [];
  
  // Usage insights
  if (this.totalStats.totalMessages > 100) {
    insights.push({
      type: 'usage',
      message: 'You\'re a power user! You\'ve sent over 100 messages.',
      icon: '🚀'
    });
  }
  
  // Model insights
  const mostUsedModel = Array.isArray(this.modelUsage) && this.modelUsage.length > 0
    ? this.modelUsage.reduce((max, current) => (current.count > max.count ? current : max))
    : null;
  if (mostUsedModel && mostUsedModel.count > 10) {
    insights.push({
      type: 'model',
      message: `Your favorite model is ${mostUsedModel.model} (${mostUsedModel.count} uses).`,
      icon: '🤖'
    });
  }
  
  // Time insights
  if (typeof this.timePatterns.mostActiveHour === 'number' &&
      (this.timePatterns.mostActiveHour >= 22 || this.timePatterns.mostActiveHour <= 6)) {
    insights.push({
      type: 'time',
      message: 'You\'re most active during late hours. Consider taking breaks!',
      icon: '🌙'
    });
  }
  
  return insights;
};

// Static method to get or create user analytics
userAnalyticsSchema.statics.getOrCreateUserAnalytics = async function(userId) {
  let analytics = await this.findOne({ user: userId });
  
  if (!analytics) {
    analytics = new this({ user: userId });
    await analytics.save();
  }
  
  return analytics;
};

// Static method to get aggregated analytics
userAnalyticsSchema.statics.getAggregatedAnalytics = async function() {
  const pipeline = [
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalMessages: { $sum: '$totalStats.totalMessages' },
        totalTokens: { $sum: '$totalStats.totalTokens' },
        totalSessions: { $sum: '$totalStats.totalSessions' },
        averageSessionDuration: { $avg: '$totalStats.averageSessionDuration' },
        averageMessagesPerSession: { $avg: '$totalStats.averageMessagesPerSession' }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

export default mongoose.model('UserAnalytics', userAnalyticsSchema);

