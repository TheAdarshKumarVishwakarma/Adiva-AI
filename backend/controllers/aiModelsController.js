import {
  getAllowedModels,
  getModelDetails,
  generateWithModel,
  compareModels,
  getCapabilities
} from '../services/ai/aiModelsService.js';

const handleAiError = (res, error) => {
  if (error.code === 'insufficient_quota') {
    return res.status(429).json({
      error: "You've run out of OpenAI credits. Please upgrade your plan or add billing details.",
      code: 'INSUFFICIENT_QUOTA'
    });
  }

  if (error.code === 'invalid_api_key') {
    return res.status(401).json({
      error: 'Invalid OpenAI API key. Please check your configuration.',
      code: 'INVALID_API_KEY'
    });
  }

  if (error.code === 'rate_limit_exceeded') {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a moment before trying again.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  if (error.code === 'context_length_exceeded') {
    return res.status(400).json({
      error: 'Message too long. Please reduce the input length.',
      code: 'CONTEXT_LENGTH_EXCEEDED'
    });
  }

  return res.status(500).json({
    error: 'Something went wrong with the AI generation.',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

export const listAiModels = async (req, res) => {
  try {
    const models = await getAllowedModels();
    return res.json({
      models,
      totalModels: models.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('??? AI models list error:', error);
    return res.status(500).json({ error: 'Failed to retrieve AI models' });
  }
};

export const getAiModelById = async (req, res) => {
  try {
    const { modelId } = req.params;
    const result = await getModelDetails(modelId);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({
      ...result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ AI model details error:', error);
    return res.status(500).json({ error: 'Failed to retrieve AI model details' });
  }
};

export const generateAiModelResponse = async (req, res) => {
  try {
    const result = await generateWithModel(req.body);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({
      ...result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ AI generation error:', error);
    return handleAiError(res, error);
  }
};

export const compareAiModels = async (req, res) => {
  try {
    const result = await compareModels(req.body);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({
      ...result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Model comparison error:', error);
    return res.status(500).json({ error: 'Failed to compare AI models' });
  }
};

export const getAiCapabilities = (req, res) => {
  try {
    const capabilities = getCapabilities();
    return res.json({ capabilities, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Capabilities error:', error);
    return res.status(500).json({ error: 'Failed to retrieve AI capabilities' });
  }
};
