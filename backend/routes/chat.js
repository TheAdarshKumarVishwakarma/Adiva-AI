import express from "express";
import OpenAI from "openai";
import dotenv from 'dotenv';
import multer from 'multer';
import analyticsService from '../services/analyticsService.js';
import ClaudeService from '../services/claudeService.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';
import UserAnalytics from '../models/UserAnalytics.js';
import AdminSettings from '../models/AdminSettings.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js';
import { enforceGuestChatLimit, guestLimitResponse } from '../middleware/guest.js';

dotenv.config();

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const normalizeOpenAIParams = (model, params) => {
  const next = { ...params };
  // gpt-5 models only support temperature=1 and max_completion_tokens
  if (typeof model === 'string' && model.startsWith('gpt-5')) {
    delete next.temperature;
    next.max_completion_tokens = next.max_completion_tokens ?? next.max_tokens;
    delete next.max_tokens;
  }
  return next;
};

// In-memory conversation store (used by legacy image chat endpoints)
const conversationHistory = new Map();
const MAX_GUEST_HISTORY = 10;

const buildGuestMessages = (history, systemPrompt, userContent) => {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push(...history);
  messages.push({ role: 'user', content: userContent });
  return messages;
};

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// POST /api/chat - User-aware chat endpoint
router.post('/chat', optionalAuth, async (req, res) => {
  console.log('🚀 Chat route called with body:', req.body);
  try {
    const { message, conversationId, systemPrompt, userPrompt, modelId, stream = false } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!req.user) {
      const limit = await enforceGuestChatLimit(req, res);
      if (!limit.allowed) {
        return guestLimitResponse(res, limit.maxChats);
      }

      const adminSettings = await AdminSettings.getSettings();
      let selectedModel = modelId || adminSettings.settings.defaultModel;
      const allowedModels = adminSettings.settings.allowedModels || [];
      if (allowedModels.length && !allowedModels.includes(selectedModel)) {
        selectedModel = adminSettings.settings.defaultModel || allowedModels[0] || selectedModel;
      }

      const effectiveMaxTokens = adminSettings.settings.maxTokens || 2000;
      const effectiveSystemPrompt = [adminSettings.settings.systemPromptTemplate, systemPrompt]
        .filter(Boolean)
        .join('\n\n');

      const guestConversationId =
        conversationId && conversationId !== 'current'
          ? conversationId
          : `guest_${limit.guestId}`;
      const history = (conversationHistory.get(guestConversationId) || []).slice(-MAX_GUEST_HISTORY);
      const messages = buildGuestMessages(history, effectiveSystemPrompt, userPrompt || message);

      let aiResponse;
      let usage;

      if (ClaudeService.isClaudeModel(selectedModel)) {
        const claudeMessages = ClaudeService.convertMessagesToClaudeFormat(messages);
        const claudeResponse = await ClaudeService.generateResponse({
          model: selectedModel,
          messages: claudeMessages,
          maxTokens: effectiveMaxTokens,
          temperature: 1,
          systemPrompt: effectiveSystemPrompt
        });
        aiResponse = claudeResponse.content;
        usage = claudeResponse.usage;
      } else {
        const response = await openai.chat.completions.create(
          normalizeOpenAIParams(selectedModel, {
            model: selectedModel,
            messages: messages,
            temperature: 1,
            max_completion_tokens: effectiveMaxTokens,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          })
        );
        aiResponse = response.choices[0].message.content;
        usage = response.usage;
      }

      const nextHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: aiResponse }];
      conversationHistory.set(guestConversationId, nextHistory.slice(-MAX_GUEST_HISTORY));

      if (usage && adminSettings.settings.featureToggles?.analytics !== false) {
        analyticsService.trackTokens(usage.total_tokens || usage.total_tokens);
        analyticsService.trackConversation();
      }

      return res.json({
        reply: aiResponse,
        conversationId: guestConversationId,
        messageCount: nextHistory.length,
        usage: usage,
        model: selectedModel,
        timestamp: new Date().toISOString()
      });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user settings for default values
    const userSettings = await user.getSettings();
    const adminSettings = await AdminSettings.getSettings();
    
    // Use user's default model if not specified (fallback to admin default)
    let selectedModel = modelId || userSettings.aiSettings.defaultModel || adminSettings.settings.defaultModel;
    const allowedModels = adminSettings.settings.allowedModels || [];
    if (allowedModels.length && !allowedModels.includes(selectedModel)) {
      selectedModel = adminSettings.settings.defaultModel || allowedModels[0] || selectedModel;
    }
    
    const effectiveMaxTokens = Math.min(
      userSettings.aiSettings.defaultMaxTokens,
      adminSettings.settings.maxTokens || userSettings.aiSettings.defaultMaxTokens
    );
    const effectiveSystemPrompt = [adminSettings.settings.systemPromptTemplate, systemPrompt || userSettings.advanced.customSystemPrompt]
      .filter(Boolean)
      .join('\n\n');
    
    // Generate conversation ID if not provided or invalid placeholder
    const normalizedConversationId =
      conversationId && conversationId !== 'current' ? conversationId : null;
    const chatId = normalizedConversationId || `chat_${Date.now()}_${userId}`;
    
    // Get or create chat
    let chat = await Chat.findOne({ conversationId: chatId, user: userId });
    
    if (!chat) {
      // Create new chat
      chat = new Chat({
        user: userId,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        conversationId: chatId,
        settings: {
          model: selectedModel,
          temperature: userSettings.aiSettings.defaultTemperature,
          maxTokens: effectiveMaxTokens,
          systemPrompt: effectiveSystemPrompt,
          personality: userSettings.aiSettings.personality,
          defensiveMode: userSettings.aiSettings.defensiveMode
        }
      });
      await chat.save();
    }
    
    // Prepare messages array
    const messages = [];
    
    // Add system prompt if provided
    const chatSystemPrompt = effectiveSystemPrompt || chat.settings.systemPrompt;
    if (chatSystemPrompt) {
      messages.push({ role: 'system', content: chatSystemPrompt });
    }
    
    // Add conversation history (last 10 messages to stay within limits)
    const recentHistory = chat.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    messages.push(...recentHistory);
    
    // Add current user message
    messages.push({ role: 'user', content: userPrompt || message });
    
    console.log(`🤖 Processing chat request for conversation: ${chatId}`);
    console.log(`📝 Message count: ${messages.length}`);
    console.log(`💬 User message: ${message.substring(0, 100)}...`);
    console.log(`🤖 Selected model: ${selectedModel}`);
    console.log(`🔄 Stream mode: ${stream}`);
    console.log(`🔑 OpenAI API Key present: ${!!process.env.OPENAI_API_KEY}`);
    console.log(`🔑 Anthropic API Key present: ${!!process.env.ANTHROPIC_API_KEY}`);

    // Save user message before AI call to avoid empty chats on failures
    await chat.addMessage('user', message, {
      model: selectedModel,
      tokens: 0
    });

    let response;
    let aiResponse;
    let usage;

    // Check if it's a Claude model
    if (ClaudeService.isClaudeModel(selectedModel)) {
      console.log('🟣 Using Claude AI');
      
      // Convert messages to Claude format
      const claudeMessages = ClaudeService.convertMessagesToClaudeFormat(messages);
      
      const claudeResponse = await ClaudeService.generateResponse({
        model: selectedModel,
        messages: claudeMessages,
        maxTokens: effectiveMaxTokens,
        temperature: chat.settings.temperature,
        systemPrompt: chatSystemPrompt
      });

      aiResponse = claudeResponse.content;
      usage = claudeResponse.usage;
      
      console.log('🔍 Claude Response:', {
        hasUsage: !!usage,
        usage: usage,
        model: claudeResponse.model
      });
      
    } else {
      console.log('🔵 Using OpenAI');
      
      response = await openai.chat.completions.create(
        normalizeOpenAIParams(selectedModel, {
          model: selectedModel,
          messages: messages,
          temperature: chat.settings.temperature,
          max_completion_tokens: effectiveMaxTokens,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        })
      );

      aiResponse = response.choices[0].message.content;
      usage = response.usage;
      
      console.log('🔍 OpenAI Response:', {
        hasUsage: !!usage,
        usage: usage,
        hasChoices: !!response.choices,
        choiceCount: response.choices?.length
      });
    }
    
    if (!aiResponse || !String(aiResponse).trim()) {
      aiResponse = 'Sorry, I could not generate a response. Please try again.';
    }

    // Track analytics
    if (usage && adminSettings.settings.featureToggles?.analytics !== false) {
      console.log('📊 Tracking tokens:', usage.total_tokens || usage.total_tokens);
      analyticsService.trackTokens(usage.total_tokens || usage.total_tokens);
      analyticsService.trackConversation();
    } else {
      console.log('⚠️ No usage data in response');
    }
    
      // Save assistant message to database
      await chat.addMessage('assistant', aiResponse, {
        model: selectedModel,
        tokens: usage ? (usage.total_tokens || usage.total_tokens || 0) : 0
      });
    
    // Update chat title from first user message if it's still the default
    if (chat.title.startsWith('New Chat') || chat.title.length < 10) {
      chat.updateTitleFromFirstMessage();
    }
    
    // Update user analytics
    if (adminSettings.settings.featureToggles?.analytics !== false) {
      const userAnalytics = await user.getAnalytics();
      await userAnalytics.recordMessage('user', selectedModel, 0, ['chat']);
      await userAnalytics.recordMessage('assistant', selectedModel, usage ? (usage.total_tokens || 0) : 0, ['chat']);
      await userAnalytics.updateTimePatterns();
    }

    console.log(`✅ AI response generated successfully`);
    console.log(`📊 Response length: ${aiResponse.length} characters`);

    return res.json({ 
      reply: aiResponse,
      conversationId: chatId,
      messageCount: chat.messageCount,
      usage: usage,
      model: selectedModel,
      timestamp: new Date().toISOString(),
      chatId: chat._id,
      title: chat.title
    });
    
  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
    // Track error in analytics
    analyticsService.trackError();
    
    // Handle Claude-specific errors
    if (error.status) {
      const claudeError = ClaudeService.handleError(error);
      return res.status(error.status).json(claudeError);
    }
    
    // Handle OpenAI errors
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
    } else {
      return res.status(500).json({ 
        error: "Something went wrong with the AI service.",
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// POST /api/chat/stream - Streaming chat endpoint
router.post('/chat/stream', optionalAuth, async (req, res) => {
  console.log('🚀 Streaming chat route called');
  try {
    const { message, conversationId, systemPrompt, userPrompt, modelId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user settings for default values
    const userSettings = await user.getSettings();
    
    // Use user's default model if not specified
    const selectedModel = modelId || userSettings.aiSettings.defaultModel;
    
    // Generate conversation ID if not provided
    const chatId = conversationId || `chat_${Date.now()}_${userId}`;
    
    // Get or create chat
    let chat = await Chat.findOne({ conversationId: chatId, user: userId });
    
    if (!chat) {
      // Create new chat
      chat = new Chat({
        user: userId,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        conversationId: chatId,
        settings: {
          model: selectedModel,
          temperature: userSettings.aiSettings.defaultTemperature,
          maxTokens: userSettings.aiSettings.defaultMaxTokens,
          systemPrompt: systemPrompt || userSettings.advanced.customSystemPrompt,
          personality: userSettings.aiSettings.personality,
          defensiveMode: userSettings.aiSettings.defensiveMode
        }
      });
      await chat.save();
    }

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Prepare messages array
    const messages = [];
    
    // Add system prompt if provided
    if (chat.settings.systemPrompt) {
      messages.push({ role: 'system', content: chat.settings.systemPrompt });
    }
    
    // Add conversation history (last 10 messages to stay within limits)
    const recentHistory = chat.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    messages.push(...recentHistory);
    
    // Add current user message
    messages.push({ role: 'user', content: userPrompt || message });
    
    console.log(`🤖 Processing streaming chat request for conversation: ${chatId}`);
    console.log(`📝 Message count: ${messages.length}`);
    console.log(`💬 User message: ${message.substring(0, 100)}...`);
    console.log(`🤖 Selected model: ${selectedModel}`);

    let fullResponse = '';
    let usage = null;

    try {
      // Check if it's a Claude model (Claude doesn't support streaming yet, so we'll simulate it)
      if (ClaudeService.isClaudeModel(selectedModel)) {
        console.log('🟣 Using Claude AI (simulated streaming)');
        
        // Convert messages to Claude format
        const claudeMessages = ClaudeService.convertMessagesToClaudeFormat(messages);
        
        const claudeResponse = await ClaudeService.generateResponse({
          model: selectedModel,
          messages: claudeMessages,
          maxTokens: chat.settings.maxTokens,
          temperature: chat.settings.temperature,
          systemPrompt: chat.settings.systemPrompt
        });

        fullResponse = claudeResponse.content;
        usage = claudeResponse.usage;
        
        // Simulate streaming by sending chunks
        const words = fullResponse.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
          res.write(`data: ${JSON.stringify({ 
            type: 'content', 
            content: chunk,
            done: false 
          })}\n\n`);
          
          // Add small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } else {
        console.log('🔵 Using OpenAI streaming');
        
        const stream = await openai.chat.completions.create({
          model: selectedModel,
          messages: messages,
          temperature: chat.settings.temperature,
          max_tokens: chat.settings.maxTokens,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ 
              type: 'content', 
              content: content,
              done: false 
            })}\n\n`);
          }
          
          // Capture usage data from the last chunk
          if (chunk.usage) {
            usage = chunk.usage;
          }
        }
      }
      
        if (!fullResponse || !String(fullResponse).trim()) {
          fullResponse = 'Sorry, I could not generate a response. Please try again.';
        }

        // Send completion signal
        res.write(`data: ${JSON.stringify({ 
          type: 'done', 
          content: '',
          usage: usage,
          conversationId: chatId,
          done: true 
        })}\n\n`);
      
      // Track analytics
      if (usage) {
        console.log('📊 Tracking streaming tokens:', usage.total_tokens || usage.total_tokens);
        analyticsService.trackTokens(usage.total_tokens || usage.total_tokens);
        analyticsService.trackConversation();
      }
      
      // Save messages to database
      await chat.addMessage('user', message, {
        model: selectedModel,
        tokens: 0 // User message tokens not tracked
      });
      
        await chat.addMessage('assistant', fullResponse, {
          model: selectedModel,
          tokens: usage ? (usage.total_tokens || usage.total_tokens || 0) : 0
        });
      
      // Update chat title from first user message if it's still the default
      if (chat.title.startsWith('New Chat') || chat.title.length < 10) {
        chat.updateTitleFromFirstMessage();
      }
      
      // Update user analytics
      const userAnalytics = await user.getAnalytics();
      await userAnalytics.recordMessage('user', selectedModel, 0, ['chat']);
      await userAnalytics.recordMessage('assistant', selectedModel, usage ? (usage.total_tokens || 0) : 0, ['chat']);
      await userAnalytics.updateTimePatterns();

      console.log(`✅ Streaming AI response completed successfully`);
      console.log(`📊 Response length: ${fullResponse.length} characters`);

    } catch (streamError) {
      console.error('❌ Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        content: 'An error occurred while generating the response.',
        done: true 
      })}\n\n`);
    }

    res.end();
    
  } catch (error) {
    console.error('❌ Streaming Chat API Error:', error);
    
    // Track error in analytics
    analyticsService.trackError();
    
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      content: 'Something went wrong with the AI service.',
      done: true 
    })}\n\n`);
    res.end();
  }
});

// GET /api/chat/history/:conversationId
router.get('/chat/history/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    const history = conversationHistory.get(conversationId);
    
    if (!history) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    return res.json({
      conversationId,
      messages: history,
      messageCount: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ History retrieval error:', error);
    return res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

// DELETE /api/chat/history/:conversationId
router.delete('/chat/history/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    const deleted = conversationHistory.delete(conversationId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    return res.json({
      message: 'Conversation history deleted successfully',
      conversationId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ History deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete conversation history' });
  }
});



// POST /api/chat-with-image
router.post('/chat-with-image', optionalAuth, upload.single('image'), async (req, res) => {
  console.log('Image chat route called');
  try {
    const { message, conversationId, systemPrompt, modelId = 'gpt-5-nano' } = req.body;
    const imageFile = req.file;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const isGuest = !req.user;
    const adminSettings = await AdminSettings.getSettings();

    if (adminSettings.settings.featureToggles?.imageUpload === false) {
      return res.status(403).json({ error: 'Image uploads are disabled' });
    }

    if (isGuest) {
      const limit = await enforceGuestChatLimit(req, res);
      if (!limit.allowed) {
        return guestLimitResponse(res, limit.maxChats);
      }

      let selectedModel = modelId || adminSettings.settings.defaultModel;
      const allowedModels = adminSettings.settings.allowedModels || [];
      if (allowedModels.length && !allowedModels.includes(selectedModel)) {
        selectedModel = adminSettings.settings.defaultModel || allowedModels[0] || selectedModel;
      }

      const effectiveMaxTokens = adminSettings.settings.maxTokens || 2000;
      const effectiveSystemPrompt = [adminSettings.settings.systemPromptTemplate, systemPrompt]
        .filter(Boolean)
        .join('\n\n');

      const guestConversationId =
        conversationId && conversationId !== 'current'
          ? conversationId
          : `guest_${limit.guestId}`;
      const history = (conversationHistory.get(guestConversationId) || []).slice(-MAX_GUEST_HISTORY);

      const baseMessages = [];
      if (effectiveSystemPrompt) {
        baseMessages.push({ role: 'system', content: effectiveSystemPrompt });
      }
      baseMessages.push(...history);

      let aiResponse;
      let usage;

      if (ClaudeService.isClaudeModel(selectedModel)) {
        const base64Image = imageFile.buffer.toString('base64');
        const claudeMessages = [
          ...ClaudeService.convertMessagesToClaudeFormat(baseMessages),
          {
            role: 'user',
            content: [
              { type: 'text', text: message },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageFile.mimetype,
                  data: base64Image
                }
              }
            ]
          }
        ];

        const claudeResponse = await ClaudeService.generateResponseWithImage({
          model: selectedModel,
          messages: claudeMessages,
          maxTokens: effectiveMaxTokens,
          temperature: 1,
          systemPrompt: effectiveSystemPrompt
        });

        aiResponse = claudeResponse?.content;
        usage = claudeResponse?.usage;
      } else {
        const base64Image = imageFile.buffer.toString('base64');
        const imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;
        const messages = [
          ...baseMessages,
          {
            role: 'user',
            content: [
              { type: 'text', text: message },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ];

        const response = await openai.chat.completions.create(
          normalizeOpenAIParams(selectedModel, {
            model: selectedModel,
            messages: messages,
            temperature: 1,
            max_completion_tokens: effectiveMaxTokens,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          })
        );

        aiResponse = response?.choices?.[0]?.message?.content;
        usage = response?.usage;
      }

      if (!aiResponse || !String(aiResponse).trim()) {
        aiResponse = 'Sorry, I could not process that image. Please try again.';
      }

      const nextHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: aiResponse }];
      conversationHistory.set(guestConversationId, nextHistory.slice(-MAX_GUEST_HISTORY));

      if (usage && adminSettings.settings.featureToggles?.analytics !== false) {
        analyticsService.trackTokens(usage.total_tokens || usage.total_tokens);
        analyticsService.trackConversation();
      }

      return res.json({
        reply: aiResponse,
        conversationId: guestConversationId,
        messageCount: nextHistory.length,
        usage: usage,
        model: selectedModel,
        timestamp: new Date().toISOString()
      });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userSettings = await user.getSettings();
    // const adminSettings = await AdminSettings.getSettings();

    if (adminSettings.settings.featureToggles?.imageUpload === false) {
      return res.status(403).json({ error: 'Image uploads are disabled' });
    }

    let selectedModel = modelId || userSettings.aiSettings.defaultModel || adminSettings.settings.defaultModel;
    const allowedModels = adminSettings.settings.allowedModels || [];
    if (allowedModels.length && !allowedModels.includes(selectedModel)) {
      selectedModel = adminSettings.settings.defaultModel || allowedModels[0] || selectedModel;
    }

    const effectiveMaxTokens = Math.min(
      userSettings.aiSettings.defaultMaxTokens,
      adminSettings.settings.maxTokens || userSettings.aiSettings.defaultMaxTokens
    );
    const effectiveSystemPrompt = [adminSettings.settings.systemPromptTemplate, systemPrompt || userSettings.advanced.customSystemPrompt]
      .filter(Boolean)
      .join('\n\n');
    const normalizedConversationId =
      conversationId && conversationId !== 'current' ? conversationId : null;
    const chatId = normalizedConversationId || `chat_${Date.now()}_${userId}`;

    let chat = await Chat.findOne({ conversationId: chatId, user: userId });
    if (!chat) {
      chat = new Chat({
        user: userId,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        conversationId: chatId,
        settings: {
          model: selectedModel,
          temperature: userSettings.aiSettings.defaultTemperature,
          maxTokens: effectiveMaxTokens,
          systemPrompt: effectiveSystemPrompt,
          personality: userSettings.aiSettings.personality,
          defensiveMode: userSettings.aiSettings.defensiveMode
        }
      });
      await chat.save();
    }

    const messages = [];
    const chatSystemPrompt = effectiveSystemPrompt || chat.settings.systemPrompt;
    if (chatSystemPrompt) {
      messages.push({ role: 'system', content: chatSystemPrompt });
    }

    const recentHistory = chat.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    messages.push(...recentHistory);

    console.log(`Processing image chat request for conversation: ${chatId}`);
    console.log(`Message count: ${messages.length}`);
    console.log(`User message: ${message.substring(0, 100)}...`);
    console.log(`Image size: ${imageFile.size} bytes`);
    console.log(`Selected model: ${selectedModel}`);

    // Save user message before AI call to avoid empty chats on failures
    await chat.addMessage('user', message, {
      model: selectedModel,
      tokens: 0,
      hasImage: true,
      imageName: imageFile.originalname,
      imageMime: imageFile.mimetype
    });

    let aiResponse;
    let usage;

      if (ClaudeService.isClaudeModel(selectedModel)) {
        console.log('Using Claude AI for image processing');
        const base64Image = imageFile.buffer.toString('base64');
        const claudeMessages = [
          ...ClaudeService.convertMessagesToClaudeFormat(messages),
        {
          role: 'user',
          content: [
            { type: 'text', text: message },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageFile.mimetype,
                data: base64Image
              }
            }
          ]
        }
      ];

      const claudeResponse = await ClaudeService.generateResponseWithImage({
        model: selectedModel,
        messages: claudeMessages,
        maxTokens: effectiveMaxTokens,
        temperature: 0.7,
        systemPrompt: chatSystemPrompt
      });

        aiResponse = claudeResponse.content;
        usage = claudeResponse.usage;
      } else {
        console.log('Using OpenAI for image processing');
        const base64Image = imageFile.buffer.toString('base64');
      const imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      });

      const response = await openai.chat.completions.create(
        normalizeOpenAIParams(selectedModel, {
          model: selectedModel,
          messages: messages,
          temperature: 0.7,
          max_completion_tokens: effectiveMaxTokens,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      );

        aiResponse = response.choices[0].message.content;
        usage = response.usage;
      }

      if (!aiResponse || !String(aiResponse).trim()) {
        aiResponse = 'Sorry, I could not process that image. Please try again.';
      }

      if (usage && adminSettings.settings.featureToggles?.analytics !== false) {
        analyticsService.trackTokens(usage.total_tokens || usage.total_tokens);
        analyticsService.trackConversation();
      }

    await chat.addMessage('assistant', aiResponse, {
      model: selectedModel,
      tokens: usage ? (usage.total_tokens || usage.total_tokens || 0) : 0
    });

    if (chat.title.startsWith('New Chat') || chat.title.length < 10) {
      chat.updateTitleFromFirstMessage();
    }

    if (adminSettings.settings.featureToggles?.analytics !== false) {
      const userAnalytics = await user.getAnalytics();
      await userAnalytics.recordMessage('user', selectedModel, 0, ['image']);
      await userAnalytics.recordMessage('assistant', selectedModel, usage ? (usage.total_tokens || 0) : 0, ['image']);
      await userAnalytics.updateTimePatterns();
    }

    return res.json({
      reply: aiResponse,
      conversationId: chatId,
      messageCount: chat.messageCount,
      usage: usage,
      model: selectedModel,
      timestamp: new Date().toISOString(),
      chatId: chat._id,
      title: chat.title
    });
  } catch (error) {
    console.error('Image Chat API Error:', error);
    analyticsService.trackError();

    if (error.status) {
      const claudeError = ClaudeService.handleError(error);
      return res.status(error.status).json(claudeError);
    }

    if (error.code == 'insufficient_quota') {
      return res.status(429).json({
        error: "You've run out of OpenAI credits. Please upgrade your plan or add billing details.",
        code: 'INSUFFICIENT_QUOTA'
      });
    } else if (error.code == 'invalid_api_key') {
      return res.status(401).json({
        error: 'Invalid OpenAI API key. Please check your configuration.',
        code: 'INVALID_API_KEY'
      });
    } else if (error.code == 'rate_limit_exceeded') {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait a moment before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    } else {
      return res.status(500).json({
        error: 'Something went wrong with the AI image processing service.',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV == 'development' ? error.message : undefined
      });
    }
  }
});


// GET /api/chat/conversations
router.get('/chat/conversations', (req, res) => {
  try {
    const conversations = Array.from(conversationHistory.keys()).map(id => ({
      conversationId: id,
      messageCount: conversationHistory.get(id).length,
      lastMessage: conversationHistory.get(id).slice(-1)[0]?.content?.substring(0, 100) || 'No messages'
    }));
    
    return res.json({
      conversations,
      totalConversations: conversations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Conversations list error:', error);
    return res.status(500).json({ error: 'Failed to retrieve conversations list' });
  }
});

// GET /api/chat/user/chats - Get user's chat history
router.get('/user/chats', verifyToken, async (req, res) => {
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

// GET /api/chat/user/chats/:chatId - Get specific chat
router.get('/user/chats/:chatId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({ _id: chatId, user: userId })
      .populate('user', 'name email avatar');
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('❌ Get chat error:', error);
    res.status(500).json({ error: 'Failed to retrieve chat' });
  }
});

// PUT /api/chat/user/chats/:chatId - Update chat (title, settings)
router.put('/user/chats/:chatId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { title, settings, pinned } = req.body;
    
    const chat = await Chat.findOne({ _id: chatId, user: userId });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    if (title) chat.title = title;
    if (typeof pinned === 'boolean') chat.pinned = pinned;
    if (settings) {
      Object.assign(chat.settings, settings);
    }
    
    await chat.save();
    
    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('❌ Update chat error:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

// PUT /api/chat/user/chats/:chatId/messages/:messageId - Update a message
router.put('/user/chats/:chatId/messages/:messageId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId, messageId } = req.params;
    const { content, metadata } = req.body;

    const chat = await Chat.findOne({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (typeof content === 'string') {
      message.content = content;
    }

    if (metadata && typeof metadata === 'object') {
      message.metadata = { ...message.metadata, ...metadata };
    }

    chat.lastMessageAt = new Date();
    chat.updateTitleFromFirstMessage();
    await chat.save();

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('❌ Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// DELETE /api/chat/user/chats/:chatId - Delete chat
router.delete('/user/chats/:chatId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({ _id: chatId, user: userId });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    await chat.deleteOne();
    
    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// POST /api/chat/user/chats/:chatId/archive - Archive chat
router.post('/user/chats/:chatId/archive', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({ _id: chatId, user: userId });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    await chat.archive();
    
    res.json({
      success: true,
      message: 'Chat archived successfully'
    });
  } catch (error) {
    console.error('❌ Archive chat error:', error);
    res.status(500).json({ error: 'Failed to archive chat' });
  }
});

// POST /api/chat/user/chats/:chatId/restore - Restore archived chat
router.post('/user/chats/:chatId/restore', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({ _id: chatId, user: userId });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    await chat.restore();
    
    res.json({
      success: true,
      message: 'Chat restored successfully'
    });
  } catch (error) {
    console.error('❌ Restore chat error:', error);
    res.status(500).json({ error: 'Failed to restore chat' });
  }
});

// GET /api/chat/user/search - Search user's chats
router.get('/user/search', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const chats = await Chat.searchUserChats(userId, q, {
      limit: parseInt(limit),
      skip
    });
    
    res.json({
      success: true,
      chats,
      query: q
    });
  } catch (error) {
    console.error('❌ Search chats error:', error);
    res.status(500).json({ error: 'Failed to search chats' });
  }
});

export default router;
