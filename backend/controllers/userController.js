import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';
import Chat from '../models/Chat.js';

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fullProfile = await user.getFullProfile();

    res.json({
      success: true,
      ...fullProfile
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = await user.getSettings();

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('❌ Get settings error:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settingsData = req.body;
    if (settingsData?.appearance?.language === 'en') {
      settingsData.appearance.language = 'en-US';
    }
    if (settingsData?.appearance?.speechLanguage === 'en') {
      settingsData.appearance.speechLanguage = 'en-US';
    }

    const settings = await UserSettings.bulkUpdateSettings(userId, settingsData);

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('❌ Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const resetUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await UserSettings.getOrCreateUserSettings(userId);
    await settings.resetToDefaults();

    res.json({
      success: true,
      settings,
      message: 'Settings reset to defaults'
    });
  } catch (error) {
    console.error('❌ Reset settings error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
};

export const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const analytics = await user.getAnalytics();
    const insights = analytics.getInsights();

    res.json({
      success: true,
      analytics,
      insights
    });
  } catch (error) {
    console.error('❌ Get analytics error:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
};

export const exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const exportData = await user.exportAllData();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);

    res.json(exportData);
  } catch (error) {
    console.error('❌ Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.deleteUserData();

    res.json({
      success: true,
      message: 'Account and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

export const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit, includeArchived = false } = req.query;

    const totalChats = await Chat.countDocuments({
      user: userId,
      ...(includeArchived !== 'true' ? { isArchived: false } : {})
    });

    const parsedLimit = limit ? parseInt(limit) : null;
    const parsedPage = parseInt(page);
    const skip = parsedLimit ? (parsedPage - 1) * parsedLimit : 0;

    const chats = await Chat.getUserChats(userId, {
      ...(parsedLimit ? { limit: parsedLimit, skip } : {}),
      includeArchived: includeArchived === 'true'
    });

    res.json({
      success: true,
      chats,
      pagination: {
        page: parsedLimit ? parsedPage : 1,
        limit: parsedLimit || totalChats,
        total: totalChats,
        pages: parsedLimit ? Math.ceil(totalChats / parsedLimit) : 1
      }
    });
  } catch (error) {
    console.error('❌ Get user chats error:', error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
};

export const deleteAllUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    await Chat.deleteMany({ user: userId });
    res.json({ success: true, message: 'All chats deleted' });
  } catch (error) {
    console.error('❌ Delete all chats error:', error);
    res.status(500).json({ error: 'Failed to delete chats' });
  }
};

export const importUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chats = [], settings } = req.body;

    if (!Array.isArray(chats)) {
      return res.status(400).json({ error: 'Chats must be an array' });
    }

    const createdChats = [];

    for (let i = 0; i < chats.length; i++) {
      const chat = chats[i] || {};
      const baseConversationId = chat.conversationId || `chat_${Date.now()}_${userId}_${i}`;

      let conversationId = baseConversationId;
      let suffix = 0;
      while (await Chat.findOne({ conversationId })) {
        suffix += 1;
        conversationId = `${baseConversationId}_${suffix}`;
      }

      const rawMessages = Array.isArray(chat.messages) ? chat.messages : [];
      const messages = rawMessages.map((m) => {
        if (m.role && m.content) {
          return {
            role: m.role,
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            metadata: m.metadata || {}
          };
        }
        return {
          role: m.sender === 'AI' ? 'assistant' : 'user',
          content: m.text || '',
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          metadata: {
            imageUrl: m.imageUrl || null,
            liked: m.liked || false,
            disliked: m.disliked || false
          }
        };
      });

      const newChat = new Chat({
        user: userId,
        title: chat.title || 'Imported Chat',
        conversationId,
        messages,
        pinned: !!chat.pinned,
        isArchived: !!chat.isArchived,
        lastMessageAt: chat.lastModified ? new Date(chat.lastModified) : new Date()
      });

      await newChat.save();
      createdChats.push(newChat);
    }

    if (settings && typeof settings === 'object') {
      await UserSettings.bulkUpdateSettings(userId, settings);
    }

    res.json({
      success: true,
      imported: createdChats.length
    });
  } catch (error) {
    console.error('❌ Import chats error:', error);
    res.status(500).json({ error: 'Failed to import chats' });
  }
};
