import crypto from 'crypto';
import GuestUsage from '../models/GuestUsage.js';
import AdminSettings from '../models/AdminSettings.js';

const COOKIE_NAME = 'guest_id';
const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

const setGuestCookie = (res, guestId) => {
  res.cookie(COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
};

export const ensureGuest = async (req, res) => {
  const cookies = parseCookies(req.headers.cookie || '');
  let guestId = cookies[COOKIE_NAME];
  if (!guestId) {
    guestId = crypto.randomUUID();
    setGuestCookie(res, guestId);
  }
  const usage = await GuestUsage.getOrCreate(guestId);
  return { guestId, usage };
};

export const enforceGuestChatLimit = async (req, res) => {
  const { guestId, usage } = await ensureGuest(req, res);
  const adminSettings = await AdminSettings.getSettings();
  const maxChats = adminSettings.settings.guestLimits?.maxChats ?? 5;

  if (usage.chatCount >= maxChats) {
    return { allowed: false, guestId, usage, maxChats };
  }

  usage.chatCount += 1;
  usage.lastSeenAt = new Date();
  await usage.save();
  return { allowed: true, guestId, usage, maxChats };
};

export const guestLimitResponse = (res, maxChats = 5) => {
  return res.status(401).json({
    error: 'Guest limit reached. Please login to continue.',
    code: 'GUEST_LOGIN_REQUIRED',
    limit: maxChats
  });
};
