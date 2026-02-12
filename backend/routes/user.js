import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';
import UserAnalytics from '../models/UserAnalytics.js';
import Chat from '../models/Chat.js';

const router = express.Router();

// GET /api/user/profile - Get user profile with all data
router.get('/profile', verifyToken, async (req, res) => {
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
});

// PUT /api/user/profile - Update user profile
router.put('/profile', verifyToken, async (req, res) => {
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
});

// GET /api/user/settings - Get user settings
router.get('/settings', verifyToken, async (req, res) => {
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
});

// PUT /api/user/settings - Update user settings
router.put('/settings', verifyToken, async (req, res) => {
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
});

// POST /api/user/settings/reset - Reset settings to defaults
router.post('/settings/reset', verifyToken, async (req, res) => {
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
});

// GET /api/user/analytics - Get user analytics
router.get('/analytics', verifyToken, async (req, res) => {
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
});

// GET /api/user/export - Export all user data
router.get('/export', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const exportData = await user.exportAllData();
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);
    
    res.json(exportData);
  } catch (error) {
    console.error('❌ Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// DELETE /api/user/account - Delete user account and all data
router.delete('/account', verifyToken, async (req, res) => {
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
});

// GET /api/user/chats - Get user's chat history (alias)
router.get('/chats', verifyToken, async (req, res) => {
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
});

// DELETE /api/user/chats - Delete all user chats
router.delete('/chats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await Chat.deleteMany({ user: userId });
    res.json({ success: true, message: 'All chats deleted' });
  } catch (error) {
    console.error('❌ Delete all chats error:', error);
    res.status(500).json({ error: 'Failed to delete chats' });
  }
});

// POST /api/user/chats/import - Import chats (and optional settings)
router.post('/chats/import', verifyToken, async (req, res) => {
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
});

export default router;

