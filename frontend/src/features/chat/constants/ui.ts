import type { LanguageOption, ThemeOption } from '@/features/chat/types/chat';

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
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
];

export const AVAILABLE_THEMES: ThemeOption[] = [
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
