import OpenAI from 'openai';
import AdminSettings from '../../models/AdminSettings.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const AI_MODELS = {
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

export const getAllowedModels = async () => {
  const adminSettings = await AdminSettings.getSettings();
  const allowed = new Set(adminSettings.settings.allowedModels || []);

  return Object.entries(AI_MODELS)
    .filter(([id]) => allowed.size === 0 || allowed.has(id))
    .map(([id, model]) => ({ id, ...model }));
};

export const getModelDetails = async (modelId) => {
  const model = AI_MODELS[modelId];
  if (!model) {
    return { error: 'AI model not found', status: 404 };
  }

  const adminSettings = await AdminSettings.getSettings();
  const allowed = new Set(adminSettings.settings.allowedModels || []);
  if (allowed.size > 0 && !allowed.has(modelId)) {
    return { error: 'AI model not allowed', status: 403 };
  }

  return { data: { id: modelId, ...model } };
};

export const generateWithModel = async ({
  modelId = 'gpt-5-nano',
  messages,
  temperature = 0.7,
  maxTokens = 2000,
  systemPrompt,
  userPrompt
}) => {
  if (!AI_MODELS[modelId]) {
    return { error: 'Invalid AI model specified', status: 400 };
  }

  const adminSettings = await AdminSettings.getSettings();
  const allowed = new Set(adminSettings.settings.allowedModels || []);
  if (allowed.size > 0 && !allowed.has(modelId)) {
    return { error: 'AI model not allowed', status: 403 };
  }

  if (!messages && !userPrompt) {
    return { error: 'Messages or userPrompt is required', status: 400 };
  }

  const messageArray = [];

  if (systemPrompt) {
    messageArray.push({ role: 'system', content: systemPrompt });
  }

  if (messages) {
    messageArray.push(...messages);
  } else {
    messageArray.push({ role: 'user', content: userPrompt });
  }

  let aiResponse;
  let usage;

  if (modelId.startsWith('gpt-5')) {
    const response = await openai.responses.create({
      model: modelId,
      input: messageArray.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n'),
      temperature: Math.max(0, Math.min(2, temperature)),
      max_output_tokens: Math.min(maxTokens, AI_MODELS[modelId].maxTokens),
    });

    aiResponse = response.output_text;
    usage = response.usage;
  }

  return {
    data: {
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
      }
    }
  };
};

export const compareModels = async ({
  prompt,
  models = ['gpt-4o-mini', 'claude-sonnet-4-20250514'],
  temperature = 0.7
}) => {
  if (!prompt) {
    return { error: 'Prompt is required for comparison', status: 400 };
  }

  const results = [];

  for (const modelId of models) {
    if (!AI_MODELS[modelId]) {
      results.push({ model: modelId, error: 'Model not found', success: false });
      continue;
    }

    try {
      const startTime = Date.now();
      let response;

      if (modelId.startsWith('claude-')) {
        const ClaudeService = (await import('../claudeService.js')).default;

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
      results.push({ model: modelId, error: error.message, success: false });
    }
  }

  return { data: { prompt, results } };
};

export const getCapabilities = () => {
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

  return capabilities;
};
