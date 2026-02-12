import express from 'express';
import chatRoutes from './chat.js';
import analyticsRoutes from './analytics.js';
import aiModelsRoutes from './ai-models.js';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import adminRoutes from './admin.js';

const router = express.Router();

// API version prefix
const API_VERSION = '/api';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/user`, userRoutes);
router.use(`${API_VERSION}/admin`, adminRoutes);
router.use(API_VERSION, chatRoutes);
router.use(API_VERSION, analyticsRoutes);
router.use(API_VERSION, aiModelsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Advanced AI API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: [
      'Enhanced Chat with Conversation History',
      'Advanced Analytics & Insights',
      'Multiple AI Models Support',
      'Real-time Usage Tracking',
      'Model Comparison Tools'
    ]
  });
});

// API documentation endpoint
router.get('/api-docs', (req, res) => {
  res.json({
    title: 'Advanced AI Assistant API Documentation',
    version: '2.0.0',
    description: 'Comprehensive AI assistant with multiple models, analytics, and conversation management',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user account',
        'POST /api/auth/login': 'Login user and get JWT token',
        'POST /api/auth/logout': 'Logout user and clear token',
        'GET /api/auth/me': 'Get current user profile',
        'PUT /api/auth/profile': 'Update user profile',
        'PUT /api/auth/change-password': 'Change user password',
        'GET /api/auth/google': 'Google OAuth login',
        'GET /api/auth/google/callback': 'Google OAuth callback',
        'POST /api/auth/google/check': 'Check if user has Google account'
      },
      user: {
        'GET /api/user/profile': 'Get user profile with all data',
        'PUT /api/user/profile': 'Update user profile',
        'GET /api/user/settings': 'Get user settings',
        'PUT /api/user/settings': 'Update user settings',
        'POST /api/user/settings/reset': 'Reset settings to defaults',
        'GET /api/user/analytics': 'Get user analytics and insights',
        'GET /api/user/export': 'Export all user data',
        'DELETE /api/user/account': 'Delete user account and all data'
      },
      admin: {
        'GET /api/admin/settings': 'Get admin system settings',
        'PUT /api/admin/settings': 'Update admin system settings (2-step confirmation)'
      },
      chat: {
        'POST /api/chat': 'Send a message and get AI response with conversation history',
        'GET /api/chat/history/:conversationId': 'Get conversation history',
        'DELETE /api/chat/history/:conversationId': 'Delete conversation history',
        'GET /api/chat/conversations': 'List all conversations'
      },
      analytics: {
        'GET /api/analytics/overview': 'Get comprehensive analytics overview',
        'GET /api/analytics/daily': 'Get daily usage statistics',
        'GET /api/analytics/hourly': 'Get hourly usage statistics',
        'GET /api/analytics/task-types': 'Get task type distribution',
        'POST /api/analytics/track': 'Track custom analytics events',
        'DELETE /api/analytics/reset': 'Reset analytics data'
      },
      aiModels: {
        'GET /api/ai-models': 'List available AI models',
        'GET /api/ai-models/:modelId': 'Get specific model details',
        'POST /api/ai-models/generate': 'Generate response with specific model',
        'POST /api/ai-models/compare': 'Compare responses from multiple models',
        'GET /api/ai-models/capabilities': 'Get model capabilities by category'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    availableEndpoints: [
      '/health',
      '/api-docs',
      '/api/auth',
      '/api/user',
      '/api/chat',
      '/api/analytics',
      '/api/ai-models'
    ]
  });
});

export default router; 
