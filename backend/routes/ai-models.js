import express from "express";
import OpenAI from "openai";
import dotenv from 'dotenv';
import AdminSettings from '../models/AdminSettings.js';

dotenv.config();

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available AI models configuration
const AI_MODELS = {

  /* --------------------------------
     GPT-4o MINI (COMMENTED - OLD)
     Uses Chat Completions API
  -------------------------------- */
  /*
  'gpt-4o-mini': {
    name: 'Adiva-2.0-Mini',
    provider: 'OpenAI',
    maxTokens: 16384,
    costPer1kTokens: 0.00015,
    description: 'Fast and efficient model for most tasks',
    capabilities: ['text-generation', 'conversation', 'analysis', 'coding', 'vision']
  },
  */

  /* --------------------------------
     GPT-5 NANO MINI (NEW - ACTIVE)
     Uses Responses API
  -------------------------------- */
  'gpt-5-nano': {
    name: 'Adiva-5.0-Nano',
    provider: 'OpenAI',
    maxTokens: 8192,
    costPer1kTokens: 0.00005,
    description: 'Ultra-fast GPT-5 Nano Mini',
    capabilities: ['text-generation', 'conversation']
  },

  'claude-sonnet-4-20250514': {
    name: 'Adiva-4.0-Sonnet',
    provider: 'Anthropic',
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    description: 'Most intelligent Claude model for complex reasoning',
    capabilities: ['text-generation', 'conversation', 'analysis', 'coding', 'reasoning', 'math', 'vision']
  }
};

