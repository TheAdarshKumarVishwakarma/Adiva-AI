import express from 'express';
import UserSettings from '../models/UserSettings.js';
import { optionalAuth } from '../middleware/auth.js';
import { executeTool, supportedTools } from '../services/tools/toolService.js';

const router = express.Router();

router.get('/tools', (req, res) => {
  res.json({
    success: true,
    tools: supportedTools
  });
});

router.post('/tools/execute', optionalAuth, async (req, res) => {
  try {
    const { tool, input, approved } = req.body || {};

    if (!approved) {
      return res.status(403).json({
        success: false,
        error: 'Permission gate denied. User approval is required.'
      });
    }

    if (!tool) {
      return res.status(400).json({ success: false, error: 'Tool is required' });
    }

    // Guest policy: only low-risk tools.
    if (!req.user && tool === 'code_runner') {
      return res.status(403).json({
        success: false,
        error: 'Please sign in to use this tool'
      });
    }

    // Authenticated user policy via settings gate.
    if (req.user) {
      const settings = await UserSettings.getOrCreateUserSettings(req.user.id);
      const toolsGate = settings?.advanced?.toolPermissions || {};
      if (toolsGate?.[tool] === false) {
        return res.status(403).json({
          success: false,
          error: `Tool "${tool}" is disabled in your settings`
        });
      }
    }

    const result = await executeTool({ tool, input, user: req.user });
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed'
    });
  }
});

export default router;
