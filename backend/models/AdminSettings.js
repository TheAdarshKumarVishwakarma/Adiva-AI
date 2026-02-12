import mongoose from 'mongoose';

const adminSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global',
      unique: true,
      index: true
    },
    settings: {
      defaultModel: {
        type: String,
        default: 'gpt-5-nano'
      },
      allowedModels: {
        type: [String],
        default: ['gpt-5-nano', 'claude-sonnet-4-20250514']
      },
      systemPromptTemplate: {
        type: String,
        default: '',
        maxlength: [10000, 'System prompt template cannot exceed 10,000 characters']
      },
      maxTokens: {
        type: Number,
        default: 2000,
        min: 1,
        max: 200000
      },
      rateLimits: {
        requestsPerMinute: {
          type: Number,
          default: 60,
          min: 1,
          max: 10000
        },
        tokensPerMinute: {
          type: Number,
          default: 60000,
          min: 1,
          max: 1000000
        }
      },
      featureToggles: {
        imageUpload: {
          type: Boolean,
          default: true
        },
        analytics: {
          type: Boolean,
          default: true
        }
      },
      guestLimits: {
        maxChats: {
          type: Number,
          default: 5,
          min: 1,
          max: 100
        }
      }
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

adminSettingsSchema.statics.getSettings = async function () {
  const existing = await this.findOne({ key: 'global' });
  if (existing) return existing;

  const created = new this({ key: 'global' });
  return created.save();
};

adminSettingsSchema.statics.updateSettings = async function (updates, userId) {
  const settingsDoc = await this.getSettings();
  settingsDoc.settings = {
    ...settingsDoc.settings,
    ...updates
  };
  settingsDoc.updatedBy = userId;
  return settingsDoc.save();
};

const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

export default AdminSettings;
