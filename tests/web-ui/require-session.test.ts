import { afterEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: authMock,
}));

import {
  requireAuthenticatedSession,
  requireRoleSession,
} from '../../apps/web-ui/src/lib/require-session';

describe('server-side session guards', () => {
  afterEach(() => {
    authMock.mockReset();
  });

  it('redirects unauthenticated requests to login with the callback path', async () => {
    authMock.mockResolvedValue(null);

    const redirectError = await requireAuthenticatedSession('/cases/new').catch(
      (error) => error,
    );

    expect(redirectError?.message).toBe('NEXT_REDIRECT');
    expect(redirectError?.digest).toContain(
      '/login?callbackUrl=%2Fcases%2Fnew',
    );
  });

  it('returns the authenticated session unchanged when present', async () => {
    const session = {
      user: {
        id: 'user-analyst-001',
        email: 'analyst@metrev.local',
        role: 'ANALYST',
      },
      sessionId: 'session-analyst-001',
    };
    authMock.mockResolvedValue(session);

    await expect(requireAuthenticatedSession('/dashboard')).resolves.toBe(
      session,
    );
  });

  it('returns authorization state for the requested role', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'user-viewer-001',
        email: 'viewer@metrev.local',
        role: 'VIEWER',
      },
      sessionId: 'session-viewer-001',
    });

    await expect(
      requireRoleSession('/dashboard', 'ANALYST'),
    ).resolves.toMatchObject({
      authorized: false,
      session: {
        user: {
          role: 'VIEWER',
        },
      },
    });
  });
});
