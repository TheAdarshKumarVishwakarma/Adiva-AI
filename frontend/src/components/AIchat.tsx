import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import {
  Send,
  Bot as AIIcon,
  User as UserIcon,
  Mic,
  MicOff,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Settings2,
  Volume2,
  VolumeX,
  Globe,
  Copy,
  Check,
  Pencil,
  Send as SendIcon,
  ChevronDown,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { ImageProcessingService } from '@/services/imageProcessingService';
import SettingsPanel from './SettingsPanel';
import { useAuth } from '@/contexts/AuthContext';

// =====================
// Types
// =====================
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'AI';
  timestamp: string;
  isAI?: boolean;
  imageUrl?: string; // Add image URL for display
  isStreaming?: boolean; // For streaming messages
  liked?: boolean;
  disliked?: boolean;
  meta?: {
    defenseQuality?: 'low' | 'medium' | 'high';
    hallucinationRisk?: 'low' | 'medium' | 'high';
    tone?: 'friendly' | 'logical' | 'playful' | 'confident';
    taskType?: string; // Added for task type
  };
}

interface Analytics {
  totalMessages: number;
  userMessages: number;
  AIMessages: number;
  popularTopics: { [key: string]: number };
  sessionStart: string;
  topTopics?: Array<{ name: string; value: number }>;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  lastModified: string;
  pinned?: boolean;
  dbId?: string;
  conversationId?: string;
}

// Define the interface for the component props
interface AIchatProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showAnalytics: boolean;
  setShowAnalytics: (show: boolean) => void;
  onSidebarThemeChange?: (enabled: boolean) => void;
  onThemeChange?: (theme: string) => void;
}

