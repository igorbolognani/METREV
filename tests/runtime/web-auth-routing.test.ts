import { describe, expect, it } from 'vitest';

import {
    buildLoginRedirect,
    normalizeCallbackPath,
    sessionHasRequiredRole,
} from '../../apps/web-ui/src/lib/auth-routing';

describe('web auth routing helpers', () => {
  it('keeps valid relative callback paths', () => {
    expect(normalizeCallbackPath('/evaluations/abc?tab=history')).toBe(
      '/evaluations/abc?tab=history',
    );
  });

  it('falls back to home for empty, unsafe, or login callback paths', () => {
    expect(normalizeCallbackPath('')).toBe('/home');
    expect(normalizeCallbackPath('https://example.com/evil')).toBe('/home');
    expect(normalizeCallbackPath('//example.com/evil')).toBe('/home');
    expect(normalizeCallbackPath('/login')).toBe('/home');
  });

  it('builds the login redirect with a preserved callback path', () => {
    expect(buildLoginRedirect('/cases/new')).toBe(
      '/login?callbackUrl=%2Fcases%2Fnew',
    );
  });

  it('reuses the shared RBAC ordering for UI route checks', () => {
    expect(sessionHasRequiredRole('ADMIN', 'ANALYST')).toBe(true);
    expect(sessionHasRequiredRole('ANALYST', 'ANALYST')).toBe(true);
    expect(sessionHasRequiredRole('VIEWER', 'ANALYST')).toBe(false);
  });
});
