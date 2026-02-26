const viteMeta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
const fromBase = viteMeta.env?.VITE_API_BASE_URL;
const fromOrigin = viteMeta.env?.VITE_API_ORIGIN;
const fallbackOrigin = 'http://localhost:3001';
const raw = fromBase || (fromOrigin ? `${fromOrigin}/api` : `${fallbackOrigin}/api`);
const API_BASE_URL = raw.replace(/\/+$/, '');

export { API_BASE_URL };
export const OAUTH_BASE_URL = API_BASE_URL;