// =====================
// Component
// =====================
function AIchat({
  showSettings,
  setShowSettings,
  showAnalytics,
  setShowAnalytics,
  onSidebarThemeChange,
  onThemeChange
}: AIchatProps) {
  const { isAuthenticated, token } = useAuth();
  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    text: `🚀 **Welcome to Adiva AI!** 

I'm your advanced AI assistant, ready to help you with any task. Here's what I can do:

**💻 Programming & Development**
• Write code in any language • Debug and optimize • Web development • Data science

**✍️ Writing & Communication**
• Essays and reports • Professional emails • Creative content • Technical documentation

**🔍 Analysis & Problem Solving**
• Data analysis • Mathematical solutions • Research assistance • Business strategy

**🎨 Creative & Design**
• Brainstorming ideas • Design concepts • Marketing strategies • Innovation

**📚 Learning & Education**
• Step-by-step tutorials • Concept explanations • Study guides • Skill development

**What would you like to work on today?** Just ask, and I'll provide comprehensive, helpful assistance!`,
    sender: 'AI',
    timestamp: new Date().toISOString(),
    isAI: true,
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [defensiveMode, setDefensiveMode] = useState(false);
  const [personality, setPersonality] = useState<'friendly' | 'logical' | 'playful' | 'confident'>('friendly');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>(() => `chat_${Date.now()}`);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5-nano');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true); // Enable by default for testing
  const [interfaceLanguage, setInterfaceLanguage] = useState<string>('en-US');
  const [speechLanguage, setSpeechLanguage] = useState<string>('en-US');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('ocean');
  const [sidebarThemeEnabled, setSidebarThemeEnabled] = useState<boolean>(false);
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
  const [availableLanguages] = useState<Array<{ code: string, name: string }>>([
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'ar-SA', name: 'Arabic' }
  ]);

  const availableThemes = [
    {
      id: 'ocean',
      name: 'Ocean',
      primary: 'from-blue-500',
      secondary: 'to-cyan-500',
      accent: 'blue',
      primaryColor: '#3b82f6',
      secondaryColor: '#06b6d4',
      accentColor: '#60a5fa'
    },
    {
      id: 'indigo',
      name: 'Indigo',
      primary: 'from-indigo-500',
      secondary: 'to-purple-500',
      accent: 'indigo',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      accentColor: '#06b6d4'
    },
    {
      id: 'blue',
      name: 'Blue',
      primary: 'from-blue-500',
      secondary: 'to-cyan-500',
      accent: 'blue',
      primaryColor: '#3b82f6',
      secondaryColor: '#f59e0b',
      accentColor: '#ec4899'
    },
    {
      id: 'green',
      name: 'Green',
      primary: 'from-green-500',
      secondary: 'to-emerald-500',
      accent: 'green',
      primaryColor: '#10b981',
      secondaryColor: '#f59e0b',
      accentColor: '#06b6d4'
    },
    {
      id: 'purple',
      name: 'Purple',
      primary: 'from-purple-500',
      secondary: 'to-pink-500',
      accent: 'purple',
      primaryColor: '#8b5cf6',
      secondaryColor: '#ec4899',
      accentColor: '#a855f7'
    },
    {
      id: 'orange',
      name: 'Orange',
      primary: 'from-orange-500',
      secondary: 'to-amber-500',
      accent: 'orange',
      primaryColor: '#f97316',
      secondaryColor: '#f59e0b',
      accentColor: '#fb923c'
    },
    {
      id: 'teal',
      name: 'Teal',
      primary: 'from-teal-500',
      secondary: 'to-cyan-500',
      accent: 'teal',
      primaryColor: '#14b8a6',
      secondaryColor: '#f59e0b',
      accentColor: '#ec4899'
    },
    {
      id: 'red',
      name: 'Red',
      primary: 'from-red-500',
      secondary: 'to-pink-500',
      accent: 'red',
      primaryColor: '#ef4444',
      secondaryColor: '#ec4899',
      accentColor: '#f87171'
    },
    {
      id: 'yellow',
      name: 'Yellow',
      primary: 'from-yellow-500',
      secondary: 'to-orange-500',
      accent: 'yellow',
      primaryColor: '#eab308',
      secondaryColor: '#f59e0b',
      accentColor: '#fbbf24'
    }
  ];
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const settingsLoadedRef = useRef(false);
  const settingsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const chatAIRef = useRef<HTMLDivElement>(null);
  const prevAuthRef = useRef<boolean>(isAuthenticated);

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

  // Speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = speechLanguage || 'en-US';
      recognitionRef.current.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, [speechLanguage]);

  // Speech synthesis
  useEffect(() => {
    console.log('🎤 Initializing speech synthesis...');
    if ('speechSynthesis' in window) {
      synthesisRef.current = new SpeechSynthesisUtterance();
      synthesisRef.current.rate = 0.95;
      synthesisRef.current.pitch = 1;
      synthesisRef.current.volume = 0.9;
      synthesisRef.current.lang = speechLanguage;
      console.log('🎤 Speech synthesis initialized with language:', speechLanguage);
    } else {
      console.error('❌ Speech synthesis not supported in this browser');
    }
  }, [speechLanguage]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      setSpeechVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const getVoiceForLanguage = (lang: string) => {
    if (!speechVoices.length) return undefined;
    const exact = speechVoices.find(v => v.lang === lang);
    if (exact) return exact;
    const prefix = speechVoices.find(v => v.lang.startsWith(lang.split('-')[0]));
    return prefix || speechVoices[0];
  };

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (text: string, language?: string) => {
    console.log('🎤 speakText called with:', { text: text.substring(0, 50) + '...', language, speechLanguage });

    if (!('speechSynthesis' in window)) {
      console.error('❌ Speech synthesis not supported in this browser');
      alert('Speech synthesis is not supported in your browser');
      return;
    }

    if (!synthesisRef.current) {
      console.error('❌ Speech synthesis not initialized');
      alert('Speech synthesis not initialized');
      return;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create a new utterance for each speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 0.9;
      const targetLang = language || speechLanguage;
      utterance.lang = targetLang;
      const voice = getVoiceForLanguage(targetLang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        console.log('🎤 Speech started');
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('🎤 Speech ended');
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('❌ Speech error:', event.error);
        setIsSpeaking(false);
        alert(`Speech error: ${event.error}`);
      };

      console.log('🎤 Starting speech with language:', utterance.lang, 'voice:', utterance.voice?.name);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('❌ Speech synthesis error:', error);
      setIsSpeaking(false);
      alert('Error starting speech synthesis');
    }
  };

  const stopSpeaking = () => {
    console.log('🛑 stopSpeaking called');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      console.log('🛑 Speech stopped');
    }
  };

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

  const getAuthToken = () => token || localStorage.getItem('token');

  const normalizeBackendMessage = (msg: any): Message => {
    const isAssistant = msg.role === 'assistant';
    const rawText = msg.content || '';
    const text = isAssistant ? extractPlainAnswer(rawText) : rawText;
    return {
      id: msg._id ? String(msg._id) : `${msg.role}-${msg.timestamp || Date.now()}`,
      text,
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
    const messages = Array.isArray(chat.messages) ? chat.messages.map(normalizeBackendMessage) : [];
    return {
      id: chat.conversationId || String(chat._id),
      conversationId: chat.conversationId || String(chat._id),
      dbId: String(chat._id),
      title: chat.title || 'New Chat',
      messages,
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

  const loadCachedChats = () => {
    try {
      const savedChats = localStorage.getItem("chatAI_recentChats");
      if (savedChats) {
        const parsed = JSON.parse(savedChats) as ChatSession[];
        setRecentChats(parsed);
        setAnalytics(buildAnalyticsFromChats(parsed));
      }
    } catch { }
  };

  const cacheChats = (chats: ChatSession[]) => {
    try {
      localStorage.setItem("chatAI_recentChats", JSON.stringify(chats));
    } catch { }
  };

  const fetchUserChats = async (authToken: string, preferredConversationId?: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/user/chats', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to load chats');
      const data = await response.json();
      const chats = Array.isArray(data.chats) ? data.chats.map(normalizeBackendChat) : [];
      setRecentChats(chats);
      setAnalytics(buildAnalyticsFromChats(chats));
      cacheChats(chats);

      const targetId = preferredConversationId || currentChatId;
      const current = chats.find((c: any) => c.id === targetId || c.conversationId === targetId);
      if (current) {
        setMessages(current.messages);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      loadCachedChats();
    }
  };

  const fetchUserAnalytics = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/user/analytics', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
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
      const response = await fetch('http://localhost:3001/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
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

      settingsLoadedRef.current = true;
    } catch (error) {
      console.error('Failed to load user settings:', error);
      settingsLoadedRef.current = true;
    }
  };

  const saveUserSettings = async (authToken: string) => {
    try {
      await fetch('http://localhost:3001/api/user/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
          }
        })
      });
    } catch (error) {
      console.error('Failed to save user settings:', error);
    }
  };

  // Load available AI models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/ai-models');
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
      fetchUserSettings(authToken);
      fetchUserChats(authToken);
      fetchUserAnalytics(authToken);
    } else {
      loadCachedChats();
    }
  }, [isAuthenticated, token]);

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
    speechLanguage
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


  // Listen for new chat events from the sidebar
  useEffect(() => {
    const handleNewChat = () => {
      startNewChat();
    };

    window.addEventListener('startNewChat', handleNewChat);
    return () => {
      window.removeEventListener('startNewChat', handleNewChat);
    };
  }, []);

  // Add global functions for chat options dropdown
  useEffect(() => {
    // Add global functions to window object
    (window as any).toggleChatOptions = (chatId: string) => {
      // Hide all other dropdowns first
      document.querySelectorAll('[id^="chat-options-"]').forEach(el => {
        if (el.id !== `chat-options-${chatId}`) {
          el.classList.add('hidden');
        }
      });
      
      const dropdown = document.getElementById(`chat-options-${chatId}`);
      if (dropdown) {
        const willShow = dropdown.classList.contains('hidden');
        if (!willShow) {
          dropdown.classList.add('hidden');
          dropdown.style.position = '';
          dropdown.style.left = '';
          dropdown.style.top = '';
          dropdown.style.right = '';
          dropdown.style.transform = '';
          dropdown.style.zIndex = '';
          dropdown.style.visibility = '';
          return;
        }

        const trigger = document.querySelector(`[data-chat-options-trigger="${chatId}"]`) as HTMLElement | null;
        if (!trigger) return;

        // Prepare menu in fixed position before it becomes visible to avoid scrollbars/flicker
        dropdown.style.position = 'fixed';
        dropdown.style.left = '0';
        dropdown.style.top = '0';
        dropdown.style.right = 'auto';
        dropdown.style.transform = 'none';
        dropdown.style.zIndex = '9999';
        dropdown.style.visibility = 'hidden';
        dropdown.style.display = 'block';
        dropdown.classList.remove('hidden');

        // Force layout so width/height are correct immediately
        void dropdown.offsetWidth;
        const triggerRect = trigger.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        const desiredLeft = triggerRect.right + 12;
        const maxLeft = window.innerWidth - dropdownRect.width - 12;
        const left = Math.max(12, Math.min(desiredLeft, maxLeft));

        const desiredTop = triggerRect.top;
        const maxTop = window.innerHeight - dropdownRect.height - 12;
        const top = Math.max(12, Math.min(desiredTop, maxTop));

        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
        dropdown.style.visibility = 'visible';
      }
    };

    (window as any).hideChatOptions = (chatId: string) => {
      const dropdown = document.getElementById(`chat-options-${chatId}`);
      if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.style.position = '';
        dropdown.style.left = '';
        dropdown.style.top = '';
        dropdown.style.right = '';
        dropdown.style.transform = '';
        dropdown.style.zIndex = '';
        dropdown.style.visibility = '';
        dropdown.style.display = '';
      }
    };

    // Hide dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isDropdown = target.closest('[id^="chat-options-"]');
      const isOptionsButton = target.closest('button[onclick*="toggleChatOptions"]');
      
      if (!isDropdown && !isOptionsButton) {
        document.querySelectorAll('[id^="chat-options-"]').forEach(el => {
          el.classList.add('hidden');
          (el as HTMLElement).style.position = '';
          (el as HTMLElement).style.left = '';
          (el as HTMLElement).style.top = '';
          (el as HTMLElement).style.right = '';
          (el as HTMLElement).style.transform = '';
          (el as HTMLElement).style.zIndex = '';
          (el as HTMLElement).style.visibility = '';
          (el as HTMLElement).style.display = '';
        });
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      delete (window as any).toggleChatOptions;
      delete (window as any).hideChatOptions;
    };
  }, []);

  // Update sidebar with recent chats
  useEffect(() => {
    const updateSidebar = () => {
      const container = document.getElementById('recent-chats-container');
      if (container) {
        container.innerHTML = '';

        if (recentChats.length === 0) {
          container.innerHTML = `
             <div class="glass-dark border border-white/10 rounded-xl p-6 text-center">
               <div class="text-blue-300 text-sm font-medium">No recent chats</div>
               <div class="text-blue-400 text-xs mt-1">Start a new conversation to see it here</div>
            </div>
          `;
          return;
        }

        const sortedChats = [...recentChats].sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        });

        sortedChats.forEach(chat => {
          const chatElement = document.createElement('div');
          chatElement.className = `group relative studio-chat-card rounded-2xl p-4 cursor-pointer transition-all duration-300 ${chat.id === currentChatId ? 'studio-chat-card-active' : ''
            }`;

          const title = chat.title || 'Untitled Chat';
          const date = new Date(chat.lastModified).toLocaleDateString();

          chatElement.innerHTML = `
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                 <div class="truncate text-white font-medium text-sm">${title}</div>
                 <div class="text-xs text-blue-300 mt-1">${date}</div>
              </div>
               <div class="relative">
              <button 
                   class="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/20 transition-all duration-200"
                   data-chat-options-trigger="${chat.id}"
                   onclick="event.stopPropagation(); toggleChatOptions('${chat.id}')"
                 >
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                   </svg>
                 </button>
                 
                   <div id="chat-options-${chat.id}" class="hidden absolute right-0 top-0 w-56 studio-chat-menu z-50 overflow-hidden">
                     <div class="p-2">
                       <button 
                         class="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-3 rounded-lg"
                         onclick="window.dispatchEvent(new CustomEvent('downloadChat', { detail: '${chat.id}' })); hideChatOptions('${chat.id}')"
                       >
                         <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                           <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                           </svg>
                         </div>
                         <div class="text-white font-medium">Download</div>
                       </button>
                       <button 
                         class="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-3 rounded-lg"
                         onclick="window.dispatchEvent(new CustomEvent('renameChat', { detail: '${chat.id}' })); hideChatOptions('${chat.id}')"
                       >
                         <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                           <svg class="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.862 4.487l2.651 2.651a2.121 2.121 0 010 3L7.5 22.15 3 21l1.15-4.5 12.712-12.713a2.121 2.121 0 013 0z"></path>
                           </svg>
                         </div>
                         <div class="text-white font-medium">Rename</div>
                       </button>
                       <button 
                         class="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-3 rounded-lg"
                         onclick="window.dispatchEvent(new CustomEvent('pinChat', { detail: '${chat.id}' })); hideChatOptions('${chat.id}')"
                       >
                         <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                           <svg class="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3l5 5-4 4 2 2-3 3-2-2-6 6-2-2 6-6-2-2 3-3 2 2 4-4z"></path>
                           </svg>
                         </div>
                         <div class="text-white font-medium">${chat.pinned ? 'Unpin' : 'Pin'}</div>
                       </button>
                       <div class="h-px bg-white/10 mx-2 my-2"></div>
                       <button 
                         class="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-3 rounded-lg"
                         onclick="window.dispatchEvent(new CustomEvent('deleteChat', { detail: '${chat.id}' })); hideChatOptions('${chat.id}')"
                       >
                         <div class="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                           <svg class="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                         </div>
                         <div class="text-white font-medium">Delete</div>
                       </button>
                     </div>
                   </div>
               </div>
            </div>
          `;

          chatElement.addEventListener('click', (e) => {
            if (!(e.target as HTMLElement).closest('button')) {
              loadChat(chat.id);
            }
          });

          container.appendChild(chatElement);
        });
      }
    };

    updateSidebar();
  }, [recentChats, currentChatId]);

  // Listen for delete chat events
  useEffect(() => {
    const handleDeleteChat = (event: CustomEvent) => {
      requestDeleteChat(event.detail);
    };

    window.addEventListener('deleteChat', handleDeleteChat as EventListener);
    return () => {
      window.removeEventListener('deleteChat', handleDeleteChat as EventListener);
    };
  }, []);

  // Listen for rename chat events
  useEffect(() => {
    const handleRenameChat = (event: CustomEvent) => {
      renameChat(event.detail);
    };

    window.addEventListener('renameChat', handleRenameChat as EventListener);
    return () => {
      window.removeEventListener('renameChat', handleRenameChat as EventListener);
    };
  }, [recentChats]);

  // Listen for pin chat events
  useEffect(() => {
    const handlePinChat = (event: CustomEvent) => {
      togglePinChat(event.detail);
    };

    window.addEventListener('pinChat', handlePinChat as EventListener);
    return () => {
      window.removeEventListener('pinChat', handlePinChat as EventListener);
    };
  }, [recentChats]);

  // Listen for download chat events
  useEffect(() => {
    const handleDownloadChat = (event: CustomEvent) => {
      downloadSpecificChat(event.detail);
    };

    window.addEventListener('downloadChat', handleDownloadChat as EventListener);
    return () => {
      window.removeEventListener('downloadChat', handleDownloadChat as EventListener);
    };
  }, []);

  // Remove old event handling - now using props directly

  // Remove old event handling - now using props directly

  // Remove old event handling - now using props directly



  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

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
  // Chat Management Functions
  // =====================
  const generateChatTitle = (messages: Message[]): string => {
    // Find the first user message to use as title
    const firstUserMessage = messages.find(m => m.sender === 'user');
    if (firstUserMessage) {
      const text = firstUserMessage.text.trim();
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
    return 'New Chat';
  };

  const saveCurrentChat = () => {
    if (isAuthenticated) return;
    // Don't save during initialization or if no user messages
    if (!isInitialized) return;

    const hasUserMessages = messages.some(m => m.sender === 'user');

    if (hasUserMessages) {
      const chatTitle = generateChatTitle(messages);
      const chatSession: ChatSession = {
        id: currentChatId,
        title: chatTitle,
        messages: [...messages],
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
  };

  const startNewChat = () => {
    // Only save current chat if it has user messages
    const hasUserMessages = messages.some(m => m.sender === 'user');
    if (hasUserMessages) {
      saveCurrentChat();
    }

    // Create new chat
    const newChatId = `chat_${Date.now()}`;
    setCurrentChatId(newChatId);

    // Reset messages to welcome message
    setMessages([{
      id: '1',
      text: `🚀 **Welcome to Adiva AI!** 

I'm your advanced AI assistant, ready to help you with any task. Here's what I can do:

**💻 Programming & Development**
• Write code in any language • Debug and optimize • Web development • Data science

**✍️ Writing & Communication**
• Essays and reports • Professional emails • Creative content • Technical documentation

**🔍 Analysis & Problem Solving**
• Data analysis • Mathematical solutions • Research assistance • Business strategy

**🎨 Creative & Design**
• Brainstorming ideas • Design concepts • Marketing strategies • Innovation

**📚 Learning & Education**
• Step-by-step tutorials • Concept explanations • Study guides • Skill development

**What would you like to work on today?** Just ask, and I'll provide comprehensive, helpful assistance!`,
      sender: 'AI',
      timestamp: new Date().toISOString(),
      isAI: true,
    }]);

    // Reset analytics
    setAnalytics({
      totalMessages: 0,
      userMessages: 0,
      AIMessages: 0,
      popularTopics: {},
      sessionStart: new Date().toISOString(),
    });

    // Clear input and states
    setInputValue('');
    setIsTyping(false);
    setError(null);
    setRetryCount(0);
  };

  const loadChat = (chatId: string) => {
    // Only save current chat if it has user messages
    const hasUserMessages = messages.some(m => m.sender === 'user');
    if (hasUserMessages) {
      saveCurrentChat();
    }

    const chatToLoad = recentChats.find(chat => chat.id === chatId);
    if (!chatToLoad) return;

    const loadFromBackend = async () => {
      const authToken = getAuthToken();
      if (!authToken || !chatToLoad.dbId) return false;
      try {
        const response = await fetch(`http://localhost:3001/api/user/chats/${chatToLoad.dbId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) return false;
        const data = await response.json();
        if (!data?.chat) return false;
        const normalized = normalizeBackendChat(data.chat);
        setCurrentChatId(normalized.conversationId || normalized.id);
        setMessages(normalized.messages);
        setAnalytics(buildAnalyticsFromChats([normalized]));
        return true;
      } catch (error) {
        console.error('Failed to load chat from backend:', error);
        return false;
      }
    };

    if (isAuthenticated) {
      loadFromBackend().then((loaded) => {
        if (!loaded) {
          setCurrentChatId(chatId);
          setMessages(chatToLoad.messages);
          setAnalytics(buildAnalyticsFromChats([chatToLoad]));
        }
      });
    } else {
      setCurrentChatId(chatId);
      setMessages(chatToLoad.messages);
      setAnalytics(buildAnalyticsFromChats([chatToLoad]));
    }

    // Clear input and states
    setInputValue('');
    setIsTyping(false);
    setError(null);
    setRetryCount(0);
  };

  const deleteChat = (chatId: string) => {
    const target = recentChats.find(chat => chat.id === chatId);
    const authToken = getAuthToken();

    if (isAuthenticated && authToken && target?.dbId) {
      fetch(`http://localhost:3001/api/user/chats/${target.dbId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }).catch((error) => {
        console.error('Failed to delete chat from backend:', error);
      });
    }

    setRecentChats(prev => prev.filter(chat => chat.id !== chatId));

    // If we're deleting the current chat, start a new one
    if (chatId === currentChatId) {
      startNewChat();
    }
  };

  const requestDeleteChat = (chatId: string) => {
    const target = recentChats.find(chat => chat.id === chatId);
    setDeleteConfirmChatId(chatId);
    setDeleteConfirmTitle(target?.title || '');
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const updateChatOnBackend = async (chatId: string, updates: any) => {
    const authToken = getAuthToken();
    const target = recentChats.find(chat => chat.id === chatId);
    if (!isAuthenticated || !authToken || !target?.dbId) return;
    try {
      await fetch(`http://localhost:3001/api/user/chats/${target.dbId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update chat on backend:', error);
    }
  };

  const renameChat = (chatId: string) => {
    const chat = recentChats.find(c => c.id === chatId);
    const currentTitle = chat?.title || '';
    const nextTitle = prompt('Rename chat', currentTitle);
    if (nextTitle === null) return;
    const trimmed = nextTitle.trim();
    if (!trimmed) return;

    setRecentChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, title: trimmed, lastModified: new Date().toISOString() } : c
    ));
    updateChatOnBackend(chatId, { title: trimmed });
  };

  const togglePinChat = (chatId: string) => {
    const target = recentChats.find(c => c.id === chatId);
    const nextPinned = !target?.pinned;
    setRecentChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, pinned: nextPinned, lastModified: new Date().toISOString() } : c
    ));
    updateChatOnBackend(chatId, { pinned: nextPinned });
  };

  const isDbId = (value: string | null | undefined) => {
    if (!value) return false;
    return /^[a-f\d]{24}$/i.test(value);
  };

  const getCurrentChatDbId = () => {
    const current = recentChats.find(c => c.id === currentChatId || c.conversationId === currentChatId);
    return current?.dbId;
  };

  const updateMessageOnBackend = async (messageId: string, content: string) => {
    const authToken = getAuthToken();
    const chatDbId = getCurrentChatDbId();
    if (!isAuthenticated || !authToken || !chatDbId || !isDbId(messageId)) return;
    try {
      await fetch(`http://localhost:3001/api/user/chats/${chatDbId}/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
    } catch (error) {
      console.error('Failed to update message on backend:', error);
    }
  };

  // =====================
  // AI Response Generation
  // =====================
  const detectChallenge = (text: string) => {
    const t = text.toLowerCase();
    const triggers = ['defend', 'why', 'how is that', "i disagree", 'not true', 'prove', 'evidence', 'source'];
    return triggers.some((w) => t.includes(w));
  };

  const detectTaskType = (text: string) => {
    const t = text.toLowerCase();

    // Code-related tasks - enhanced detection
    if (t.includes('code') || t.includes('program') || t.includes('script') || t.includes('function') ||
      t.includes('algorithm') || t.includes('debug') || t.includes('fix') || t.includes('optimize') ||
      t.includes('java') || t.includes('python') || t.includes('javascript') || t.includes('c++') ||
      t.includes('c#') || t.includes('php') || t.includes('html') || t.includes('css') ||
      t.includes('sql') || t.includes('react') || t.includes('node') || t.includes('api') ||
      t.includes('write a program') || t.includes('create a program') || t.includes('implement') ||
      t.includes('class') || t.includes('method') || t.includes('variable') || t.includes('loop') ||
      t.includes('array') || t.includes('string') || t.includes('integer') || t.includes('boolean') ||
      t.includes('duplicate') || t.includes('find') || t.includes('search') || t.includes('sort') ||
      t.includes('reverse') || t.includes('swap') || t.includes('fibonacci') || t.includes('prime') ||
      t.includes('factorial') || t.includes('bubble sort') || t.includes('quick sort') ||
      t.includes('binary search') || t.includes('linked list') || t.includes('stack') ||
      t.includes('queue') || t.includes('tree') || t.includes('graph') || t.includes('hash') ||
      t.includes('recursion') || t.includes('iteration') || t.includes('optimization')) {
      return 'coding';
    }

    // Writing tasks
    if (t.includes('write') || t.includes('essay') || t.includes('article') || t.includes('story') ||
      t.includes('email') || t.includes('letter') || t.includes('report') || t.includes('blog')) {
      return 'writing';
    }

    // Analysis tasks
    if (t.includes('analyze') || t.includes('explain') || t.includes('compare') || t.includes('evaluate') ||
      t.includes('review') || t.includes('assess') || t.includes('examine')) {
      return 'analysis';
    }

    // Math tasks
    if (t.includes('calculate') || t.includes('solve') || t.includes('equation') || t.includes('math') ||
      t.includes('statistics') || t.includes('probability') || t.includes('formula')) {
      return 'math';
    }

    // Creative tasks
    if (t.includes('create') || t.includes('design') || t.includes('imagine') || t.includes('brainstorm') ||
      t.includes('idea') || t.includes('creative') || t.includes('art')) {
      return 'creative';
    }

    // Learning/Education
    if (t.includes('learn') || t.includes('teach') || t.includes('tutorial') || t.includes('guide') ||
      t.includes('how to') || t.includes('step by step') || t.includes('explain')) {
      return 'education';
    }

    return 'general';
  };

  const buildSystemPrompt = () => `
You are an advanced AI assistant. Write responses in a clear, ChatGPT-like style:

**Response Style**
- Start with a short, direct answer or summary (1-3 sentences).
- Then add a structured breakdown with bullets or numbered steps only if needed.
- Be concise and avoid repetition. Prefer clarity over verbosity.
- Unless the user explicitly asks for detailed or long answers, keep responses under ~200 words.
- Use markdown, but don't force headings unless they improve readability.
- Use code blocks with syntax highlighting when you provide code.

**Behavior**
- Persona: ${personality}, professional and helpful.
- If uncertain, say so briefly and suggest the next best step.
- For complex topics, explain in simple steps.
- In defensive mode, add brief reasoning and evidence, not long essays.
`;

  const buildUserPrompt = (userMessage: string, wantDefense: boolean, taskType: string) => `
Task: Answer the user's request clearly and succinctly.

Task Type Detected: ${taskType}

User Message: """${userMessage}"""

Instructions:
- Use a short direct answer first, then a brief structured explanation.
- If coding: provide complete working code, then a short explanation.
- If writing: provide the finished content with minimal preface.
- If analysis: provide key points and a short conclusion.
- If math: show steps briefly, then final answer.
- Keep the response concise (around 150-250 words) unless the user asks for more detail.

Return STRICT JSON with keys:
  answer: string (complete response with proper formatting),
  defense: string (reasoning and methodology; empty if not needed),
  hallucination_risk: 'low'|'medium'|'high',
  defense_quality: 'low'|'medium'|'high',
  tone: 'friendly'|'logical'|'playful'|'confident',
  task_type: string (coding|writing|analysis|math|creative|education|general)

${wantDefense ? 'Include defense only if needed, keep it brief.' : 'Include defense only if helpful.'}
Ensure the JSON is valid. No Markdown, no backticks.`;

  const callAIJSON = async (
    systemPrompt: string,
    userPrompt: string,
    rawMessage: string,
    useStreaming = true
  ) => {
    try {
      console.log('🔄 Calling AI API...', { userPrompt: userPrompt.substring(0, 100) + '...', modelId: selectedModel, useStreaming });

      if (useStreaming) {
        return await callAIStream(systemPrompt, userPrompt, rawMessage);
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          message: rawMessage,
          systemPrompt: systemPrompt,
          userPrompt: userPrompt,
          conversationId: currentChatId,
          modelId: selectedModel
        }),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        let errorPayload: any = null;
        let errorText = '';
        try {
          errorPayload = await response.json();
          errorText = JSON.stringify(errorPayload);
        } catch {
          errorText = await response.text();
        }
        if (response.status === 401 && errorPayload?.code === 'GUEST_LOGIN_REQUIRED') {
          setGuestLimit(errorPayload?.limit || 5);
          window.dispatchEvent(new CustomEvent('auth-required', { detail: { limit: errorPayload?.limit || 5 } }));
        }
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`AI API call failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Response:', data);

      // Track analytics
      if (data.usage) {
        trackAnalytics('tokens_used', { tokens: data.usage.totalTokens });
      }

      // Handle different response formats
      if (data && typeof data.reply === 'string') {
        console.log('📝 Using reply field:', data.reply.substring(0, 100) + '...');
        return data.reply;
      } else if (data && typeof data.response === 'string') {
        console.log('📝 Using response field:', data.response.substring(0, 100) + '...');
        return data.response;
      } else if (data && typeof data.message === 'string') {
        console.log('📝 Using message field:', data.message.substring(0, 100) + '...');
        return data.message;
      } else {
        console.warn('⚠️ No valid response field found in API response:', data);
        return 'I apologize, but I received an unexpected response format. Please try again.';
      }
    } catch (e) {
      console.error('💥 callAIJSON Error:', e);
      trackAnalytics('error_occurred', { error: e instanceof Error ? e.message : 'Unknown error' });
      return '';
    }
  };

  const callAIStream = async (systemPrompt: string, userPrompt: string, rawMessage: string) => {
    try {
      console.log('🔄 Starting streaming AI call...');

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          message: rawMessage,
          systemPrompt: systemPrompt,
          userPrompt: userPrompt,
          conversationId: currentChatId,
          modelId: selectedModel
        }),
    });

      if (!response.ok) {
        let errorPayload: any = null;
        try {
          errorPayload = await response.json();
        } catch { }
        if (response.status === 401 && errorPayload?.code === 'GUEST_LOGIN_REQUIRED') {
          setGuestLimit(errorPayload?.limit || 5);
          window.dispatchEvent(new CustomEvent('auth-required', { detail: { limit: errorPayload?.limit || 5 } }));
        }
        throw new Error(`Streaming API call failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let usage = null;

      if (!reader) {
        throw new Error('No response body reader available');
      }

      return new Promise((resolve, reject) => {
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.log('✅ Streaming completed');
                resolve(fullResponse);
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));

                    if (data.type === 'content') {
                      fullResponse += data.content;
                      // Update the last AI message with streaming content
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.sender === 'AI' && lastMessage.isStreaming) {
                          lastMessage.text = fullResponse;
                        }
                        return newMessages;
                      });
                    } else if (data.type === 'done') {
                      usage = data.usage;
                      // Mark streaming as complete
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.sender === 'AI') {
                          lastMessage.isStreaming = false;
                        }
                        return newMessages;
                      });

                      // Track analytics
                      if (usage) {
                        trackAnalytics('tokens_used', { tokens: usage.total_tokens });
                      }

                      resolve(fullResponse);
                      return;
                    } else if (data.type === 'error') {
                      console.error('❌ Streaming error:', data.content);
                      reject(new Error(data.content));
                      return;
                    }
                  } catch (parseError) {
                    console.error('❌ Error parsing streaming data:', parseError);
                  }
                }
              }
            }
          } catch (streamError) {
            console.error('❌ Streaming process error:', streamError);
            reject(streamError);
          }
        };

        processStream();
      });

    } catch (e) {
      console.error('💥 callAIStream Error:', e);
      trackAnalytics('error_occurred', { error: e instanceof Error ? e.message : 'Unknown error' });
      throw e;
    }
  };

  const safeParse = <T,>(raw: string, fallback: T): T => {
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  };

  const normalizeJsonText = (raw: string) =>
    raw
      .trim()
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");

  const parseAIJson = (raw: string) => {
    const normalized = normalizeJsonText(raw);
    const first = normalized.indexOf('{');
    const last = normalized.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) return null;
    const slice = normalized.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  };

  const extractAnswerFromJsonLike = (raw: string) => {
    const normalized = normalizeJsonText(raw);
    const jsonObj = parseAIJson(normalized);
    if (jsonObj && typeof jsonObj.answer === 'string') {
      return { answer: jsonObj.answer, defense: jsonObj.defense, meta: jsonObj };
    }

    const match = normalized.match(
      /"answer"\s*:\s*"([\s\S]*?)"\s*,\s*"(defense|hallucination_risk|defense_quality|tone|task_type)"/
    );
    if (!match) return null;
    try {
      const decoded = JSON.parse(`"${match[1]}"`);
      return { answer: decoded, defense: '' };
    } catch {
      return { answer: match[1], defense: '' };
    }
  };

  const extractPlainAnswer = (raw: string) => {
    const extracted = extractAnswerFromJsonLike(raw);
    return extracted?.answer || raw;
  };

  const generateResponse = async (userMessage: string) => {
    console.log('🚀 Starting generateResponse for:', userMessage.substring(0, 50) + '...');
    const wantDefense = defensiveMode || detectChallenge(userMessage);
    const taskType = detectTaskType(userMessage);
    console.log('📋 Detected task type:', taskType);

    // For coding tasks, use a different approach to get better formatted responses
    if (taskType === 'coding') {
      console.log('💻 Using coding response handler');
      return await generateCodingResponse(userMessage, wantDefense, taskType);
    }

    const sys = buildSystemPrompt();
    const u1 = buildUserPrompt(userMessage, wantDefense, taskType);

    console.log('📡 Calling AI API...');
    // Use regular API call for non-coding tasks to avoid blank responses
    const raw1 = await callAIJSON(sys, u1, userMessage, false);
    console.log('📝 Raw response length:', raw1 ? raw1.length : 0);
    console.log('📝 Raw response preview:', raw1 ? raw1.substring(0, 200) + '...' : 'EMPTY');

    // Parse it as JSON if possible, otherwise use as plain text
    let draft;
    try {
      draft = JSON.parse(raw1 as string);
      console.log('✅ Successfully parsed JSON response');
    } catch {
      const extracted = extractAnswerFromJsonLike(raw1 as string);
      if (extracted?.answer) {
        return {
          text: extracted.answer + (extracted.defense ? `\n\n🛡️ Methodology:\n${extracted.defense}` : ''),
          meta: {
            defenseQuality: extracted.meta?.defense_quality || 'medium',
            hallucinationRisk: extracted.meta?.hallucination_risk || 'low',
            tone: extracted.meta?.tone || personality,
            taskType: extracted.meta?.task_type || taskType
          },
        };
      }

      console.log('⚠️ Failed to parse JSON, using as plain text');
      // If not JSON, treat as plain text response
      return {
        text: extractPlainAnswer(raw1 as string),
        meta: {
          defenseQuality: 'medium' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: taskType
        },
      };
    }

    // If the API did not return the requested JSON, provide a fallback
    if (!draft.answer) {
      console.log('⚠️ No answer field in JSON response, using fallback');
      return {
        text: "I'm here to help with any task! Whether you need coding help, writing assistance, analysis, math solutions, creative ideas, or educational guidance, I'm ready to assist. What would you like to work on?",
        meta: {
          defenseQuality: 'low' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: taskType
        },
      };
    }

    // Optional Pass 2: self-critique to strengthen response
    let final = draft;
    if (wantDefense || taskType === 'analysis') {
      console.log('🔄 Running self-critique...');
      const critiquePrompt = `You wrote this response: ${JSON.stringify(draft)}\nImprove the response: make it more comprehensive, accurate, and helpful. For analysis, provide deeper insights. Return the SAME JSON shape only.`;
      const raw2 = await callAIJSON(sys, critiquePrompt, userMessage, false);
      const improved = safeParse<typeof draft>(raw2, draft);
      final = improved;
    }

    const finalText = [extractPlainAnswer(final.answer), final.defense ? `\n\n🛡️ Methodology:\n${final.defense}` : ''].join('');
    console.log('✅ Final response length:', finalText.length);
    console.log('✅ Final response preview:', finalText.substring(0, 200) + '...');

    return {
      text: finalText,
      meta: {
        defenseQuality: final.defense_quality,
        hallucinationRisk: final.hallucination_risk,
        tone: final.tone || personality,
        taskType: final.task_type || taskType,
      },
    };
  };

  const generateCodingResponse = async (userMessage: string, _wantDefense: boolean, taskType: string) => {
    console.log('💻 Starting generateCodingResponse for:', userMessage.substring(0, 50) + '...');

    const guessLanguage = (text: string) => {
      const t = text.toLowerCase();
      if (t.includes('typescript') || t.includes('tsx')) return 'tsx';
      if (t.includes('react')) return 'tsx';
      if (t.includes('javascript') || t.includes('js') || t.includes('node')) return 'javascript';
      if (t.includes('python')) return 'python';
      if (t.includes('java')) return 'java';
      if (t.includes('c++')) return 'cpp';
      if (t.includes('c#')) return 'csharp';
      if (t.includes('php')) return 'php';
      if (t.includes('html')) return 'html';
      if (t.includes('css')) return 'css';
      if (t.includes('sql')) return 'sql';
      if (t.includes('go')) return 'go';
      if (t.includes('rust')) return 'rust';
      return '';
    };

    const ensureCodeFences = (response: string, langHint: string) => {
      if (!response || response.includes('```')) return response;
      const lines = response.split('\n');
      const codeLike = (line: string) =>
        /^\s*(def |class |function |const |let |var |import |from |#include|public |private |protected |using |package |SELECT |INSERT |UPDATE |DELETE |CREATE |DROP )/i.test(line) ||
        /[;{}]$/.test(line) ||
        /\(\)\s*{/.test(line);

      const firstCodeIndex = lines.findIndex(codeLike);
      if (firstCodeIndex === -1) return response;

      const intro = lines.slice(0, firstCodeIndex).join('\n').trim();
      const code = lines.slice(firstCodeIndex).join('\n').trim();
      const lang = langHint ? langHint : '';

      if (!code) return response;
      if (intro) {
        return `${intro}\n\n\`\`\`${lang}\n${code}\n\`\`\``;
      }
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    };

    const codingPrompt = `You are an expert programming assistant. Respond like ChatGPT:

- Start with a short summary of the approach (1-3 sentences).
- Provide the complete working code in a single code block with syntax highlighting.
- Add a brief, practical explanation after the code.
- Include usage only if it helps clarity. Keep it short.
- Keep explanations concise unless the user asks for more detail.

User Request: ${userMessage}`;

    try {
      console.log('📡 Calling AI API for coding response...');
      // Use regular API call for coding responses to avoid blank responses
      const response = await callAIJSON(codingPrompt, userMessage, userMessage, false);
      console.log('📝 Coding response length:', response ? response.length : 0);
      console.log('📝 Coding response preview:', response ? response.substring(0, 200) + '...' : 'EMPTY');

      let formatted = response as string;
      // If model still returns JSON, extract the answer field.
      try {
        const trimmed = formatted.trim();
        const jsonText = trimmed.startsWith('```') ? trimmed.replace(/```[\w-]*\n?|\n?```/g, '') : trimmed;
        if (jsonText.startsWith('{')) {
          const parsed = JSON.parse(jsonText);
          if (parsed && typeof parsed.answer === 'string') {
            formatted = parsed.answer + (parsed.defense ? `\n\n🛡️ Methodology:\n${parsed.defense}` : '');
          }
        }
      } catch { }

      formatted = ensureCodeFences(formatted, guessLanguage(userMessage));
      return {
        text: formatted as string,
        meta: {
          defenseQuality: 'high' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: taskType
        },
      };
    } catch (error) {
      console.error('❌ Coding response generation error:', error);
      return {
        text: "I apologize, but I encountered an error while generating the coding response. Please try again.",
        meta: {
          defenseQuality: 'low' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: taskType
        },
      };
    }
  };

  const generateResponseWithImage = async (userMessage: string, imageFile: File) => {
    try {
      console.log('🔄 Processing image with AI...');

      const response = await ImageProcessingService.processImage({
        image: imageFile,
        message: userMessage,
        systemPrompt: buildSystemPrompt(),
        conversationId: currentChatId,
        modelId: selectedModel
      });

      return {
        text: response.reply,
        conversationId: response.conversationId,
        chatId: (response as any).chatId,
        title: (response as any).title,
        meta: {
          defenseQuality: 'medium' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: 'image_analysis'
        }
      };
    } catch (error) {
      console.error('💥 Image processing error:', error);
      return {
        text: 'Sorry, I encountered an error while processing the image. Please try again.',
        conversationId: currentChatId,
        meta: {
          defenseQuality: 'low' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: 'image_analysis'
        }
      };
    }
  };

  // =====================
  // Messaging logic
  // =====================
  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedImage) return;

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

    // Save chat immediately with the updated messages
    if (isInitialized && !isAuthenticated) {
      const chatTitle = generateChatTitle(updatedMessages);
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
    if (selectedImage) {
      console.log('🔄 Starting image processing...');
      setUploadingImage(true);

      // Add a small delay to ensure the loader shows
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const response = await generateResponseWithImage(inputValue || 'What do you see in this image?', selectedImage);
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
        resetImage(); // Clear the image after processing
      }
    } else {
      // Handle text only with streaming
      try {
        console.log('🔄 Starting text response generation...');
        const { text, meta } = await generateResponse(userMessage.text);
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

    updateAnalytics(responseText, 'AI');
    setIsTyping(false);

    const authToken = getAuthToken();
    if (authToken && isAuthenticated) {
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


  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };


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

  const exportAllChats = () => {
    const authToken = getAuthToken();
    if (isAuthenticated && authToken) {
      fetch('http://localhost:3001/api/user/export', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
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
          fetch('http://localhost:3001/api/user/chats/import', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              chats: data.chats || [],
              settings: data.settings || null
            })
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


  // Analytics tracking function
  const trackAnalytics = async (event: string, data?: any) => {
    try {
      await fetch('http://localhost:3001/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ event, data })
      });
    } catch (error) {
      console.error('Failed to track analytics:', error);
    }
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

  const copyMessageById = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    setCopiedMessageId(messageId);
    await copyText(message.text);
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

    // Show a regenerating placeholder in-place
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, text: 'Regenerating...', isStreaming: true }
        : m
    ));

    try {
      const { text, meta } = await generateResponse(userMessage.text);

      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? {
              ...m,
              text: extractPlainAnswer(text as string),
              meta: meta,
              isStreaming: false
            }
          : m
      ));
      updateMessageOnBackend(messageId, text as string);
      updateAnalytics(text as string, 'AI');
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

  // =====================
  // Markdown Renderer
  // =====================
  const MarkdownRenderer = ({ content, isStreaming }: { content: string, isStreaming?: boolean }) => {
    // Special case for "AI is thinking..." - show as plain text with animation
    if (content === 'Thinking' && isStreaming) {
      return (
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                animationDelay: '0ms',
                backgroundColor: getCurrentTheme().primaryColor
              }}
            ></div>
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                animationDelay: '150ms',
                backgroundColor: getCurrentTheme().secondaryColor
              }}
            ></div>
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                animationDelay: '300ms',
                backgroundColor: getCurrentTheme().accentColor
              }}
            ></div>
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code: ({ className, children, ...props }: any) => {
              const inline = !className?.includes('language-');
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';

              if (!inline && language) {
                return (
                  <div className="relative my-4">
                    <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-700">
                      <span className="text-sm text-gray-300 font-medium">{language}</span>
                      <Button
                        size="sm"
                        onClick={() => copyCodeBlock(extractTextFromNode(children).replace(/\n$/, ''))}
                        className="h-6 px-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 border-0"
                      >
                        {copiedCodeKey === extractTextFromNode(children).replace(/\n$/, '') ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="bg-gray-900 rounded-b-lg overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              }

              return (
                <code className="bg-gray-800 text-gray-200 px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <div className="my-4">
                {children}
              </div>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-4">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="bg-gray-800 px-4 py-2 text-left text-sm font-medium text-gray-200 border-b border-gray-700">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                {children}
              </td>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {children}
              </a>
            ),
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-white mt-6 mb-4 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold text-white mt-5 mb-3">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-white mt-4 mb-2">
                {children}
              </h3>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside my-2 space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside my-2 space-y-1">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-300">
                {children}
              </li>
            ),
            p: ({ children }) => (
              <p className="my-2 leading-relaxed">
                {children}
                {isStreaming && (
                  <span className="inline-block w-2 h-5 bg-blue-400 ml-1 animate-pulse"></span>
                )}
              </p>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  // =====================
  // Render
  // =====================
  return (
    <TooltipProvider>
      {/* Full Screen Chat Interface */}
      <div className="h-full flex flex-col relative">
        {/* Chat Header */}
        <div className="p-4 sm:p-6">
          <div className="chat-header-neo">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center ai-glow"
                style={{
                  background: `linear-gradient(135deg, ${getCurrentTheme().primaryColor}, ${getCurrentTheme().secondaryColor}, ${getCurrentTheme().accentColor})`
                }}
              >
                <AIIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Adiva AI</h2>
                <p className="text-blue-200 text-xs sm:text-sm">Ready to assist with any task</p>
              </div>
            </div>
          </div>
        </div>

        {/* Model Selector Dropdown */}
        {showModelSelector && (
          <div className="absolute top-20 right-6 z-50 glass-dark border border-white/20 rounded-2xl shadow-2xl p-6 min-w-80">
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
        />


        {/* Keyboard Shortcuts Help */}
        {showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-dark border border-white/20 rounded-2xl shadow-2xl p-6 min-w-96 max-w-lg">
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
          <div className="absolute top-20 right-6 z-50 glass-dark border border-white/20 rounded-2xl shadow-2xl p-6 min-w-80">
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
            <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
              <div
                className="analytics-panel w-full max-w-5xl max-h-[90vh] overflow-y-auto glass-dark border border-white/20 rounded-2xl shadow-2xl p-4 sm:p-6"
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
                  <div className="relative z-10 flex items-center justify-between p-5">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white">Analytics</h3>
                      <p className="text-xs sm:text-sm text-blue-100">Session insights and performance</p>
                    </div>
                    <div className="flex items-center gap-3">
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
                        title="Back to Chat"
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
                            fetch('http://localhost:3001/api/user/chats', {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${authToken}`,
                                'Content-Type': 'application/json'
                              }
                            })
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
            <div
              ref={messagesScrollRef}
              onScroll={handleMessagesScroll}
              className="h-full overflow-y-auto p-4 sm:p-8 relative"
            >
              <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 chat-stream">
                {messages.map((m) => {
                  const isAssistantMessage = m.sender === "AI" || m.isAI;
                  return (
                  <div
                    key={m.id}
                    className={cn(
                      "relative overflow-visible flex gap-3 sm:gap-6 items-start group", // relative + overflow-visible is important
                      m.sender === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Left avatar for AI */}
                    {isAssistantMessage && (
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ai-glow"
                        style={{
                          background: `linear-gradient(135deg, ${getCurrentTheme().primaryColor}, ${getCurrentTheme().secondaryColor}, ${getCurrentTheme().accentColor})`
                        }}
                      >
                        <AIIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className={cn(
                        "max-w-[85%] sm:max-w-[75%] p-4 sm:p-6 rounded-2xl text-sm sm:text-base relative shadow-lg message-bubble-ai chat-bubble-neo chat-card group",
                        editingMessage === m.id ? "w-full" : "",
                        m.sender === "user"
                          ? "chat-card-user text-white rounded-br-md"
                          : "chat-card-ai text-white rounded-bl-md"
                      )}
                    >
                      {/* Show image if present */}
                      {m.imageUrl && (
                        <div className="mb-4">
                          <img
                            src={m.imageUrl}
                            alt="User uploaded image"
                            className="max-w-full max-h-64 rounded-lg object-cover shadow-lg"
                          />
                        </div>
                      )}

                      {/* Message Content */}
                      {editingMessage === m.id ? (
                        <div className="space-y-3 w-full">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full min-h-[180px] p-4 bg-black/30 border border-white/20 rounded-xl text-white resize-none focus:outline-none focus:ring-2 focus:ring-white/20"
                            rows={5}
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip content="Send">
                              <Button
                                size="sm"
                                onClick={saveEditedMessage}
                                className="h-8 w-8 p-0 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30"
                              >
                                <SendIcon className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Cancel">
                              <Button
                                size="sm"
                                onClick={cancelEdit}
                                className="h-8 w-8 p-0 rounded-full bg-gray-500/20 hover:bg-gray-500/30 text-gray-200 border border-gray-400/30"
                              >
                                ×
                              </Button>
                            </Tooltip>
                          </div>
                        </div>
                      ) : (
                        <div className="leading-relaxed">
                          {isAssistantMessage ? (
                            (() => {
                              if (m.isStreaming && m.text === 'Regenerating...') {
                                return (
                                  <div className="flex items-center gap-3 py-2">
                                    <span className="text-sm text-blue-200">Regenerating</span>
                                    <div className="flex space-x-1">
                                      <div
                                        className="w-2 h-2 rounded-full animate-bounce"
                                        style={{
                                          animationDelay: '0ms',
                                          backgroundColor: getCurrentTheme().primaryColor
                                        }}
                                      ></div>
                                      <div
                                        className="w-2 h-2 rounded-full animate-bounce"
                                        style={{
                                          animationDelay: '150ms',
                                          backgroundColor: getCurrentTheme().secondaryColor
                                        }}
                                      ></div>
                                      <div
                                        className="w-2 h-2 rounded-full animate-bounce"
                                        style={{
                                          animationDelay: '300ms',
                                          backgroundColor: getCurrentTheme().accentColor
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              }
                              const shouldCollapse = !m.isStreaming && m.text && m.text.length > 1200;
                              const isExpanded = expandedMessageIds.has(m.id);
                              const visibleText = shouldCollapse && !isExpanded
                                ? `${m.text.slice(0, 1200)}\n\n…`
                                : m.text;

                              return (
                                <>
                                  <MarkdownRenderer content={visibleText} isStreaming={m.isStreaming} />
                                  {shouldCollapse && !m.isStreaming && (
                                    <div className="mt-2">
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          toggleExpandMessage(m.id);
                                        }}
                                        className="h-7 px-3 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg transition-all duration-200"
                                      >
                                        {isExpanded ? 'Show less' : 'Show more'}
                                      </Button>
                                    </div>
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            <div className="whitespace-pre-line">
                              {m.text}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Actions - ChatGPT-style hover icons */}
                      {isAssistantMessage && !m.isStreaming && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Tooltip content={copiedMessageId === m.id ? "Copied" : "Copy"}>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                copyMessageById(m.id);
                              }}
                              className="h-7 w-7 p-0 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg transition-all duration-200"
                            >
                              {copiedMessageId === m.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </Tooltip>
                          <Tooltip content={regeneratingMessageId === m.id ? "Regenerating..." : "Regenerate"}>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                regenerateMessage(m.id);
                              }}
                              className="h-7 w-7 p-0 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg transition-all duration-200"
                              disabled={regeneratingMessageId === m.id}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Like">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                likeMessage(m.id);
                              }}
                              className={`h-7 w-7 p-0 border rounded-lg transition-all duration-200 ${
                                m.liked
                                  ? 'bg-green-500/20 text-green-200 border-green-400/30'
                                  : 'bg-white/5 hover:bg-white/10 text-white border-white/20'
                              }`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Dislike">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                dislikeMessage(m.id);
                              }}
                              className={`h-7 w-7 p-0 border rounded-lg transition-all duration-200 ${
                                m.disliked
                                  ? 'bg-red-500/20 text-red-200 border-red-400/30'
                                  : 'bg-white/5 hover:bg-white/10 text-white border-white/20'
                              }`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        </div>
                      )}

                      {/* User message edit actions */}
                      {!isAssistantMessage && !m.isStreaming && editingMessage !== m.id && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Tooltip content="Edit">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                editMessage(m.id, m.text);
                              }}
                              className="h-7 w-7 p-0 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-full transition-all duration-200 flex items-center justify-center"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Tooltip>
                        </div>
                      )}

                      {m.isAI && m.meta?.defenseQuality && !m.isStreaming && (
                        <>
                          <div className="mt-4 text-sm text-blue-300 border-t border-white/20 pt-4">
                            <span>🧠 Tone: {m.meta?.tone || 'default'}</span>
                            <span className="mx-3">•</span>
                            <span>🛡️ Defense: {m.meta.defenseQuality}</span>
                            <span className="mx-3">•</span>
                            <span>🎯 Risk: {m.meta.hallucinationRisk}</span>
                            {m.meta.taskType && (
                              <>
                                <span className="mx-3">•</span>
                                <span>📋 Task: {m.meta.taskType}</span>
                              </>
                            )}
                          </div>
                          {/* <div className="absolute -top-3 -right-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-medium ai-glow">
                              AI
                          </div> */}
                        </>
                      )}

                      {/* Speech Button for AI Messages - only show when not streaming */}
                      {isAssistantMessage && speechEnabled && !m.isStreaming && (
                        <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-300">Language: {availableLanguages.find(l => l.code === speechLanguage)?.name.split(' ')[0] || 'EN'}</span>
                            <span className="text-xs text-blue-300">|</span>
                            <span className="text-xs text-blue-300">Status: {isSpeaking ? 'Speaking' : 'Ready'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSpeaking ? (
                              <Button
                                size="sm"
                                onClick={stopSpeaking}
                                className="h-8 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 rounded-lg transition-all duration-200"
                              >
                                <VolumeX className="h-4 w-4" />
                                Stop
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  console.log('🔊 Speak button clicked');
                                  console.log('🔊 Message text:', m.text.substring(0, 100) + '...');
                                  console.log('🔊 Selected language:', speechLanguage);
                                  console.log('🔊 Speech enabled:', speechEnabled);
                                  console.log('🔊 Speech synthesis available:', 'speechSynthesis' in window);
                                  console.log('🔊 Synthesis ref:', synthesisRef.current);
                                  speakText(m.text, speechLanguage);
                                }}
                                className="h-8 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-lg transition-all duration-200"
                              >
                                <Volume2 className="h-4 w-4" />
                                Speak
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {m.sender === "user" && (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 ai-glow">
                        <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                    )}
                  </div>
                )})}

              

                {error && (
                  <div className="flex items-center gap-3 text-sm text-red-300 bg-red-500/20 border border-red-400/30 p-4 rounded-xl">
                    <span>⚠️ {error}</span>
                    <Button
                      size="sm"
                      className="h-8 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 rounded-lg transition-all duration-200"
                      onClick={handleSendMessage}
                      disabled={isTyping || retryCount > 2}
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />

            </div>
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

        {/* Input Area - Only show when not in analytics mode */}
        {!showAnalytics && (
          <div className="p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
              {!isAuthenticated && guestLimit !== null && (
                <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 backdrop-blur-xl px-4 py-3 text-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
                  <div className="text-sm">
                    <span className="font-semibold">Guest limit reached.</span>{' '}
                    You can send up to {guestLimit} messages without logging in.
                  </div>
                  <Button
                    size="sm"
                    className="h-9 px-4 bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border border-amber-300/30 rounded-lg"
                    onClick={() => window.dispatchEvent(new CustomEvent('auth-required', { detail: { limit: guestLimit } }))}
                  >
                    Sign in to continue
                  </Button>
                </div>
              )}
              {/* Quick Actions */}
              {/* <div className="grid grid-cols-4 gap-3 mb-6">
                {quickActions.slice(0, 4).map((qa) => (
                  <Button
                    key={qa.label}
                    onClick={() => handleQuickAction(qa.query)}
                    disabled={isTyping}
                    className="text-white border text-sm h-12 rounded-xl font-medium transition-all duration-300 quick-action-btn btn-ai hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${getCurrentTheme().primaryColor}20, ${getCurrentTheme().secondaryColor}20)`,
                      borderColor: getCurrentTheme().primaryColor,
                      boxShadow: `0 2px 8px ${getCurrentTheme().primaryColor}20`
                    }}
                  >
                    {qa.label}
                  </Button>
                ))}
              </div> */}
              {/* <div className="grid grid-cols-4 gap-3 mb-6">
                {quickActions.slice(4, 8).map((qa) => (
                  <Button
                    key={qa.label}
                    onClick={() => handleQuickAction(qa.query)}
                    disabled={isTyping}
                    className="text-white border text-sm h-12 rounded-xl font-medium transition-all duration-300 quick-action-btn btn-ai hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${getCurrentTheme().primaryColor}20, ${getCurrentTheme().secondaryColor}20)`,
                      borderColor: getCurrentTheme().primaryColor,
                      boxShadow: `0 2px 8px ${getCurrentTheme().primaryColor}20`
                    }}
                  >
                    {qa.label}
                  </Button>
                ))}
              </div> */}

              {/* ChatGPT-style Input Container with Integrated Image Upload */}
              <div className="relative">
                <div className="flex items-end gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl transition-all duration-300 focus-within:border-white/20 focus-within:shadow-2xl ring-1 ring-white/5 chat-input-dock">
                  <div className="flex-1 min-h-[52px] flex flex-col">
                    {/* Image Preview - Show inside input area when image is selected */}
                    {imagePreview && (
                      <div className="mb-2 p-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg w-fit">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-blue-300 flex items-center gap-1">
                            <span className="text-xs">📷</span>
                            Image:
                          </span>
                          <Button
                            onClick={handleImageRemove}
                            size="sm"
                            className="h-4 w-4 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 transition-all duration-200 hover:scale-110"
                            disabled={isUploadingImage}
                          >
                            <span className="text-xs">×</span>
                          </Button>
                        </div>
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-w-32 max-h-16 rounded object-cover shadow-sm cursor-pointer hover:opacity-80 transition-opacity duration-200"
                            onClick={() => setShowImagePopup(true)}
                            title="Click to view full size"
                          />
                          {isUploadingImage && (
                            <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center">
                              <div className="flex flex-col items-center gap-1 text-white">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span className="text-xs">Processing...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {imagePreview && !selectedModel.startsWith('claude-') && (
                      <div className="mb-2 text-[11px] text-blue-300/80">
                        Tip: For image analysis, choose a Adiva 4.0 Sonnet model in Settings.
                      </div>
                    )}

                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={selectedImage ? "Describe what you want to know about this image..." : "Message Adiva AI..."}
                      className="w-full bg-transparent border-0 text-white text-sm sm:text-base placeholder:text-white/60 focus:ring-0 focus:outline-none resize-none min-h-[24px] max-h-[200px] py-2 sm:py-3 px-1 leading-relaxed"
                      style={{
                        '--tw-ring-color': 'transparent',
                        lineHeight: '1.5'
                      } as React.CSSProperties}
                      rows={1}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Help Button */}
                    <Tooltip content="Keyboard Shortcuts (Ctrl+?)">
                      <Button
                        onClick={() => setShowShortcuts(true)}
                        disabled={isTyping || isUploadingImage}
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}
                        title="Keyboard Shortcuts"
                      >
                        <span className="text-xs">?</span>
                      </Button>
                    </Tooltip>

                    {/* Image Upload Button */}
                    <Tooltip content={selectedImage ? "Change Image" : "Upload Image"}>
                      <Button
                        onClick={() => document.getElementById('image-upload')?.click()}
                        disabled={isTyping || isUploadingImage}
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: selectedImage
                            ? `linear-gradient(135deg, #10b981, #059669)`
                            : isUploadingImage
                              ? `linear-gradient(135deg, #f59e0b, #d97706)`
                              : `rgba(255, 255, 255, 0.1)`,
                          border: selectedImage || isUploadingImage ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'white'
                        }}
                        // title={selectedImage ? "Change Image" : "Upload Image"}
                      >
                        {isUploadingImage ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : selectedImage ? (
                          <span className="text-xs">📷</span>
                        ) : (
                          <span className="text-xs">📷</span>
                        )}
                      </Button>
                    </Tooltip>

                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file type
                          if (!file.type.startsWith('image/')) {
                            alert('Please select a valid image file');
                            return;
                          }

                          // Validate file size (max 10MB)
                          if (file.size > 10 * 1024 * 1024) {
                            alert('Image size must be less than 10MB');
                            return;
                          }

                          handleImageSelect(file);
                        }
                      }}
                      className="hidden"
                      disabled={isTyping || isUploadingImage}
                    />

                    <Tooltip content="Voice input">
                      <Button
                        onClick={toggleVoiceInput}
                        disabled={isTyping}
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-200 hover:scale-110"
                        style={{
                          background: isListening
                            ? `linear-gradient(135deg, #ef4444, #ec4899)`
                            : `rgba(255, 255, 255, 0.1)`,
                          border: isListening ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                          color: isListening ? 'white' : 'rgba(255, 255, 255, 0.7)'
                        }}
                        aria-pressed={isListening}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    </Tooltip>

                    <Button
                      onClick={handleSendMessage}
                      disabled={(!inputValue.trim() && !selectedImage) || isTyping || isUploadingImage}
                      size="sm"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: (!inputValue.trim() && !selectedImage) || isTyping || isUploadingImage
                          ? 'rgba(255, 255, 255, 0.1)'
                          : `linear-gradient(135deg, ${getCurrentTheme().primaryColor}, ${getCurrentTheme().secondaryColor})`,
                        border: 'none',
                        color: 'white'
                      }}
                      aria-label="Send message"
                    >
                      {isUploadingImage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="relative w-full max-w-md glass-dark border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Delete Chat</h3>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 transition-all duration-200 hover:scale-110"
                >
                  <span className="text-sm">×</span>
                </Button>
              </div>
              <p className="text-sm text-white/80 mb-4">
                This will permanently delete the chat
                {deleteConfirmTitle ? ` “${deleteConfirmTitle}”` : ''}. This action cannot be undone.
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
        )}

        {/* Image Preview Popup Modal */}
        {showImagePopup && imagePreview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowImagePopup(false)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-lg">📷</span>
                  Image Preview
                </h3>
                <Button
                  onClick={() => setShowImagePopup(false)}
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 transition-all duration-200 hover:scale-110"
                >
                  <span className="text-sm">×</span>
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
              <div className="p-4 border-t border-white/10 flex items-center justify-between">
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCopyFallback(false)}
          >
            <div
              className="relative max-w-2xl w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-4"
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
