import { API_BASE_URL } from '@/shared/config/api';

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

export const chatApi = {
  fetchUserChats: (token: string) =>
    fetch(`${API_BASE_URL}/user/chats`, { headers: authHeaders(token) }),

  fetchUserAnalytics: (token: string) =>
    fetch(`${API_BASE_URL}/user/analytics`, { headers: authHeaders(token) }),

  fetchUserSettings: (token: string) =>
    fetch(`${API_BASE_URL}/user/settings`, { headers: authHeaders(token) }),

  saveUserSettings: (token: string, payload: unknown) =>
    fetch(`${API_BASE_URL}/user/settings`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    }),

  fetchAiModels: () => fetch(`${API_BASE_URL}/ai-models`),

  fetchUserChatById: (token: string, chatDbId: string) =>
    fetch(`${API_BASE_URL}/user/chats/${chatDbId}`, { headers: authHeaders(token) }),

  deleteUserChatById: (token: string, chatDbId: string) =>
    fetch(`${API_BASE_URL}/user/chats/${chatDbId}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    }),

  updateUserChatById: (token: string, chatDbId: string, payload: unknown) =>
    fetch(`${API_BASE_URL}/user/chats/${chatDbId}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    }),

  updateUserChatMessage: (token: string, chatDbId: string, messageId: string, payload: unknown) =>
    fetch(`${API_BASE_URL}/user/chats/${chatDbId}/messages/${messageId}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    }),

  sendChatMessage: (token: string | null, payload: unknown) =>
    fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    }),

  streamChatMessage: (token: string | null, payload: unknown) =>
    fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    }),

  exportUserData: (token: string) =>
    fetch(`${API_BASE_URL}/user/export`, { headers: authHeaders(token) }),

  importUserChats: (token: string, payload: unknown) =>
    fetch(`${API_BASE_URL}/user/chats/import`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    }),

  trackAnalytics: (event: string, data?: unknown) =>
    fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data })
    }),

  deleteAllUserChats: (token: string) =>
    fetch(`${API_BASE_URL}/user/chats`, {
      method: 'DELETE',
      headers: authHeaders(token)
    }),

  executeTool: (token: string | null, payload: unknown) =>
    fetch(`${API_BASE_URL}/tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
};
