const viteMeta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
const API_ORIGIN = viteMeta.env?.VITE_API_ORIGIN || 'http://localhost:3001';

export const API_BASE_URL = `${API_ORIGIN}/api`;
export const OAUTH_BASE_URL = API_BASE_URL;
