import express from 'express';
import dotenv from 'dotenv';
import {
  listAiModels,
  getAiModelById,
  generateAiModelResponse,
  compareAiModels,
  getAiCapabilities
} from '../controllers/aiModelsController.js';

dotenv.config();

const router = express.Router();

router.get('/ai-models', listAiModels);
router.get('/ai-models/:modelId', getAiModelById);
router.post('/ai-models/generate', generateAiModelResponse);
router.post('/ai-models/compare', compareAiModels);
router.get('/ai-models/capabilities', getAiCapabilities);

export default router;
