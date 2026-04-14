import { encode } from '@auth/core/jwt';
import { afterEach, describe, expect, it } from 'vitest';

import { defaultSessionCookieName, getServerSession } from '@metrev/auth';

const originalAuthSecret = process.env.AUTH_SECRET;

async function issueSessionCookie(
  cookieName = defaultSessionCookieName,
): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET must be set in the test environment.');
  }

  const token = await encode({
    secret,
    salt: cookieName,
    token: {
      sub: 'user-analyst-001',
      email: 'analyst@metrev.local',
      role: 'ANALYST',
      jti: 'session-analyst-001',
    },
  });

  return `${cookieName}=${token}`;
}

describe('server-side auth session resolution', () => {
  afterEach(() => {
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
      return;
    }

    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it('resolves an actor from the default Auth.js JWT cookie', async () => {
    process.env.AUTH_SECRET = 'metrev-test-auth-secret';

    const actor = await getServerSession({
      cookieHeader: await issueSessionCookie(),
    });

    expect(actor).toMatchObject({
      userId: 'user-analyst-001',
      email: 'analyst@metrev.local',
      role: 'ANALYST',
    });
    expect(actor?.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(actor?.sessionToken).toContain('.');
  });

  it('resolves an actor from the secure Auth.js JWT cookie name', async () => {
    process.env.AUTH_SECRET = 'metrev-test-auth-secret';

    const actor = await getServerSession({
      cookieHeader: await issueSessionCookie('__Secure-authjs.session-token'),
    });

    expect(actor?.role).toBe('ANALYST');
    expect(actor?.email).toBe('analyst@metrev.local');
  });

  it('returns null for a malformed JWT cookie', async () => {
    process.env.AUTH_SECRET = 'metrev-test-auth-secret';

    const actor = await getServerSession({
      cookieHeader: `${defaultSessionCookieName}=not.a.valid.authjs.jwt`,
    });

    expect(actor).toBeNull();
  });
});
