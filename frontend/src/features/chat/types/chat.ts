export type Personality = 'friendly' | 'logical' | 'playful' | 'confident';

export interface Message {
  id: string;
  text: string;
  responseVersions?: string[];
  activeResponseIndex?: number;
  sender: 'user' | 'AI';
  timestamp: string;
  isAI?: boolean;
  imageUrl?: string;
  isStreaming?: boolean;
  liked?: boolean;
  disliked?: boolean;
  meta?: {
    defenseQuality?: 'low' | 'medium' | 'high';
    hallucinationRisk?: 'low' | 'medium' | 'high';
    tone?: Personality;
    taskType?: string;
  };
}

export interface Analytics {
  totalMessages: number;
  userMessages: number;
  AIMessages: number;
  popularTopics: { [key: string]: number };
  sessionStart: string;
  topTopics?: Array<{ name: string; value: number }>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  lastModified: string;
  pinned?: boolean;
  dbId?: string;
  conversationId?: string;
}

export interface AIchatProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showAnalytics: boolean;
  setShowAnalytics: (show: boolean) => void;
  onSidebarThemeChange?: (enabled: boolean) => void;
  onThemeChange?: (theme: string) => void;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export interface ThemeOption {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}
