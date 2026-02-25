import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getUserProfile,
  updateUserProfile,
  getUserSettings,
  updateUserSettings,
  resetUserSettings,
  getUserAnalytics,
  exportUserData,
  deleteUserAccount,
  getUserChats,
  deleteAllUserChats,
  importUserChats
} from '../controllers/userController.js';

const router = express.Router();

router.get('/profile', verifyToken, getUserProfile);
router.put('/profile', verifyToken, updateUserProfile);
router.get('/settings', verifyToken, getUserSettings);
router.put('/settings', verifyToken, updateUserSettings);
router.post('/settings/reset', verifyToken, resetUserSettings);
router.get('/analytics', verifyToken, getUserAnalytics);
router.get('/export', verifyToken, exportUserData);
router.delete('/account', verifyToken, deleteUserAccount);
router.get('/chats', verifyToken, getUserChats);
router.delete('/chats', verifyToken, deleteAllUserChats);
router.post('/chats/import', verifyToken, importUserChats);

export default router;
