const viteMeta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
const fromBase = viteMeta.env?.VITE_API_BASE_URL;
const fromOrigin = viteMeta.env?.VITE_API_ORIGIN;
const isLocalHost = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const fallbackOrigin = isLocalHost ? 'http://localhost:3001' : 'https://adiva-ai.onrender.com';
const raw = fromBase || (fromOrigin ? `${fromOrigin}/api` : `${fallbackOrigin}/api`);
const API_BASE_URL = raw.replace(/\/+$/, '');

export { API_BASE_URL };
export const OAUTH_BASE_URL = API_BASE_URL;
