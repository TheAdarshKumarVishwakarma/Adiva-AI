import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';
import AdminSettings from '../models/AdminSettings.js';

const router = express.Router();

const ADMIN_EMAIL = 'adarshvish2606@gmail.com';

const requireAdminWithEmail = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (req.user.role !== 'admin' || req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  return next();
};

// GET /api/admin/settings
router.get('/settings', verifyToken, requireAdminWithEmail, async (req, res) => {
  try {
    const settingsDoc = await AdminSettings.getSettings();
    res.json({ success: true, settings: settingsDoc.settings, updatedAt: settingsDoc.updatedAt });
  } catch (error) {
    console.error('❌ Admin settings fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to load admin settings' });
  }
});

// PUT /api/admin/settings
router.put('/settings', verifyToken, requireAdminWithEmail, async (req, res) => {
  try {
    const { settings, confirm } = req.body;

    if (!confirm || confirm.text !== 'CONFIRM' || !confirm.password) {
      return res.status(400).json({ success: false, message: 'Two-step confirmation required' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordOk = await user.comparePassword(confirm.password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const updated = await AdminSettings.updateSettings(settings || {}, user._id);
    res.json({ success: true, settings: updated.settings, updatedAt: updated.updatedAt });
  } catch (error) {
    console.error('❌ Admin settings update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update admin settings' });
  }
});

// GET /api/admin/users - List all registered users (admin only)
router.get('/users', verifyToken, requireAdminWithEmail, async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email role isActive createdAt lastLogin')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    console.error('❌ Admin users fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
});

export default router;
