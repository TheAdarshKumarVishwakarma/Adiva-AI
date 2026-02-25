import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { chatApi } from '@/features/chat/api/chatApi';
import type { Analytics, ChatSession, Message } from '@/features/chat/types/chat';

interface UseChatSessionParams {
  isAuthenticated: boolean;
  token: string | null;
  isInitialized: boolean;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setAnalytics: Dispatch<SetStateAction<Analytics>>;
  setInputValue: (value: string) => void;
  setIsTyping: (value: boolean) => void;
  setError: (value: string | null) => void;
  setRetryCount: (value: number) => void;
  setShowDeleteConfirm: (value: boolean) => void;
  setDeleteConfirmText: (value: string) => void;
  setDeleteConfirmChatId: (value: string | null) => void;
  setDeleteConfirmTitle: (value: string) => void;
  normalizeBackendChat: (chat: any) => ChatSession;
  buildAnalyticsFromChats: (chats: ChatSession[]) => Analytics;
  createWelcomeMessage: () => Message;
}

const generateChatTitle = (messages: Message[]): string => {
  const firstUserMessage = messages.find((m) => m.sender === 'user');
  if (firstUserMessage) {
    const text = firstUserMessage.text.trim();
    return text.length > 50 ? `${text.substring(0, 50)}...` : text;
  }
  return 'New Chat';
};

const isDbId = (value: string | null | undefined) => {
  if (!value) return false;
  return /^[a-f\d]{24}$/i.test(value);
};

export const useChatSession = ({
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
}: UseChatSessionParams) => {
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>(() => `chat_${Date.now()}`);

  const getAuthToken = () => token || localStorage.getItem('token');

  const loadCachedChats = () => {
    try {
      const savedChats = localStorage.getItem('chatAI_recentChats');
      if (savedChats) {
        const parsed = JSON.parse(savedChats) as ChatSession[];
        setRecentChats(parsed);
        setAnalytics(buildAnalyticsFromChats(parsed));
      }
    } catch {
      // ignore cache parse errors
    }
  };

  const cacheChats = (chats: ChatSession[]) => {
    try {
      localStorage.setItem('chatAI_recentChats', JSON.stringify(chats));
    } catch {
      // ignore cache write errors
    }
  };

  const fetchUserChats = async (authToken: string, preferredConversationId?: string) => {
    try {
      const response = await chatApi.fetchUserChats(authToken);
      if (!response.ok) throw new Error('Failed to load chats');
      const data = await response.json();
      const chats = Array.isArray(data.chats) ? data.chats.map(normalizeBackendChat) : [];
      setRecentChats(chats);
      setAnalytics(buildAnalyticsFromChats(chats));
      cacheChats(chats);

      const targetId = preferredConversationId || currentChatId;
      const current = chats.find((c: ChatSession) => c.id === targetId || c.conversationId === targetId);
      if (current) {
        setMessages(current.messages);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      loadCachedChats();
    }
  };

  const saveCurrentChat = () => {
    if (isAuthenticated) return;
    if (!isInitialized) return;

    const hasUserMessages = messages.some((m) => m.sender === 'user');
    if (!hasUserMessages) return;

    const chatTitle = generateChatTitle(messages);
    const nowIso = new Date().toISOString();
    const chatSession: ChatSession = {
      id: currentChatId,
      title: chatTitle,
      messages: [...messages],
      createdAt: nowIso,
      lastModified: nowIso
    };

    setRecentChats((prev) => {
      const existingIndex = prev.findIndex((chat) => chat.id === currentChatId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = chatSession;
        return updated;
      }
      return [chatSession, ...prev].slice(0, 10);
    });
  };

  const startNewChat = () => {
    const hasUserMessages = messages.some((m) => m.sender === 'user');
    if (hasUserMessages) {
      saveCurrentChat();
    }

    const newChatId = `chat_${Date.now()}`;
    setCurrentChatId(newChatId);
    setMessages([createWelcomeMessage()]);
    setAnalytics({
      totalMessages: 0,
      userMessages: 0,
      AIMessages: 0,
      popularTopics: {},
      sessionStart: new Date().toISOString()
    });
    setInputValue('');
    setIsTyping(false);
    setError(null);
    setRetryCount(0);
  };

  const loadChat = (chatId: string) => {
    const hasUserMessages = messages.some((m) => m.sender === 'user');
    if (hasUserMessages) {
      saveCurrentChat();
    }

    const chatToLoad = recentChats.find((chat) => chat.id === chatId);
    if (!chatToLoad) return;

    const loadFromBackend = async () => {
      const authToken = getAuthToken();
      if (!authToken || !chatToLoad.dbId) return false;

      try {
        const response = await chatApi.fetchUserChatById(authToken, chatToLoad.dbId);
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

    setInputValue('');
    setIsTyping(false);
    setError(null);
    setRetryCount(0);
  };

  const deleteChat = (chatId: string) => {
    const target = recentChats.find((chat) => chat.id === chatId);
    const authToken = getAuthToken();

    if (isAuthenticated && authToken && target?.dbId) {
      chatApi.deleteUserChatById(authToken, target.dbId).catch((error) => {
        console.error('Failed to delete chat from backend:', error);
      });
    }

    setRecentChats((prev) => prev.filter((chat) => chat.id !== chatId));

    if (chatId === currentChatId) {
      startNewChat();
    }
  };

  const requestDeleteChat = (chatId: string) => {
    const target = recentChats.find((chat) => chat.id === chatId);
    setDeleteConfirmChatId(chatId);
    setDeleteConfirmTitle(target?.title || '');
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const updateChatOnBackend = async (chatId: string, updates: any) => {
    const authToken = getAuthToken();
    const target = recentChats.find((chat) => chat.id === chatId);
    if (!isAuthenticated || !authToken || !target?.dbId) return;

    try {
      await chatApi.updateUserChatById(authToken, target.dbId, updates);
    } catch (error) {
      console.error('Failed to update chat on backend:', error);
    }
  };

  const renameChat = (chatId: string) => {
    const chat = recentChats.find((c) => c.id === chatId);
    const currentTitle = chat?.title || '';
    const nextTitle = prompt('Rename chat', currentTitle);
    if (nextTitle === null) return;

    const trimmed = nextTitle.trim();
    if (!trimmed) return;

    setRecentChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: trimmed, lastModified: new Date().toISOString() } : c))
    );
    updateChatOnBackend(chatId, { title: trimmed });
  };

  const togglePinChat = (chatId: string) => {
    const target = recentChats.find((c) => c.id === chatId);
    const nextPinned = !target?.pinned;
    setRecentChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, pinned: nextPinned, lastModified: new Date().toISOString() } : c))
    );
    updateChatOnBackend(chatId, { pinned: nextPinned });
  };

  const getCurrentChatDbId = () => {
    const current = recentChats.find((c) => c.id === currentChatId || c.conversationId === currentChatId);
    return current?.dbId;
  };

  const updateMessageOnBackend = async (messageId: string, content: string) => {
    const authToken = getAuthToken();
    const chatDbId = getCurrentChatDbId();
    const safeContent = content.trim();
    if (!isAuthenticated || !authToken || !chatDbId || !isDbId(messageId) || !safeContent) return;

    try {
      await chatApi.updateUserChatMessage(authToken, chatDbId, messageId, { content: safeContent });
    } catch (error) {
      console.error('Failed to update message on backend:', error);
    }
  };

  return {
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
  };
};
