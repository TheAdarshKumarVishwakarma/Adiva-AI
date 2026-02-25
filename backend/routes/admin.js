import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  requireAdminWithEmail,
  getAdminSettings,
  updateAdminSettings,
  getAdminUsers
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/settings', verifyToken, requireAdminWithEmail, getAdminSettings);
router.put('/settings', verifyToken, requireAdminWithEmail, updateAdminSettings);
router.get('/users', verifyToken, requireAdminWithEmail, getAdminUsers);

export default router;
