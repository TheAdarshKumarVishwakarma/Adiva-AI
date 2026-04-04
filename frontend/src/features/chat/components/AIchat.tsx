import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TooltipProvider } from '@/components/ui/tooltip';
import 'highlight.js/styles/github-dark.css';
import {
  ChevronDown
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import SettingsPanel from '@/features/settings/components/SettingsPanel';
import { useAuth } from '@/contexts/AuthContext';
import { AVAILABLE_LANGUAGES, AVAILABLE_THEMES } from '@/features/chat/constants/ui';
import { DEFAULT_PROMPT_TEMPLATES, type PromptTemplate } from '@/features/chat/constants/promptTemplates';
import type { AIchatProps, Analytics, ChatSession, Message, Personality } from '@/features/chat/types/chat';
import { chatApi } from '@/features/chat/api/chatApi';
import { extractPlainAnswer } from '@/features/chat/utils/parsing';
import { useAiResponse } from '@/features/chat/hooks/useAiResponse';
import { useChatSession } from '@/features/chat/hooks/useChatSession';
import { useSpeechControls } from '@/features/chat/hooks/useSpeechControls';
import { useSidebarChats } from '@/features/chat/hooks/useSidebarChats';
import ChatMessageList from '@/features/chat/components/ChatMessageList';
import ChatComposer from '@/features/chat/components/ChatComposer';
import LogoMark from '@/shared/components/LogoMark';
import LogoLoader from '@/shared/components/LogoLoader';

// =====================
// Component
// =====================
const createWelcomeMessage = (): Message => ({
  id: '1',
  text: `**Welcome to Adiva AI!** 

I'm your advanced AI assistant, ready to help you with any task. Here's what I can do:

**Programming & Development**
- Write code in any language
- Debug and optimize
- Web development
- Data science

**Writing & Communication**
- Essays and reports
- Professional emails
- Creative content
- Technical documentation

**Analysis & Problem Solving**
- Data analysis
- Mathematical solutions
- Research assistance
- Business strategy

**Creative & Design**
- Brainstorming ideas
- Design concepts
- Marketing strategies
- Innovation

**Learning & Education**
- Step-by-step tutorials
- Concept explanations
- Study guides
- Skill development

**What would you like to work on today?** Just ask, and I'll provide comprehensive, helpful assistance!`,
  sender: 'AI',
  timestamp: new Date().toISOString(),
  isAI: true
});

const RESPONSE_HISTORY_STORAGE_KEY = 'chatAI_responseHistory';

type ResponseHistoryMap = Record<string, Record<string, string[]>>;
type ToolName = 'web_search' | 'calculator' | 'code_runner';
type ToolPermissions = Record<ToolName, boolean>;
const DEFAULT_TOOL_PERMISSIONS: ToolPermissions = {
  web_search: true,
  calculator: true,
  code_runner: true
};

function AIchat({
  showSettings,
  setShowSettings,
  showAnalytics,
  setShowAnalytics,
  onSidebarThemeChange,
  onThemeChange
}: AIchatProps) {
  const { isAuthenticated, token, user } = useAuth();
  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([createWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [defensiveMode, setDefensiveMode] = useState(false);
  const [personality, setPersonality] = useState<Personality>('friendly');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5-nano');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true); // Enable by default for testing
  const [interfaceLanguage, setInterfaceLanguage] = useState<string>('en-US');
  const [speechLanguage, setSpeechLanguage] = useState<string>('en-US');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('chatAI_theme') || 'ocean';
    } catch {
      return 'ocean';
    }
  });
  const [sidebarThemeEnabled, setSidebarThemeEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chatAI_sidebarTheme') === 'true';
    } catch {
      return false;
    }
  });
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [copyFallbackText, setCopyFallbackText] = useState<string>('');
  const [showCopyFallback, setShowCopyFallback] = useState(false);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [guestLimit, setGuestLimit] = useState<number | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteConfirmChatId, setDeleteConfirmChatId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState<string>('');
  const availableLanguages = AVAILABLE_LANGUAGES;
  const availableThemes = AVAILABLE_THEMES;
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [templateCategory, setTemplateCategory] = useState<string>('All');
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('General');
  const [newTemplatePrompt, setNewTemplatePrompt] = useState('');
  const [showToolActions, setShowToolActions] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolName>('web_search');
  const [toolDropdownOpen, setToolDropdownOpen] = useState(false);
  const [toolInput, setToolInput] = useState('');
  const [isRunningTool, setIsRunningTool] = useState(false);
  const [toolPermissions, setToolPermissions] = useState<ToolPermissions>(DEFAULT_TOOL_PERMISSIONS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const settingsLoadedRef = useRef(false);
  const settingsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userLastChatKey = user?.id ? `chatAI_lastChatId_${user.id}` : null;

  // Image processing
  const {
    selectedImage,
    imagePreview,
    isUploading: isUploadingImage,
    handleImageSelect,
    handleImageRemove,
    setUploading: setUploadingImage,
    reset: resetImage
  } = useImageProcessing();
  const lastImageRef = useRef<File | null>(null);

  // Image preview popup state
  const [showImagePopup, setShowImagePopup] = useState(false);

  // Close popup on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showImagePopup) {
        setShowImagePopup(false);
      }
    };

    if (showImagePopup) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showImagePopup]);

  // Analytics
  const [analytics, setAnalytics] = useState<Analytics>(() => ({
    totalMessages: 0,
    userMessages: 0,
    AIMessages: 0,
    popularTopics: {},
    sessionStart: new Date().toISOString(),
  }));

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatAIRef = useRef<HTMLDivElement>(null);
  const prevAuthRef = useRef<boolean>(isAuthenticated);
  const generationIdRef = useRef(0);
  const imageAbortRef = useRef<AbortController | null>(null);

  // =====================
  // Helpers: UI
  // =====================

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);
  const handleMessagesScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setShowScrollDown(!atBottom);
  };
  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatAIRef.current && !chatAIRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.classList.add('chatAI-open');
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.classList.remove('chatAI-open');
    };
  }, [isOpen]);

  const { isListening, isSpeaking, startVoiceInput, stopVoiceInput, toggleVoiceInput, speakText, stopSpeaking } = useSpeechControls({
    speechLanguage,
    setInputValue
  });

  // =====================
  // Analytics helpers
  // =====================
  const updateAnalytics = (message: string, sender: 'user' | 'AI') => {
    setAnalytics((prev) => {
      const next = { ...prev };
      next.totalMessages++;
      if (sender === 'user') {
        next.userMessages++;
        const topics = [
          'code', 'program', 'script', 'function', 'algorithm', 'debug', 'fix', 'optimize',
          'write', 'essay', 'article', 'story', 'email', 'letter', 'report', 'blog',
          'analyze', 'explain', 'compare', 'evaluate', 'review', 'assess', 'examine',
          'calculate', 'solve', 'equation', 'math', 'statistics', 'probability', 'formula',
          'create', 'design', 'imagine', 'brainstorm', 'idea', 'creative', 'art',
          'learn', 'teach', 'tutorial', 'guide', 'how to', 'step by step', 'explain',
          'research', 'study', 'investigate', 'explore', 'discover', 'understand'
        ];
        topics.forEach((topic) => {
          if (message.toLowerCase().includes(topic)) {
            next.popularTopics[topic] = (next.popularTopics[topic] || 0) + 1;
          }
        });
      } else next.AIMessages++;
      return next;
    });
  };

  const getPopularTopics = () => {
    if (analytics.topTopics && analytics.topTopics.length > 0) {
      return analytics.topTopics;
    }
    return Object.entries(analytics.popularTopics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ name: topic, value: count }));
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chatAI_promptTemplates');
      if (raw) {
        const parsed = JSON.parse(raw) as PromptTemplate[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTemplates(parsed);
          return;
        }
      }
    } catch {
      // ignore parse failures
    }
    setTemplates(DEFAULT_PROMPT_TEMPLATES);
  }, []);

  useEffect(() => {
    if (!templates.length) return;
    try {
      localStorage.setItem('chatAI_promptTemplates', JSON.stringify(templates));
    } catch {
      // ignore localStorage write errors
    }
  }, [templates]);

  const loadResponseHistory = (): ResponseHistoryMap => {
    try {
      const raw = localStorage.getItem(RESPONSE_HISTORY_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as ResponseHistoryMap;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const saveResponseHistory = (history: ResponseHistoryMap) => {
    try {
      localStorage.setItem(RESPONSE_HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore localStorage errors
    }
  };

  const mergeResponseVersions = (baseText: string, savedVersions: string[] | undefined) => {
    const merged: string[] = [];
    const addUnique = (value: string) => {
      const normalized = value.trim();
      if (!normalized) return;
      if (!merged.includes(normalized)) merged.push(normalized);
    };

    addUnique(baseText);
    (savedVersions || []).forEach(addUnique);

    if (merged.length === 0) {
      return [baseText];
    }
    return merged;
  };

  const normalizeBackendMessage = (msg: any, conversationKey: string, responseHistory: ResponseHistoryMap): Message => {
    const isAssistant = msg.role === 'assistant';
    const rawText = msg.content || '';
    const text = isAssistant ? extractPlainAnswer(rawText) : rawText;
    const messageId = msg._id ? String(msg._id) : `${msg.role}-${msg.timestamp || Date.now()}`;
    const savedVersions = isAssistant ? responseHistory?.[conversationKey]?.[messageId] : undefined;
    const responseVersions = isAssistant ? mergeResponseVersions(text, savedVersions) : undefined;
    const activeResponseIndex = isAssistant ? Math.max(0, (responseVersions?.length || 1) - 1) : undefined;
    const activeText = isAssistant && responseVersions
      ? responseVersions[activeResponseIndex || 0] || text
      : text;
    return {
      id: messageId,
      text: activeText,
      responseVersions,
      activeResponseIndex,
      sender: isAssistant ? 'AI' : 'user',
      timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
      isAI: isAssistant,
      imageUrl: msg.metadata?.imageUrl || undefined,
      liked: msg.metadata?.liked || false,
      disliked: msg.metadata?.disliked || false,
      isStreaming: false
    };
  };

  const normalizeBackendChat = (chat: any): ChatSession => {
    const conversationKey = chat.conversationId || String(chat._id);
    const responseHistory = loadResponseHistory();
    const messages: Message[] = Array.isArray(chat.messages)
      ? chat.messages.map((msg: any) => normalizeBackendMessage(msg, conversationKey, responseHistory))
      : [];
    const dedupedMessages: Message[] = messages.reduce((acc: Message[], current: Message) => {
      acc.push(current);
      if (acc.length < 4) return acc;

      const a = acc[acc.length - 4];
      const b = acc[acc.length - 3];
      const c = acc[acc.length - 2];
      const d = acc[acc.length - 1];

      const hasDuplicatePair =
        a.sender === 'user' &&
        b.sender === 'AI' &&
        c.sender === 'user' &&
        d.sender === 'AI' &&
        a.text.trim() === c.text.trim() &&
        b.text.trim() === d.text.trim();

      if (!hasDuplicatePair) return acc;

      const firstPairTime = new Date(b.timestamp).getTime();
      const secondPairTime = new Date(d.timestamp).getTime();
      const withinRegenerateWindow = Number.isFinite(firstPairTime) && Number.isFinite(secondPairTime)
        ? Math.abs(secondPairTime - firstPairTime) < 2 * 60 * 1000
        : true;

      if (withinRegenerateWindow) {
        acc.splice(acc.length - 2, 2);
      }
      return acc;
    }, []);

    return {
      id: chat.conversationId || String(chat._id),
      conversationId: chat.conversationId || String(chat._id),
      dbId: String(chat._id),
      title: chat.title || 'New Chat',
      messages: dedupedMessages,
      createdAt: chat.createdAt || new Date().toISOString(),
      lastModified: chat.updatedAt || chat.lastMessageAt || new Date().toISOString(),
      pinned: !!chat.pinned
    };
  };

  const buildAnalyticsFromChats = (chats: ChatSession[]) => {
    let totalMessages = 0;
    let userMessages = 0;
    let aiMessages = 0;
    const topics: { [key: string]: number } = {};
    let sessionStart = new Date().toISOString();

    if (chats.length > 0) {
      const earliest = chats.reduce((min, chat) => {
        const created = new Date(chat.createdAt).getTime();
        return created < min ? created : min;
      }, Date.now());
      sessionStart = new Date(earliest).toISOString();
    }

    const topicKeywords = [
      'code', 'program', 'script', 'function', 'algorithm', 'debug', 'fix', 'optimize',
      'write', 'essay', 'article', 'story', 'email', 'letter', 'report', 'blog',
      'analyze', 'explain', 'compare', 'evaluate', 'review', 'assess', 'examine',
      'calculate', 'solve', 'equation', 'math', 'statistics', 'probability', 'formula',
      'create', 'design', 'imagine', 'brainstorm', 'idea', 'creative', 'art',
      'learn', 'teach', 'tutorial', 'guide', 'how to', 'step by step', 'explain',
      'research', 'study', 'investigate', 'explore', 'discover', 'understand'
    ];

    chats.forEach(chat => {
      chat.messages.forEach(msg => {
        totalMessages++;
        if (msg.sender === 'user') {
          userMessages++;
          const text = msg.text.toLowerCase();
          topicKeywords.forEach(topic => {
            if (text.includes(topic)) {
              topics[topic] = (topics[topic] || 0) + 1;
            }
          });
        } else {
          aiMessages++;
        }
      });
    });

    return {
      totalMessages,
      userMessages,
      AIMessages: aiMessages,
      popularTopics: topics,
      sessionStart
    } as Analytics;
  };

  // Analytics tracking function
  const trackAnalytics = async (event: string, data?: any) => {
    try {
      await chatApi.trackAnalytics(event, data);
    } catch (error) {
      console.error('Failed to track analytics:', error);
    }
  };

  const {
    recentChats,
    setRecentChats,
    currentChatId,
    setCurrentChatId,
    getAuthToken,
    loadCachedChats,
    cacheChats,
    fetchUserChats,
    saveCurrentChat,
    startNewChat,
    loadChat,
    deleteChat,
    requestDeleteChat,
    renameChat,
    togglePinChat,
    updateMessageOnBackend
  } = useChatSession({
    isAuthenticated,
    token,
    isInitialized,
    messages,
    setMessages,
    setAnalytics,
    setInputValue,
    setIsTyping,
    setError,
    setRetryCount,
    setShowDeleteConfirm,
    setDeleteConfirmText,
    setDeleteConfirmChatId,
    setDeleteConfirmTitle,
    normalizeBackendChat,
    buildAnalyticsFromChats,
    createWelcomeMessage
  });

  const { generateResponse, generateResponseWithImage } = useAiResponse({
    selectedModel,
    currentChatId,
    personality,
    defensiveMode,
    setGuestLimit,
    setMessages,
    trackAnalytics
  });

  const fetchUserAnalytics = async (authToken: string) => {
    try {
      const response = await chatApi.fetchUserAnalytics(authToken);
      if (!response.ok) return;
      const data = await response.json();
      if (data?.analytics) {
        setUserAnalytics(data.analytics);
      }
      if (data?.analytics?.learningPatterns?.topicsDiscussed?.length) {
        const topics: { [key: string]: number } = {};
        data.analytics.learningPatterns.topicsDiscussed.forEach((t: any) => {
          if (t.topic) topics[t.topic] = t.frequency || 0;
        });
        setAnalytics(prev => ({
          ...prev,
          popularTopics: topics
        }));
      }
      if (data?.analytics?.learningPatterns?.topicsDiscussed?.length) {
        const sorted = [...data.analytics.learningPatterns.topicsDiscussed]
          .filter((t: any) => t.topic)
          .sort((a: any, b: any) => (b.frequency || 0) - (a.frequency || 0))
          .slice(0, 5)
          .map((t: any) => ({ name: t.topic, value: t.frequency || 0 }));
        setAnalytics(prev => ({
          ...prev,
          topTopics: sorted
        }));
      }
    } catch (error) {
      console.error('Failed to load user analytics:', error);
    }
  };

  const fetchUserSettings = async (authToken: string) => {
    if (settingsLoadedRef.current) return;
    try {
      const response = await chatApi.fetchUserSettings(authToken);
      if (!response.ok) return;
      const data = await response.json();
      const settings = data?.settings;
      if (!settings) return;

      if (settings.aiSettings?.defaultModel) setSelectedModel(settings.aiSettings.defaultModel);
      if (settings.aiSettings?.personality) setPersonality(settings.aiSettings.personality);
      if (typeof settings.aiSettings?.defensiveMode === 'boolean') setDefensiveMode(settings.aiSettings.defensiveMode);
      if (typeof settings.notifications?.speechEnabled === 'boolean') setSpeechEnabled(settings.notifications.speechEnabled);
      if (settings.appearance?.theme) setSelectedTheme(settings.appearance.theme);
      if (typeof settings.appearance?.sidebarThemeEnabled === 'boolean') setSidebarThemeEnabled(settings.appearance.sidebarThemeEnabled);
      if (settings.appearance?.language) setInterfaceLanguage(settings.appearance.language);
      if (settings.appearance?.speechLanguage) setSpeechLanguage(settings.appearance.speechLanguage);
      if (settings.advanced?.toolPermissions) {
        setToolPermissions({
          ...DEFAULT_TOOL_PERMISSIONS,
          ...settings.advanced.toolPermissions
        });
      }

      settingsLoadedRef.current = true;
    } catch (error) {
      console.error('Failed to load user settings:', error);
      settingsLoadedRef.current = true;
    }
  };

  const saveUserSettings = async (authToken: string) => {
    try {
      await chatApi.saveUserSettings(authToken, {
        aiSettings: {
          defaultModel: selectedModel,
          personality,
          defensiveMode
        },
        notifications: {
          speechEnabled
        },
        appearance: {
          theme: selectedTheme,
          sidebarThemeEnabled,
          language: interfaceLanguage,
          speechLanguage
        },
        advanced: {
          toolPermissions
        }
      });
    } catch (error) {
      console.error('Failed to save user settings:', error);
    }
  };

  // Load available AI models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await chatApi.fetchAiModels();
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data.models || []);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };
    loadModels();
  }, []);

  // Load user data from backend (chats, analytics, settings)
  useEffect(() => {
    const authToken = getAuthToken();
    if (authToken && isAuthenticated) {
      loadCachedChats();
      setIsSyncing(true);
      const preferredChatId = (() => {
        try {
          if (userLastChatKey) {
            return localStorage.getItem(userLastChatKey) || localStorage.getItem('chatAI_lastChatId') || undefined;
          }
          return localStorage.getItem('chatAI_lastChatId') || undefined;
        } catch {
          return undefined;
        }
      })();
      Promise.allSettled([
        fetchUserSettings(authToken),
        fetchUserChats(authToken, preferredChatId),
        fetchUserAnalytics(authToken)
      ]).finally(() => {
        setIsSyncing(false);
      });
    } else {
      loadCachedChats();
      setIsSyncing(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !userLastChatKey) return;
    try {
      localStorage.setItem(userLastChatKey, currentChatId);
    } catch {
      // ignore localStorage write errors
    }
  }, [currentChatId, isAuthenticated, userLastChatKey]);

  // Detect user's preferred language from browser
  useEffect(() => {
    const userLanguage = navigator.language || 'en-US';
    const detectedLanguage = availableLanguages.find(lang =>
      lang.code === userLanguage ||
      lang.code.startsWith(userLanguage.split('-')[0])
    );
    if (detectedLanguage) {
      setInterfaceLanguage(prev => prev || detectedLanguage.code);
      setSpeechLanguage(prev => prev || detectedLanguage.code);
    }
  }, [availableLanguages]);

  // Backend analytics are stored per-user; UI uses user analytics now.

  // Save recent chats cache for quick load/offline
  useEffect(() => {
    cacheChats(recentChats);
  }, [recentChats]);

  // Sync settings to backend (debounced)
  useEffect(() => {
    if (!isAuthenticated) return;
    const authToken = getAuthToken();
    if (!authToken) return;
    if (!settingsLoadedRef.current) return;

    if (settingsSyncTimeoutRef.current) {
      clearTimeout(settingsSyncTimeoutRef.current);
    }
    settingsSyncTimeoutRef.current = setTimeout(() => {
      saveUserSettings(authToken);
    }, 600);

    return () => {
      if (settingsSyncTimeoutRef.current) {
        clearTimeout(settingsSyncTimeoutRef.current);
      }
    };
  }, [
    isAuthenticated,
    token,
    selectedModel,
    personality,
    defensiveMode,
    speechEnabled,
    selectedTheme,
    sidebarThemeEnabled,
    interfaceLanguage,
    speechLanguage,
    toolPermissions.web_search,
    toolPermissions.calculator,
    toolPermissions.code_runner,
  ]);

  // Set initialization flag after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1000); // Wait 1 second after mount

    return () => clearTimeout(timer);
  }, []);

  // Apply theme changes
  useEffect(() => {
    const currentTheme = availableThemes.find(t => t.id === selectedTheme);
    if (!currentTheme) return;

    // Remove all existing theme classes
    document.body.classList.remove('theme-ocean', 'theme-indigo', 'theme-blue', 'theme-green', 'theme-purple', 'theme-orange', 'theme-teal', 'theme-red', 'theme-yellow');

    // Add current theme class
    document.body.classList.add(`theme-${selectedTheme}`);

    // Apply theme colors to CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--ai-primary', currentTheme.primaryColor);
    root.style.setProperty('--ai-secondary', currentTheme.secondaryColor);
    root.style.setProperty('--ai-accent', currentTheme.accentColor);

    // Save theme preference to localStorage
    try {
      localStorage.setItem('chatAI_theme', selectedTheme);
    } catch { }

    // Notify parent component about theme change
    if (onThemeChange) {
      onThemeChange(selectedTheme);
    }
  }, [selectedTheme, availableThemes, onThemeChange]);

  // Load theme preference from localStorage on component mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('chatAI_theme');
      if (savedTheme && availableThemes.some(t => t.id === savedTheme)) {
        setSelectedTheme(savedTheme);
      }

      const savedSidebarTheme = localStorage.getItem('chatAI_sidebarTheme');
      if (savedSidebarTheme !== null) {
        setSidebarThemeEnabled(savedSidebarTheme === 'true');
      }

      const savedInterfaceLanguage = localStorage.getItem('chatAI_interfaceLanguage');
      if (savedInterfaceLanguage && availableLanguages.some(l => l.code === savedInterfaceLanguage)) {
        setInterfaceLanguage(savedInterfaceLanguage);
      }

      const savedSpeechLanguage = localStorage.getItem('chatAI_speechLanguage');
      if (savedSpeechLanguage && availableLanguages.some(l => l.code === savedSpeechLanguage)) {
        setSpeechLanguage(savedSpeechLanguage);
      }
    } catch { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('chatAI_interfaceLanguage', interfaceLanguage);
    } catch { }
  }, [interfaceLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem('chatAI_speechLanguage', speechLanguage);
    } catch { }
  }, [speechLanguage]);

  useEffect(() => {
    if (toolPermissions[selectedTool]) return;
    const firstEnabled = (Object.keys(toolPermissions) as ToolName[]).find((name) => toolPermissions[name]);
    if (firstEnabled) {
      setSelectedTool(firstEnabled);
    }
  }, [selectedTool, toolPermissions]);

  // Auto-save current conversation
  useEffect(() => {
    if (isAuthenticated) return;
    const autoSave = () => {
      if (isInitialized && messages.length > 1) {
        saveCurrentChat();
      }
    };

    // Auto-save every 30 seconds
    const interval = setInterval(autoSave, 30000);
    
    // Auto-save when component unmounts
    return () => {
      clearInterval(interval);
      autoSave();
    };
  }, [isInitialized, messages, currentChatId, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && guestLimit !== null) {
      setGuestLimit(null);
    }
  }, [isAuthenticated, guestLimit]);

  useEffect(() => {
    if (!prevAuthRef.current && isAuthenticated) {
      startNewChat();
      setGuestLimit(null);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Save sidebar theme preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('chatAI_sidebarTheme', sidebarThemeEnabled.toString());
    } catch { }

    // Notify parent component about sidebar theme change
    if (onSidebarThemeChange) {
      onSidebarThemeChange(sidebarThemeEnabled);
    }
  }, [sidebarThemeEnabled, onSidebarThemeChange]);

  // Get current theme colors
  const getCurrentTheme = () => {
    return availableThemes.find(t => t.id === selectedTheme) || availableThemes[0];
  };

  const deleteConfirmNormalized = deleteConfirmText.trim();
  const canConfirmDelete =
    deleteConfirmNormalized === 'DELETE' ||
    (!!deleteConfirmTitle && deleteConfirmNormalized === deleteConfirmTitle);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Ignore clicks used to interact with/close the mobile sidebar.
      const isSidebarInteraction =
        !!target.closest('.sidebar-shell') ||
        !!target.closest('[data-sidebar-overlay="true"]');
      if (isSidebarInteraction) {
        return;
      }

      // Check if click is on sidebar settings/analytics buttons - if so, don't close panels
      const isAnalyticsButton = target.closest('[data-analytics-toggle="true"]');
      const isSettingsButton = target.closest('[data-settings-toggle="true"]');
      if (isAnalyticsButton || isSettingsButton) {
        return;
      }

      if (showSettings && !target.closest('.settings-panel') && !isSettingsButton) {
        setShowSettings(false);
      }
      if (showAnalytics && !target.closest('.analytics-panel') && !isAnalyticsButton) {
        setShowAnalytics(false);
      }
      
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings, showAnalytics]);

  // =====================
  // Messaging logic
  // =====================
  const getChatTitleFromMessages = (list: Message[]) => {
    const firstUserMessage = list.find((m) => m.sender === 'user');
    if (!firstUserMessage) return 'New Chat';
    const text = firstUserMessage.text.trim();
    return text.length > 50 ? `${text.substring(0, 50)}...` : text;
  };

  const insertTemplatePrompt = (promptText: string) => {
    setInputValue((prev) => (prev ? `${prev}\n\n${promptText}` : promptText));
    setShowTemplateLibrary(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const createTemplate = () => {
    const title = newTemplateTitle.trim();
    const category = newTemplateCategory.trim() || 'General';
    const prompt = newTemplatePrompt.trim();
    if (!title || !prompt) return;

    const next: PromptTemplate = {
      id: `custom-${Date.now()}`,
      title,
      category,
      prompt,
      builtIn: false
    };
    setTemplates((prev) => [next, ...prev]);
    setNewTemplateTitle('');
    setNewTemplateCategory('General');
    setNewTemplatePrompt('');
  };

  const deleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId || t.builtIn));
  };

  const executeToolAction = async () => {
    stopSpeaking();
    const trimmed = toolInput.trim();
    if (!trimmed) return;
    if (!toolPermissions[selectedTool]) {
      setMessages((prev) => [
        ...prev,
        {
          id: `tool-permission-${Date.now()}`,
          text: `Tool "${selectedTool}" is disabled in your settings.`,
          sender: 'AI',
          timestamp: new Date().toISOString(),
          isAI: true
        }
      ]);
      return;
    }

    const approved = window.confirm(`Allow tool "${selectedTool}" to run with your input?`);
    if (!approved) return;

    setIsRunningTool(true);
    try {
      const tokenFromStorage = localStorage.getItem('token');
      const response = await chatApi.executeTool(tokenFromStorage, {
        tool: selectedTool,
        input: trimmed,
        approved: true
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Tool execution failed');
      }

      const toolOutput = typeof data.output === 'string' ? data.output : JSON.stringify(data.output, null, 2);
      const sourceLine = data.source ? `\n\nSource: ${data.source}` : '';
      const composed = `Tool: ${selectedTool}\n\n${toolOutput}${sourceLine}`;

      const userMessage: Message = {
        id: `tool-user-${Date.now()}`,
        text: `Run tool "${selectedTool}" with: ${trimmed}`,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      const aiMessage: Message = {
        id: `tool-ai-${Date.now() + 1}`,
        text: composed,
        sender: 'AI',
        timestamp: new Date().toISOString(),
        isAI: true
      };

      setMessages((prev) => [...prev, userMessage, aiMessage]);
      updateAnalytics(userMessage.text, 'user');
      updateAnalytics(aiMessage.text, 'AI');
      setShowToolActions(false);
      setToolInput('');
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Tool execution failed';
      setMessages((prev) => [
        ...prev,
        {
          id: `tool-error-${Date.now()}`,
          text: `Tool error: ${errorText}`,
          sender: 'AI',
          timestamp: new Date().toISOString(),
          isAI: true
        }
      ]);
    } finally {
      setIsRunningTool(false);
    }
  };

  const shouldReuseLastImage = (text: string) => {
    const t = text.toLowerCase();
    const triggers = [
      'image', 'photo', 'picture', 'this', 'that', 'above', 'previous', 'earlier', 'again', 'same'
    ];
    return triggers.some((w) => t.includes(w));
  };

  const truncateLine = (value: string, max = 160) => {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max)}...`;
  };

  const buildCurrentChatContext = (chatMessages: Message[]) => {
    const recent = chatMessages.slice(-20);
    if (!recent.length) return '';
    const lines = recent.map((msg) => {
      const role = msg.sender === 'user' ? 'User' : 'Assistant';
      return `${role}: ${truncateLine(msg.text || '')}`;
    });
    return `Current chat summary:\n${lines.join('\n')}`;
  };

  const buildGlobalMemory = () => {
    const otherChats = recentChats
      .filter((c) => c.id !== currentChatId && c.conversationId !== currentChatId)
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 6);

    if (!otherChats.length) return '';
    const blocks = otherChats.map((chat) => {
      const lastUser = [...chat.messages].reverse().find((m) => m.sender === 'user');
      const lastAI = [...chat.messages].reverse().find((m) => m.sender === 'AI');
      const userLine = lastUser ? `User asked: ${truncateLine(lastUser.text || '', 240)}` : 'User asked: (none)';
      const aiLine = lastAI ? `Assistant replied: ${truncateLine(lastAI.text || '', 240)}` : 'Assistant replied: (none)';
      return `Chat "${truncateLine(chat.title || 'Untitled', 80)}":\n${userLine}\n${aiLine}`;
    });
    return `Global memory (recent chats):\n${blocks.join('\n\n')}`;
  };

  const stopGeneration = () => {
    generationIdRef.current += 1;
    if (imageAbortRef.current) {
      imageAbortRef.current.abort();
      imageAbortRef.current = null;
      setUploadingImage(false);
    }
    setIsTyping(false);
    setRegeneratingMessageId(null);
    setMessages((prev) => {
      const next = [...prev];
      const lastMessage = next[next.length - 1];
      if (lastMessage && lastMessage.sender === 'AI' && lastMessage.isStreaming) {
        lastMessage.isStreaming = false;
      }
      return next;
    });
  };

  const handleSendMessage = async () => {
    stopSpeaking();
    if (!inputValue.trim() && !selectedImage && !lastImageRef.current) return;
    const generationId = (generationIdRef.current += 1);
    const reuseLastImage = !selectedImage && !!lastImageRef.current && shouldReuseLastImage(inputValue);
    const effectiveImage = selectedImage || (reuseLastImage ? lastImageRef.current : null);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toISOString(),
      imageUrl: selectedImage ? imagePreview || undefined : undefined,
    };

    // Create new messages array with the user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    updateAnalytics(inputValue, 'user');
    setInputValue('');
    setIsTyping(true);

    const currentContextNote = buildCurrentChatContext(updatedMessages);
    const globalMemoryNote = buildGlobalMemory();
    const imageContextNote = lastImageRef.current ? 'User previously uploaded an image in this chat.' : '';
    const memoryNote = [currentContextNote, globalMemoryNote, imageContextNote].filter(Boolean).join('\n\n');

    // Save chat immediately with the updated messages
    if (isInitialized && !isAuthenticated) {
      const chatTitle = getChatTitleFromMessages(updatedMessages);
      const chatSession: ChatSession = {
        id: currentChatId,
        title: chatTitle,
        messages: updatedMessages,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };

      setRecentChats(prev => {
        const existingIndex = prev.findIndex(chat => chat.id === currentChatId);
        if (existingIndex >= 0) {
          // Update existing chat
          const updated = [...prev];
          updated[existingIndex] = chatSession;
          return updated;
        } else {
          // Add new chat
          return [chatSession, ...prev].slice(0, 10); // Keep only 10 recent chats
        }
      });
    }

    let responseText = '';
    let responseMeta = {};
    let responseConversationId: string | undefined;

    // Create initial AI message with "AI is thinking..." text
    const AIMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: 'Thinking',
      sender: 'AI',
      timestamp: new Date().toISOString(),
      isAI: true,
      isStreaming: true,
      meta: {
        defenseQuality: 'medium' as const,
        hallucinationRisk: 'low' as const,
        tone: personality,
        taskType: 'general'
      },
    };

    // Add the streaming message immediately
    setMessages((prev) => [...prev, AIMessage]);

    // Handle image + text or image only
    if (effectiveImage) {
      console.log('🔄 Starting image processing...');
      setUploadingImage(true);
      const abortController = new AbortController();
      imageAbortRef.current = abortController;
      if (selectedImage) {
        lastImageRef.current = selectedImage;
      }

      // Add a small delay to ensure the loader shows
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const response = await generateResponseWithImage(
          inputValue || 'What do you see in this image?',
          effectiveImage,
          { signal: abortController.signal, memoryNote }
        );
        if (generationId !== generationIdRef.current) return;
        responseText = response.text;
        responseMeta = response.meta;
        responseConversationId = response.conversationId;
        console.log('✅ Image processing completed successfully');

        // Update the streaming message with the complete response
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.sender === 'AI' && lastMessage.isStreaming) {
            lastMessage.text = responseText;
            lastMessage.meta = responseMeta;
            lastMessage.isStreaming = false;
          }
          return newMessages;
        });

        if (response.conversationId && response.conversationId !== currentChatId) {
          setCurrentChatId(response.conversationId);
        }
      } catch (error) {
        const isAbort = (error as { name?: string } | null)?.name === 'AbortError';
        if (isAbort) return;
        console.error('❌ Error processing image:', error);
        responseText = 'Sorry, I encountered an error while processing the image. Please try again.';
        responseMeta = {
          defenseQuality: 'low' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: 'image_analysis'
        };

        // Update the streaming message with error
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.sender === 'AI' && lastMessage.isStreaming) {
            lastMessage.text = responseText;
            lastMessage.meta = responseMeta;
            lastMessage.isStreaming = false;
          }
          return newMessages;
        });
      } finally {
        console.log('🔄 Finishing image processing...');
        setUploadingImage(false);
        if (imageAbortRef.current === abortController) {
          imageAbortRef.current = null;
        }
        if (!abortController.signal.aborted && generationId === generationIdRef.current && selectedImage) {
          resetImage(); // Clear the image after processing
        }
      }
    } else {
      // Handle text only with streaming
      try {
        console.log('🔄 Starting text response generation...');
        const { text, meta } = await generateResponse(userMessage.text, { memoryNote, contextNote: currentContextNote });
        if (generationId !== generationIdRef.current) return;
        console.log('✅ Generated response text length:', text ? text.length : 0);
        console.log('✅ Generated response preview:', text ? text.substring(0, 200) + '...' : 'EMPTY');

        responseText = extractPlainAnswer(text as string);
        responseMeta = meta;

        console.log('🔄 Updating message with response...');
        // Final update to mark streaming as complete
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.sender === 'AI' && lastMessage.isStreaming) {
            console.log('📝 Updating last message with text:', responseText.substring(0, 100) + '...');
            lastMessage.text = responseText;
            lastMessage.meta = responseMeta;
            lastMessage.isStreaming = false;
            console.log('✅ Message updated - isStreaming set to false');
          } else {
            console.warn('⚠️ Could not find streaming AI message to update');
          }
          return newMessages;
        });
        console.log('✅ Message updated successfully');
      } catch (error) {
        console.error('❌ Error generating response:', error);
        responseText = 'Sorry, I encountered an error while generating the response. Please try again.';
        responseMeta = {
          defenseQuality: 'low' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: 'general'
        };

        // Update the streaming message with error
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.sender === 'AI' && lastMessage.isStreaming) {
            lastMessage.text = responseText;
            lastMessage.meta = responseMeta;
            lastMessage.isStreaming = false;
          }
          return newMessages;
        });
      }
    }

    if (generationId === generationIdRef.current) {
      updateAnalytics(responseText, 'AI');
      setIsTyping(false);
    }

    const authToken = getAuthToken();
    if (authToken && isAuthenticated && generationId === generationIdRef.current) {
      fetchUserChats(authToken, responseConversationId || currentChatId);
      fetchUserAnalytics(authToken);
    }

    // Per-user analytics are updated server-side on message creation.

    // Speech is now controlled by user via speak button
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageRemoveWithMemory = () => {
    lastImageRef.current = null;
    handleImageRemove();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        startNewChat();
      }

      // Escape to close panels
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowAnalytics(false);
        setShowModelSelector(false);
        setShowLanguageSelector(false);

        // Cancel editing
        if (editingMessage) {
          cancelEdit();
        }
      }

      // Ctrl/Cmd + / for settings
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowSettings(true);
      }

      // Ctrl/Cmd + ? for shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingMessage]);

  // Auto-resize textarea
  const autoResizeTextarea = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200; // max-h-[200px]
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  };

  // Auto-resize when input value changes
  useEffect(() => {
    autoResizeTextarea();
  }, [inputValue]);
  const downloadSpecificChat = (chatId: string) => {
    const chat = recentChats.find(c => c.id === chatId);
    if (!chat) return;

    const text = chat.messages
      .map((m) => {
        const time = new Date(m.timestamp).toLocaleString();
        const who = m.sender === "AI" ? "AI Assistant" : "You";
        return `[${time}] ${who}:\n${m.text}\n`;
      })
      .join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${chat.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useSidebarChats({
    recentChats,
    currentChatId,
    startNewChat,
    loadChat,
    requestDeleteChat,
    renameChat,
    togglePinChat,
    downloadSpecificChat
  });

  const exportAllChats = () => {
    const authToken = getAuthToken();
    if (isAuthenticated && authToken) {
      chatApi.exportUserData(authToken)
        .then(res => res.ok ? res.json() : null)
        .then((data) => {
          if (!data) return;
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `adiva-ai-chats-export-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        })
        .catch((error) => {
          console.error('Failed to export chats:', error);
        });
      return;
    }

    const allChats = recentChats.map(chat => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      lastModified: chat.lastModified,
      messageCount: chat.messages.length,
      messages: chat.messages
    }));

    const data = {
      exportDate: new Date().toISOString(),
      totalChats: allChats.length,
      chats: allChats
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adiva-ai-chats-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importChats = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const authToken = getAuthToken();
        if (isAuthenticated && authToken) {
          chatApi.importUserChats(authToken, {
            chats: data.chats || [],
            settings: data.settings || null
          })
            .then(res => res.ok ? res.json() : null)
            .then(() => {
              fetchUserChats(authToken);
              fetchUserSettings(authToken);
            })
            .catch((error) => console.error('Failed to import chats:', error));
          return;
        }

        if (data.chats && Array.isArray(data.chats)) {
          setRecentChats(data.chats);
          console.log(`Imported ${data.chats.length} chats`);
        }
      } catch (error) {
        console.error('Failed to import chats:', error);
        alert('Failed to import chats. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };
  const copyText = async (text: string) => {
    const textToCopy = String(text ?? '');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        console.log('Message copied to clipboard');
        return;
      }
      throw new Error('Clipboard API unavailable');
    } catch (error) {
      console.error('Failed to copy message:', error);
      setCopyFallbackText(textToCopy);
      setShowCopyFallback(true);
    }
  };

  const extractTextFromNode = (node: React.ReactNode): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractTextFromNode).join('');
    if (React.isValidElement(node)) return extractTextFromNode(node.props?.children);
    return '';
  };

  const getActiveMessageText = (message: Message): string => {
    if (message.sender !== 'AI' || !Array.isArray(message.responseVersions) || message.responseVersions.length === 0) {
      return message.text;
    }

    const fallbackIndex = message.responseVersions.length - 1;
    const index = typeof message.activeResponseIndex === 'number' ? message.activeResponseIndex : fallbackIndex;
    const safeIndex = Math.max(0, Math.min(index, message.responseVersions.length - 1));
    return message.responseVersions[safeIndex] || message.text;
  };

  const persistResponseVersion = (conversationKey: string, messageId: string, text: string, previousVersions?: string[]) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    const history = loadResponseHistory();
    const chatHistory = history[conversationKey] || {};
    const merged: string[] = [];

    const addUnique = (value: string) => {
      const normalized = value.trim();
      if (!normalized) return;
      if (!merged.includes(normalized)) merged.push(normalized);
    };

    (chatHistory[messageId] || []).forEach(addUnique);
    (previousVersions || []).forEach(addUnique);
    addUnique(normalizedText);

    history[conversationKey] = {
      ...chatHistory,
      [messageId]: merged.slice(-12)
    };
    saveResponseHistory(history);
  };

  const copyMessageById = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    setCopiedMessageId(messageId);
    await copyText(getActiveMessageText(message));
    setTimeout(() => {
      setCopiedMessageId(prev => (prev === messageId ? null : prev));
    }, 1500);
  };

  const copyCodeBlock = async (codeText: string) => {
    const key = codeText;
    setCopiedCodeKey(key);
    await copyText(codeText);
    setTimeout(() => {
      setCopiedCodeKey(prev => (prev === key ? null : prev));
    }, 1500);
  };

  const editMessage = (messageId: string, text: string) => {
    setEditingMessage(messageId);
    setEditText(text);
  };

  const saveEditedMessage = () => {
    if (editingMessage && editText.trim()) {
      const nextText = editText.trim();
      setMessages(prev => prev.map(msg =>
        msg.id === editingMessage
          ? { ...msg, text: nextText }
          : msg
      ));
      updateMessageOnBackend(editingMessage, nextText);
      setEditingMessage(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const toggleExpandMessage = (messageId: string) => {
    setExpandedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const regenerateMessage = async (messageId: string) => {
    const generationId = (generationIdRef.current += 1);
    stopSpeaking();
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.sender !== 'AI') return;

    // Find the user message that prompted this AI response
    const userMessageIndex = messageIndex - 1;
    const userMessage = messages[userMessageIndex];

    if (!userMessage || userMessage.sender !== 'user') return;

    setRegeneratingMessageId(messageId);
    setIsTyping(true);
    const currentContextNote = buildCurrentChatContext(messages);
    const globalMemoryNote = buildGlobalMemory();
    const imageContextNote = lastImageRef.current ? 'User previously uploaded an image in this chat.' : '';
    const memoryNote = [currentContextNote, globalMemoryNote, imageContextNote].filter(Boolean).join('\n\n');

    // Keep existing response visible while new regeneration is in progress
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, isStreaming: true }
        : m
    ));

    try {
      const { text, meta } = await generateResponse(userMessage.text, {
        regenerate: true,
        memoryNote,
        contextNote: currentContextNote
      });
      if (generationId !== generationIdRef.current) return;
      const nextText = extractPlainAnswer(text as string);
      const existingVersions = Array.isArray(message.responseVersions) ? message.responseVersions : [message.text];
      persistResponseVersion(currentChatId, messageId, nextText, existingVersions);

      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? {
              ...m,
              text: nextText,
              responseVersions: (() => {
                const base = Array.isArray(m.responseVersions) && m.responseVersions.length
                  ? [...m.responseVersions]
                  : [m.text];
                return [...base, nextText];
              })(),
              activeResponseIndex: (() => {
                const baseLength = Array.isArray(m.responseVersions) && m.responseVersions.length
                  ? m.responseVersions.length
                  : 1;
                return baseLength;
              })(),
              meta: meta,
              isStreaming: false
            }
          : m
      ));
      const safeText = nextText.trim();
      if (safeText) {
        updateMessageOnBackend(messageId, safeText);
      }
      if (generationId === generationIdRef.current) {
        updateAnalytics(text as string, 'AI');
      }
    } catch (error) {
      console.error('Failed to regenerate message:', error);
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? {
              ...m,
              text: 'Sorry, I encountered an error while regenerating the response.',
              isStreaming: false
            }
          : m
      ));
    } finally {
      setIsTyping(false);
      setRegeneratingMessageId(null);
    }
  };

  const likeMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      const nextLiked = !msg.liked;
      return { ...msg, liked: nextLiked, disliked: nextLiked ? false : msg.disliked };
    }));
    trackAnalytics('message_liked', { messageId });
  };

  const dislikeMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      const nextDisliked = !msg.disliked;
      return { ...msg, disliked: nextDisliked, liked: nextDisliked ? false : msg.liked };
    }));
    trackAnalytics('message_disliked', { messageId });
  };

  const showPreviousResponse = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId || msg.sender !== 'AI' || !Array.isArray(msg.responseVersions) || msg.responseVersions.length < 2) {
        return msg;
      }
      const current = typeof msg.activeResponseIndex === 'number' ? msg.activeResponseIndex : msg.responseVersions.length - 1;
      const nextIndex = Math.max(0, current - 1);
      return {
        ...msg,
        activeResponseIndex: nextIndex,
        text: msg.responseVersions[nextIndex] || msg.text
      };
    }));
  };

  const showNextResponse = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId || msg.sender !== 'AI' || !Array.isArray(msg.responseVersions) || msg.responseVersions.length < 2) {
        return msg;
      }
      const current = typeof msg.activeResponseIndex === 'number' ? msg.activeResponseIndex : msg.responseVersions.length - 1;
      const nextIndex = Math.min(msg.responseVersions.length - 1, current + 1);
      return {
        ...msg,
        activeResponseIndex: nextIndex,
        text: msg.responseVersions[nextIndex] || msg.text
      };
    }));
  };

  // =====================
  // Render
  // =====================
  const templateCategories = ['All', ...Array.from(new Set(templates.map((t) => t.category)))];
  const visibleTemplates = templateCategory === 'All'
    ? templates
    : templates.filter((t) => t.category === templateCategory);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const toolOptions: Array<{ key: ToolName; label: string }> = [
    { key: 'web_search', label: 'Web Search' },
    { key: 'calculator', label: 'Calculator' },
    { key: 'code_runner', label: 'Code Runner' }
  ];
  const selectedToolLabel = toolOptions.find((item) => item.key === selectedTool)?.label || selectedTool;
  const enabledTools = (Object.keys(toolPermissions) as ToolName[]).filter((key) => toolPermissions[key]);
  const noToolEnabled = enabledTools.length === 0;

  return (
    <TooltipProvider>
      {/* Full Screen Chat Interface */}
      <div className="h-full flex flex-col relative">
        {/* Chat Header */}
        <div className="p-4 sm:p-6 hidden lg:block">
          <div className="chat-header-neo">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/15 ai-glow"
              >
                <LogoMark className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                {/* <h2 className="text-xl sm:text-2xl font-bold text-white">Adiva AI</h2> */}
                <h2 className="text-blue-200 text-xs sm:text-sm">Ready to assist with any task</h2>
              </div>
            </div>
          </div>
        </div>
        {isSyncing && (
          <div className="px-4 sm:px-6 -mt-2 mb-2 flex justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-blue-100 backdrop-blur-md">
              <LogoLoader sizeClassName="h-3.5 w-3.5" />
              <span>Syncing…</span>
            </div>
          </div>
        )}

        {/* Model Selector Dropdown */}
        {showModelSelector && (
          <div className="fixed sm:absolute top-20 inset-x-3 sm:inset-x-auto sm:right-6 z-50 glass-dark border border-white/20 rounded-2xl shadow-2xl p-4 sm:p-6 sm:min-w-80 max-h-[70vh] overflow-y-auto">
            <h3 className="font-bold text-white text-lg mb-4">Select AI Model</h3>
            <div className="space-y-3">
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelSelector(false);
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${selectedModel === model.id
                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-200'
                    : 'hover:bg-white/10 text-white border border-transparent hover:border-white/20'
                    }`}
                >
                  <div className="font-semibold text-base">{model.name}</div>
                  <div className="text-sm text-blue-300 mt-1">{model.description}</div>
                  <div className="text-xs text-blue-400 mt-2">
                    Cost: ${model.costPer1kTokens}/1k tokens
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModelSelector(false)}
              className="mt-4 w-full text-sm text-blue-300 hover:text-white text-center py-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        )}

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          personality={personality}
          setPersonality={setPersonality}
          selectedTheme={selectedTheme}
          setSelectedTheme={setSelectedTheme}
          sidebarThemeEnabled={sidebarThemeEnabled}
          setSidebarThemeEnabled={setSidebarThemeEnabled}
          interfaceLanguage={interfaceLanguage}
          setInterfaceLanguage={setInterfaceLanguage}
          speechLanguage={speechLanguage}
          setSpeechLanguage={setSpeechLanguage}
          speechEnabled={speechEnabled}
          setSpeechEnabled={setSpeechEnabled}
          defensiveMode={defensiveMode}
          setDefensiveMode={setDefensiveMode}
          availableModels={availableModels}
          availableThemes={availableThemes}
          availableLanguages={availableLanguages}
          getCurrentTheme={getCurrentTheme}
          toolPermissions={toolPermissions}
          setToolPermissions={setToolPermissions}
        />


        {/* Keyboard Shortcuts Help */}
        {showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-dark border border-white/20 rounded-2xl shadow-2xl p-4 sm:p-6 w-[calc(100vw-1.5rem)] max-w-lg">
              <h3 className="font-bold text-white text-lg mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">New Chat</span>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white">Ctrl+K</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">Settings</span>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white">Ctrl+/</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">Send Message</span>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white">Enter</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">New Line</span>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white">Shift+Enter</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">Close Panels</span>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white">Escape</kbd>
                </div>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="mt-4 w-full text-sm text-blue-300 hover:text-white text-center py-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Language Selector Dropdown */}
        {showLanguageSelector && (
          <div className="fixed sm:absolute top-20 inset-x-3 sm:inset-x-auto sm:right-6 z-50 glass-dark border border-white/20 rounded-2xl shadow-2xl p-4 sm:p-6 sm:min-w-80 max-h-[70vh] overflow-y-auto">
            <h3 className="font-bold text-white text-lg mb-4">Select Speech Language</h3>
            <div className="space-y-3">
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    setSpeechLanguage(language.code);
                    setShowLanguageSelector(false);
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${speechLanguage === language.code
                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-200'
                    : 'hover:bg-white/10 text-white border border-transparent hover:border-white/20'
                    }`}
                >
                  <div className="font-semibold text-base">{language.name}</div>
                  <div className="text-sm text-blue-300 mt-1">Language code: {language.code}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLanguageSelector(false)}
              className="mt-4 w-full text-sm text-blue-300 hover:text-white text-center py-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        )}

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          {showAnalytics ? (
            <div className="fixed inset-0 lg:absolute lg:inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
              <div
                className="analytics-panel w-[calc(100vw-0.75rem)] sm:w-full max-w-5xl max-h-[94vh] sm:max-h-[90vh] overflow-y-auto glass-dark border border-white/20 rounded-2xl shadow-2xl p-3 sm:p-6 my-2 sm:my-4"
                style={{
                  background: `radial-gradient(1200px 600px at 20% -10%, ${getCurrentTheme().primaryColor}20, transparent), radial-gradient(900px 500px at 90% 10%, ${getCurrentTheme().secondaryColor}20, transparent)`
                }}
              >
                <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(120deg, ${getCurrentTheme().primaryColor}55, ${getCurrentTheme().secondaryColor}35, ${getCurrentTheme().accentColor}25)`
                    }}
                  ></div>
                  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-5 gap-3">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white">Analytics</h3>
                      <p className="text-xs sm:text-sm text-blue-100">Session insights and performance</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                        <span className="text-xs text-white">Defensive</span>
                        <Switch checked={defensiveMode} onCheckedChange={setDefensiveMode} />
                      </div>
                      <Button
                        onClick={() => setShowAnalytics(false)}
                        className="text-white border px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 btn-ai hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, ${getCurrentTheme().primaryColor}, ${getCurrentTheme().secondaryColor})`,
                          borderColor: getCurrentTheme().primaryColor,
                          boxShadow: `0 4px 15px ${getCurrentTheme().primaryColor}30`
                        }}
                      >
                        Back to Chat
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="glass-dark p-5 rounded-2xl border border-white/10">
                    <div className="text-xs text-blue-200">Total</div>
                    <div className="text-3xl font-bold" style={{ color: getCurrentTheme().primaryColor }}>{analytics.totalMessages}</div>
                    <div className="text-xs text-blue-300">Messages</div>
                  </div>
                  <div className="glass-dark p-5 rounded-2xl border border-white/10">
                    <div className="text-xs text-blue-200">User</div>
                    <div className="text-3xl font-bold" style={{ color: getCurrentTheme().secondaryColor }}>{analytics.userMessages}</div>
                    <div className="text-xs text-blue-300">Messages</div>
                  </div>
                  <div className="glass-dark p-5 rounded-2xl border border-white/10">
                    <div className="text-xs text-blue-200">AI</div>
                    <div className="text-3xl font-bold" style={{ color: getCurrentTheme().accentColor }}>{analytics.AIMessages}</div>
                    <div className="text-xs text-blue-300">Messages</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                  <div className="glass-dark p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-semibold">Topics Mix</h4>
                      <span className="text-xs text-blue-200">Top 5</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getPopularTopics()}
                              dataKey="value"
                              nameKey="name"
                              outerRadius={75}
                              innerRadius={45}
                              isAnimationActive
                            >
                              {getPopularTopics().map((_entry, index) => (
                                <Cell key={`c-${index}`} fill={
                                  index === 0 ? getCurrentTheme().primaryColor :
                                    index === 1 ? getCurrentTheme().secondaryColor :
                                      index === 2 ? getCurrentTheme().accentColor :
                                        index === 3 ? getCurrentTheme().primaryColor + '80' :
                                          getCurrentTheme().secondaryColor + '80'
                                } />
                              ))}
                            </Pie>
                          <ReTooltip
                            formatter={(value: any, name: any) => [`${value}`, name]}
                            contentStyle={{
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                              borderRadius: '12px',
                              color: '#e2e8f0',
                              padding: '8px 10px',
                              boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
                            }}
                            itemStyle={{ color: '#e2e8f0' }}
                            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                          />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {getPopularTopics().length === 0 && (
                          <div className="text-xs text-blue-200">No topics yet</div>
                        )}
                        {getPopularTopics().map((t, i) => (
                          <div key={t.name} className="flex items-center justify-between text-xs text-blue-100">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ background: i === 0 ? getCurrentTheme().primaryColor : i === 1 ? getCurrentTheme().secondaryColor : i === 2 ? getCurrentTheme().accentColor : getCurrentTheme().primaryColor + '80' }}></span>
                              <span className="capitalize">{t.name}</span>
                            </div>
                            <span className="text-white">{t.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="glass-dark p-5 rounded-2xl border border-white/10">
                      <h4 className="text-white font-semibold mb-3">System</h4>
                      <div className="space-y-2 text-xs text-blue-200">
                        <div className="flex items-center justify-between">
                          <span>Session started</span>
                          <span className="text-white">{new Date(analytics.sessionStart).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Personality</span>
                          <span className="text-white capitalize">{personality}</span>
                        </div>
                        {/* Display the selected model name in chat analytics in system card */}
                        {/* <div className="flex items-center justify-between">
                          <span>Model</span>
                          <span className="text-white">{selectedModel}</span>
                        </div> */}
                      </div>
                    </div>

                    {userAnalytics && (
                      <div className="glass-dark p-5 rounded-2xl border border-white/10">
                        <h4 className="text-white font-semibold mb-3">Your Analytics</h4>
                        <div className="space-y-2 text-xs text-blue-200">
                          <div className="flex items-center justify-between">
                            <span>Total messages</span>
                            <span className="text-white">{userAnalytics.totalStats?.totalMessages ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Total tokens</span>
                            <span className="text-white">{userAnalytics.totalStats?.totalTokens ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Total sessions</span>
                            <span className="text-white">{userAnalytics.totalStats?.totalSessions ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Avg session</span>
                            <span className="text-white">{Math.round(userAnalytics.totalStats?.averageSessionDuration ?? 0)}m</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-dark p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold">Conversation Tools</h4>
                    <span className="text-xs text-blue-200">Manage data</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      onClick={exportAllChats}
                      className="text-white border transition-all duration-300 btn-ai hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${getCurrentTheme().primaryColor}, ${getCurrentTheme().secondaryColor})`,
                        borderColor: getCurrentTheme().primaryColor,
                        boxShadow: `0 4px 15px ${getCurrentTheme().primaryColor}30`
                      }}
                    >
                      Export All
                    </Button>

                    <Button
                      onClick={() => document.getElementById('import-chats')?.click()}
                      className="text-white border transition-all duration-300 btn-ai hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${getCurrentTheme().secondaryColor}, ${getCurrentTheme().accentColor})`,
                        borderColor: getCurrentTheme().secondaryColor,
                        boxShadow: `0 4px 15px ${getCurrentTheme().secondaryColor}30`
                      }}
                    >
                      Import
                    </Button>

                    <Button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all conversations? This action cannot be undone.')) {
                          const authToken = getAuthToken();
                          if (isAuthenticated && authToken) {
                            chatApi.deleteAllUserChats(authToken)
                              .then(() => fetchUserChats(authToken))
                              .catch((error) => console.error('Failed to clear chats:', error));
                          } else {
                            setRecentChats([]);
                          }
                          startNewChat();
                        }
                      }}
                      className="text-white border transition-all duration-300 btn-ai hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, #ef4444, #dc2626)`,
                        borderColor: '#ef4444',
                        boxShadow: `0 4px 15px #ef444430`
                      }}
                    >
                      Clear All
                    </Button>
                  </div>

                  <input
                    id="import-chats"
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        importChats(file);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            </div>
                    ) : (
            <ChatMessageList
              messages={messages}
              messagesScrollRef={messagesScrollRef}
              messagesEndRef={messagesEndRef}
              handleMessagesScroll={handleMessagesScroll}
              getCurrentTheme={getCurrentTheme}
              editingMessage={editingMessage}
              editText={editText}
              setEditText={setEditText}
              saveEditedMessage={saveEditedMessage}
              cancelEdit={cancelEdit}
              expandedMessageIds={expandedMessageIds}
              toggleExpandMessage={toggleExpandMessage}
              copiedCodeKey={copiedCodeKey}
              copyCodeBlock={copyCodeBlock}
              extractTextFromNode={extractTextFromNode}
              copiedMessageId={copiedMessageId}
              copyMessageById={copyMessageById}
              regeneratingMessageId={regeneratingMessageId}
              regenerateMessage={regenerateMessage}
              showPreviousResponse={showPreviousResponse}
              showNextResponse={showNextResponse}
              likeMessage={likeMessage}
              dislikeMessage={dislikeMessage}
              editMessage={editMessage}
              speechEnabled={speechEnabled}
              availableLanguages={availableLanguages}
              speechLanguage={speechLanguage}
              isSpeaking={isSpeaking}
              stopSpeaking={stopSpeaking}
              speakText={speakText}
              error={error}
              handleSendMessage={handleSendMessage}
              isTyping={isTyping}
              retryCount={retryCount}
            />
          )}
        </div>

        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="h-10 w-10 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md shadow-lg hover:bg-white/20 transition-all duration-200 scroll-down-btn scroll-down-btn-fixed"
            data-tooltip="Jump to latest"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-5 w-5 mx-auto" />
          </button>
        )}

        <ChatComposer
          showAnalytics={showAnalytics}
          isAuthenticated={isAuthenticated}
          guestLimit={guestLimit}
          isTyping={isTyping}
          isUploadingImage={isUploadingImage}
          inputValue={inputValue}
          selectedImage={selectedImage}
          imagePreview={imagePreview}
          selectedModel={selectedModel}
          isListening={isListening}
          inputRef={inputRef}
          getCurrentTheme={getCurrentTheme}
          setInputValue={setInputValue}
          setShowShortcuts={setShowShortcuts}
          openPromptTemplates={() => setShowTemplateLibrary(true)}
          openToolActions={() => setShowToolActions(true)}
          setShowImagePopup={setShowImagePopup}
          handleImageRemove={handleImageRemoveWithMemory}
          handleImageSelect={handleImageSelect}
          handleKeyPress={handleKeyPress}
          toggleVoiceInput={toggleVoiceInput}
          startVoiceInput={startVoiceInput}
          stopVoiceInput={stopVoiceInput}
          handleSendMessage={handleSendMessage}
          stopGeneration={stopGeneration}
        />

        {portalTarget && showTemplateLibrary && createPortal((
          <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2" onClick={() => setShowTemplateLibrary(false)}>
            <div className="relative w-[calc(100vw-1rem)] max-w-3xl max-h-[92vh] overflow-y-auto glass-dark border border-white/20 rounded-2xl shadow-2xl p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Prompt Templates</h3>
                <Button size="sm" onClick={() => setShowTemplateLibrary(false)} className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30">x</Button>
              </div>

              <div className="flex gap-2 flex-wrap mb-4">
                {templateCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setTemplateCategory(category)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${templateCategory === category ? 'bg-blue-500/20 border-blue-400/40 text-blue-100' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="space-y-2 mb-5">
                {visibleTemplates.map((template) => (
                  <div key={template.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-white">{template.title}</div>
                        <div className="text-xs text-blue-200">{template.category}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="h-8 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border border-blue-400/30" onClick={() => insertTemplatePrompt(template.prompt)}>
                          Use
                        </Button>
                        {!template.builtIn && (
                          <Button size="sm" className="h-8 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30" onClick={() => deleteTemplate(template.id)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-white/70 mt-2">{template.prompt}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                <h4 className="text-sm font-semibold text-white">Create Template</h4>
                <input
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="Template title"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                />
                <input
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value)}
                  placeholder="Category"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                />
                <textarea
                  value={newTemplatePrompt}
                  onChange={(e) => setNewTemplatePrompt(e.target.value)}
                  placeholder="Prompt text"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm min-h-[90px]"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={createTemplate} className="h-8 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                    Save Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ), portalTarget)}

        {portalTarget && showToolActions && createPortal((
          <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2" onClick={() => { setShowToolActions(false); setToolDropdownOpen(false); }}>
            <div className="relative w-[calc(100vw-1rem)] max-w-xl max-h-[90vh] overflow-y-auto glass-dark border border-white/20 rounded-2xl shadow-2xl p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Tool Actions</h3>
                <Button size="sm" onClick={() => { setShowToolActions(false); setToolDropdownOpen(false); }} className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30">x</Button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <label className="text-xs text-blue-200 mb-1 block">Tool</label>
                  <button
                    type="button"
                    onClick={() => setToolDropdownOpen((prev) => !prev)}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm flex items-center justify-between hover:bg-white/15 transition-colors"
                  >
                    <span>{selectedToolLabel}</span>
                    <ChevronDown className={`h-4 w-4 text-blue-200 transition-transform duration-200 ${toolDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {toolDropdownOpen && (
                    <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-white/20 bg-slate-950/95 shadow-xl backdrop-blur-md">
                      {toolOptions.map((option) => {
                        const disabled = !toolPermissions[option.key];
                        return (
                          <button
                            key={option.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return;
                              setSelectedTool(option.key);
                              setToolDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm border-b last:border-b-0 border-white/10 transition-colors ${
                              disabled
                                ? 'text-white/40 bg-white/[0.02] cursor-not-allowed'
                                : selectedTool === option.key
                                  ? 'bg-cyan-500/25 text-cyan-100'
                                  : 'text-white hover:bg-white/10'
                            }`}
                          >
                            {option.label}{disabled ? ' (disabled)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-blue-200 mb-1 block">Input</label>
                  <textarea
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    placeholder="Enter tool input"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm min-h-[110px]"
                  />
                </div>

                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Permission gate: tool execution asks for confirmation before running. Configure allowed tools in Settings.
                </div>
                {noToolEnabled && (
                  <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    No tools are enabled. Turn on at least one tool in Settings to run actions.
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={() => setShowToolActions(false)} className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white border border-white/20">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={executeToolAction} disabled={isRunningTool || !toolInput.trim() || !toolPermissions[selectedTool] || noToolEnabled} className="h-8 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 border border-cyan-400/30">
                    {isRunningTool ? 'Running...' : 'Run Tool'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ), portalTarget)}

        {/* Delete Confirmation Modal */}
        {portalTarget && showDeleteConfirm && createPortal((
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="relative w-[calc(100vw-1rem)] max-w-md glass-dark border border-white/20 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] p-4 sm:p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Delete Chat</h3>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 transition-all duration-200 hover:scale-110"
                >
                  <span className="text-sm">x</span>
                </Button>
              </div>
              <p className="text-sm text-white/80 mb-4">
                This will permanently delete the chat
                {deleteConfirmTitle ? ` "${deleteConfirmTitle}"` : ''}. This action cannot be undone.
              </p>
              <label className="block text-xs text-white/70 mb-2">
                Type <span className="text-white font-semibold">DELETE</span>
                {deleteConfirmTitle ? (
                  <>
                    {' '}or the chat title to confirm.
                  </>
                ) : (
                  <> to confirm.</>
                )}
              </label>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteConfirmTitle || 'DELETE'}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (deleteConfirmChatId && canConfirmDelete) {
                      deleteChat(deleteConfirmChatId);
                      setShowDeleteConfirm(false);
                    }
                  }}
                  disabled={!canConfirmDelete}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 rounded-lg disabled:opacity-40"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ), portalTarget)}

        {/* Image Preview Popup Modal */}
        {showImagePopup && imagePreview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2"
            onClick={() => setShowImagePopup(false)}
          >
            <div
              className="relative w-[calc(100vw-1rem)] max-w-4xl max-h-[92vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-lg">IMG</span>
                  Image Preview
                </h3>
                <Button
                  onClick={() => setShowImagePopup(false)}
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 transition-all duration-200 hover:scale-110"
                >
                  <span className="text-sm">x</span>
                </Button>
              </div>

              {/* Image Content */}
              <div className="p-4 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Full size preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-sm text-white/70">
                  {selectedImage && (
                    <span>File: {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowImagePopup(false)}
                    size="sm"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all duration-200"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copy Fallback Modal */}
        {showCopyFallback && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2"
            onClick={() => setShowCopyFallback(false)}
          >
            <div
              className="relative w-[calc(100vw-1rem)] max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Copy Text</h3>
                <Button
                  onClick={() => setShowCopyFallback(false)}
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 transition-all duration-200 hover:scale-110"
                >
                  <span className="text-sm">×</span>
                </Button>
              </div>
              <textarea
                value={copyFallbackText}
                readOnly
                className="w-full h-48 bg-black/40 text-white p-3 rounded-lg border border-white/20 focus:outline-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="mt-3 text-sm text-gray-300">
                Your browser blocked automatic copy. Click inside the box and press Ctrl+C / Cmd+C.
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AIchat;






