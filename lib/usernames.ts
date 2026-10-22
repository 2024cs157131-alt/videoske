// Usernames are unique (one account each), lowercase, 3–20 letters/numbers/underscore.
const RESERVED = new Set([
  'admin', 'administrator', 'vidaake', 'videoske', 'support', 'help', 'official', 'staff', 'team', 'mod', 'moderator',
  'root', 'system', 'api', 'login', 'register', 'settings', 'wallet', 'verify', 'upload', 'new', 'live', 'chat',
  'notifications', 'analytics', 'terms', 'paystack', 'mpesa', 'safaricom', 'null', 'undefined', 'me', 'you',
]);

export const normalizeUsername = (u: unknown) => String(u ?? '').trim().replace(/^@/, '').toLowerCase();

/** Error message, or null if the username is acceptable (availability is checked separately). */
export function usernameProblem(u: string): string | null {
  if (!/^[a-z0-9_]{3,20}$/.test(u)) return 'Username must be 3–20 letters, numbers or _.';
  if (/^_|_$/.test(u) || u.includes('__')) return 'Username can’t start or end with _ or have __.';
  if (RESERVED.has(u)) return 'That username is reserved – please choose another.';
  return null;
}
