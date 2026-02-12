import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // AI Model Settings
  aiSettings: {
    defaultModel: {
      type: String,
      default: 'gpt-5-nano',
      enum: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo',  'gpt-3.5-turbo', 'gpt-5-nano', 'claude-sonnet-4-20250514', 'claude-haiku-3-20250514']
    },
    defaultTemperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    },
    defaultMaxTokens: {
      type: Number,
      default: 2000,
      min: 1,
      max: 4000
    },
    personality: {
      type: String,
      enum: ['friendly', 'logical', 'playful', 'confident'],
      default: 'friendly'
    },
    defensiveMode: {
      type: Boolean,
      default: false
    },
    streamResponses: {
      type: Boolean,
      default: true
    }
  },
  
  // Appearance Settings
  appearance: {
    theme: {
      type: String,
      default: 'ocean',
      enum: ['ocean', 'indigo', 'blue', 'green', 'purple', 'orange', 'teal', 'red', 'yellow']
    },
    sidebarThemeEnabled: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en-US',
      enum: ['en', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN', 'hi-IN', 'ar-SA']
    },
    speechLanguage: {
      type: String,
      default: 'en-US',
      enum: ['en', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN', 'hi-IN', 'ar-SA']
    },
    highContrast: {
      type: Boolean,
      default: false
    },
    largeText: {
      type: Boolean,
      default: false
    },
    reduceAnimations: {
      type: Boolean,
      default: false
    }
  },
  
  // Notification Settings
  notifications: {
    soundNotifications: {
      type: Boolean,
      default: true
    },
    desktopNotifications: {
      type: Boolean,
      default: false
    },
    showTyping: {
      type: Boolean,
      default: true
    },
    speechEnabled: {
      type: Boolean,
      default: false
    }
  },
  
  // Privacy & Data Settings
  privacy: {
    saveHistory: {
      type: Boolean,
      default: true
    },
    autoDelete: {
      type: Boolean,
      default: false
    },
    autoDeleteDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365
    },
    shareAnalytics: {
      type: Boolean,
      default: true
    }
  },
  
  // Performance Settings
  performance: {
    enableCaching: {
      type: Boolean,
      default: true
    },
    lazyLoadImages: {
      type: Boolean,
      default: true
    },
    autoScroll: {
      type: Boolean,
      default: true
    }
  },
  
  // Accessibility Settings
  accessibility: {
    keyboardShortcuts: {
      type: Boolean,
      default: true
    },
    screenReader: {
      type: Boolean,
      default: false
    }
  },
  
  // Advanced Settings
  advanced: {
    customSystemPrompt: {
      type: String,
      default: null,
      maxlength: [5000, 'Custom system prompt cannot exceed 5,000 characters']
    },
    apiEndpoint: {
      type: String,
      default: null,
      maxlength: [500, 'API endpoint cannot exceed 500 characters']
    }
  }
}, {
  timestamps: true
});

// Index for user lookup
userSettingsSchema.index({ user: 1 }, { unique: true });

// Method to reset to default settings
userSettingsSchema.methods.resetToDefaults = function() {
  this.aiSettings = {
    defaultModel: 'gpt-4o-mini',
    defaultTemperature: 0.7,
    defaultMaxTokens: 2000,
    personality: 'friendly',
    defensiveMode: false,
    streamResponses: true
  };
  
  this.appearance = {
    theme: 'neural-blue',
    sidebarThemeEnabled: true,
    language: 'en-US',
    speechLanguage: 'en-US',
    highContrast: false,
    largeText: false,
    reduceAnimations: false
  };
  
  this.notifications = {
    soundNotifications: true,
    desktopNotifications: false,
    showTyping: true,
    speechEnabled: false
  };
  
  this.privacy = {
    saveHistory: true,
    autoDelete: false,
    autoDeleteDays: 30,
    shareAnalytics: true
  };
  
  this.performance = {
    enableCaching: true,
    lazyLoadImages: true,
    autoScroll: true
  };
  
  this.accessibility = {
    keyboardShortcuts: true,
    screenReader: false
  };
  
  this.advanced = {
    customSystemPrompt: null,
    apiEndpoint: null
  };
  
  return this.save();
};

// Method to update specific setting category
userSettingsSchema.methods.updateSettings = function(category, updates) {
  if (this[category]) {
    Object.assign(this[category], updates);
    return this.save();
  }
  throw new Error(`Invalid settings category: ${category}`);
};

// Method to export settings
userSettingsSchema.methods.exportSettings = function() {
  return {
    aiSettings: this.aiSettings,
    appearance: this.appearance,
    notifications: this.notifications,
    privacy: this.privacy,
    performance: this.performance,
    accessibility: this.accessibility,
    advanced: this.advanced,
    exportedAt: new Date(),
    version: '1.0'
  };
};

// Static method to get or create user settings
userSettingsSchema.statics.getOrCreateUserSettings = async function(userId) {
  let settings = await this.findOne({ user: userId });
  
  if (!settings) {
    settings = new this({ user: userId });
    await settings.save();
  }
  
  return settings;
};

// Static method to bulk update settings
userSettingsSchema.statics.bulkUpdateSettings = async function(userId, settingsData) {
  const settings = await this.getOrCreateUserSettings(userId);
  
  // Update each category if provided
  Object.keys(settingsData).forEach(category => {
    if (settings[category] && typeof settings[category] === 'object') {
      Object.assign(settings[category], settingsData[category]);
    }
  });
  
  return settings.save();
};

export default mongoose.model('UserSettings', userSettingsSchema);