// GET /api/ai-models
router.get('/ai-models', async (req, res) => {
  try {
    const adminSettings = await AdminSettings.getSettings();
    const allowed = new Set(adminSettings.settings.allowedModels || []);
    const models = Object.entries(AI_MODELS)
      .filter(([id]) => allowed.size === 0 || allowed.has(id))
      .map(([id, model]) => ({
        id,
        ...model
      }));
    
    return res.json({
      models,
      totalModels: models.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('??? AI models list error:', error);
    return res.status(500).json({ error: 'Failed to retrieve AI models' });
  }
});

// GET /api/ai-models/:modelId
router.get('/ai-models/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const model = AI_MODELS[modelId];
    
    if (!model) {
      return res.status(404).json({ error: 'AI model not found' });
    }
    
    const adminSettings = await AdminSettings.getSettings();
    const allowed = new Set(adminSettings.settings.allowedModels || []);
    if (allowed.size > 0 && !allowed.has(modelId)) {
      return res.status(403).json({ error: 'AI model not allowed' });
    }
    
    return res.json({
      id: modelId,
      ...model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ AI model details error:', error);
    return res.status(500).json({ error: 'Failed to retrieve AI model details' });
  }
});

// POST /api/ai-models/generate
router.post('/ai-models/generate', async (req, res) => {
  try {
    const { 
      modelId = 'gpt-5-nano',
      messages, 
      temperature = 0.7, 
      maxTokens = 2000,
      systemPrompt,
      userPrompt 
    } = req.body;

    if (!AI_MODELS[modelId]) {
      return res.status(400).json({ error: 'Invalid AI model specified' });
    }

    const adminSettings = await AdminSettings.getSettings();
    const allowed = new Set(adminSettings.settings.allowedModels || []);
    if (allowed.size > 0 && !allowed.has(modelId)) {
      return res.status(403).json({ error: 'AI model not allowed' });
    }

    if (!messages && !userPrompt) {
      return res.status(400).json({ error: 'Messages or userPrompt is required' });
    }

    let messageArray = [];

    if (systemPrompt) {
      messageArray.push({ role: 'system', content: systemPrompt });
    }

    if (messages) {
      messageArray.push(...messages);
    } else {
      messageArray.push({ role: 'user', content: userPrompt });
    }

    console.log(`🤖 Generating response with model: ${modelId}`);
    console.log(`📝 Message count: ${messageArray.length}`);
    console.log(`🌡️ Temperature: ${temperature}`);
    console.log(`🔢 Max tokens: ${maxTokens}`);

    let aiResponse;
    let usage;

    /* --------------------------------
       GPT-5 NANO → Responses API
    -------------------------------- */
    if (modelId.startsWith('gpt-5')) {
      const response = await openai.responses.create({
        model: modelId,
        input: messageArray
          .map(m => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n'),
        temperature: Math.max(0, Math.min(2, temperature)),
        max_output_tokens: Math.min(maxTokens, AI_MODELS[modelId].maxTokens),
      });

      aiResponse = response.output_text;
      usage = response.usage;
    }

    /* --------------------------------
       GPT-4o MINI (COMMENTED - OLD)
    -------------------------------- */
    /*
    else {
      const response = await openai.chat.completions.create({
        model: modelId,
        messages: messageArray,
        temperature: Math.max(0, Math.min(2, temperature)),
        max_tokens: Math.min(maxTokens, AI_MODELS[modelId].maxTokens),
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      aiResponse = response.choices[0].message.content;
      usage = response.usage;
    }
    */

    console.log(`✅ Response generated successfully`);
    console.log(`📊 Tokens used: ${usage?.total_tokens || 0}`);
    console.log(
      `💰 Estimated cost: $${(
        ((usage?.total_tokens || 0) / 1000) *
        AI_MODELS[modelId].costPer1kTokens
      ).toFixed(6)}`
    );

    return res.json({
      reply: aiResponse,
      model: modelId,
      usage: {
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        estimatedCost: (
          ((usage?.total_tokens || 0) / 1000) *
          AI_MODELS[modelId].costPer1kTokens
        ).toFixed(6)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ AI generation error:', error);
    
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        error: "You've run out of OpenAI credits. Please upgrade your plan or add billing details.",
        code: 'INSUFFICIENT_QUOTA'
      });
    } else if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: "Invalid OpenAI API key. Please check your configuration.",
        code: 'INVALID_API_KEY'
      });
    } else if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait a moment before trying again.",
        code: 'RATE_LIMIT_EXCEEDED'
      });
    } else if (error.code === 'context_length_exceeded') {
      return res.status(400).json({
        error: "Message too long. Please reduce the input length.",
        code: 'CONTEXT_LENGTH_EXCEEDED'
      });
    } else {
      return res.status(500).json({
        error: "Something went wrong with the AI generation.",
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// POST /api/ai-models/compare
router.post('/ai-models/compare', async (req, res) => {
  try {
    const { 
      prompt, 
      models = ['gpt-4o-mini', 'claude-sonnet-4-20250514'], 
      temperature = 0.7 
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for comparison' });
    }
    
    const results = [];
    
    for (const modelId of models) {
      if (!AI_MODELS[modelId]) {
        results.push({
          model: modelId,
          error: 'Model not found',
          success: false
        });
        continue;
      }
      
      try {
        const startTime = Date.now();
        let response;
        
        // Check if it's a Claude model
        if (modelId.startsWith('claude-')) {
          // Import ClaudeService dynamically to avoid circular imports
          const ClaudeService = (await import('../services/claudeService.js')).default;
          
          const claudeResponse = await ClaudeService.generateResponse({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 1000,
            temperature
          });
          
          response = {
            choices: [{ message: { content: claudeResponse.content } }],
            usage: claudeResponse.usage
          };
        } else {
          // OpenAI model
          response = await openai.chat.completions.create({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: 1000,
          });
        }
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results.push({
          model: modelId,
          response: response.choices[0].message.content,
          usage: response.usage,
          responseTime,
          estimatedCost: ((response.usage.total_tokens / 1000) * AI_MODELS[modelId].costPer1kTokens).toFixed(6),
          success: true
        });
        
      } catch (error) {
        results.push({
          model: modelId,
          error: error.message,
          success: false
        });
      }
    }
    
    return res.json({
      prompt,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Model comparison error:', error);
    return res.status(500).json({ error: 'Failed to compare AI models' });
  }
});

// GET /api/ai-models/capabilities
router.get('/ai-models/capabilities', (req, res) => {
  try {
    const capabilities = {};
    
    Object.entries(AI_MODELS).forEach(([modelId, model]) => {
      model.capabilities.forEach(capability => {
        if (!capabilities[capability]) {
          capabilities[capability] = [];
        }
        capabilities[capability].push({
          modelId,
          name: model.name,
          provider: model.provider
        });
      });
    });
    
    return res.json({
      capabilities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Capabilities error:', error);
    return res.status(500).json({ error: 'Failed to retrieve AI capabilities' });
  }
});

export default router;
