import type { CookieData, AuthState } from '../types.js';

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours for session cookies
const REFRESH_THRESHOLD_MS = 2 * 60 * 60 * 1000; // Refresh if < 2 hours remaining

export class StateValidator {
  validateCookies(cookies: CookieData[]): CookieData[] {
    const now = Date.now() / 1000;
    return cookies.filter(cookie => {
      // Session cookies (expires === -1 or 0) are always valid in this check
      if (cookie.expires <= 0) return true;
      // Persistent cookies: check expiry
      return cookie.expires > now;
    });
  }

  isSessionFresh(cookies: CookieData[]): boolean {
    if (cookies.length === 0) return false;

    const now = Date.now() / 1000;
    // Check if any persistent cookies are near expiry
    const persistentCookies = cookies.filter(c => c.expires > 0);
    if (persistentCookies.length === 0) return true; // Only session cookies

    const earliestExpiry = Math.min(...persistentCookies.map(c => c.expires));
    const remainingMs = (earliestExpiry - now) * 1000;
    return remainingMs > REFRESH_THRESHOLD_MS;
  }

  getAuthState(cookies: CookieData[]): AuthState {
    const valid = this.validateCookies(cookies);
    if (valid.length === 0) {
      return { isValid: false, needsRefresh: true };
    }

    const persistentCookies = valid.filter(c => c.expires > 0);
    const earliestExpiry = persistentCookies.length > 0
      ? Math.min(...persistentCookies.map(c => c.expires))
      : undefined;

    return {
      isValid: true,
      expiresAt: earliestExpiry ? earliestExpiry * 1000 : undefined,
      needsRefresh: !this.isSessionFresh(valid),
    };
  }
}
