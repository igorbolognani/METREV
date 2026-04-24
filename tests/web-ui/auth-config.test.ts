import { beforeEach, describe, expect, it, vi } from 'vitest';

const authHarness = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
  withSpan: vi.fn(
    async (
      _name: string,
      operation: () => Promise<unknown>,
      _attributes: unknown,
    ) => operation(),
  ),
}));

vi.mock('@metrev/auth', async () => {
  const actual =
    await vi.importActual<typeof import('@metrev/auth')>('@metrev/auth');

  return {
    ...actual,
    verifyPassword: authHarness.verifyPassword,
  };
});

vi.mock('@metrev/telemetry', () => ({
  withSpan: authHarness.withSpan,
}));

import {
  applyJwtCallback,
  applySessionCallback,
  authorizeCredentials,
  authUserSelect,
} from '../../apps/web-ui/src/lib/auth-config';

beforeEach(() => {
  authHarness.verifyPassword.mockReset();
  authHarness.withSpan.mockClear();
});

describe('web auth configuration', () => {
  it('rejects invalid credentials before hitting the database', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn(),
      },
    };

    await expect(
      authorizeCredentials(
        { email: ' Analyst@Metrev.local ', password: 'short' },
        prisma,
      ),
    ).resolves.toBeNull();

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('normalizes email and returns the role-mapped user on a valid login', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-analyst-001',
          email: 'analyst@metrev.local',
          name: 'Analyst',
          role: 'ANALYST',
          passwordHash: 'stored-hash',
        }),
      },
    };
    authHarness.verifyPassword.mockResolvedValue(true);

    const result = await authorizeCredentials(
      {
        email: ' Analyst@Metrev.local ',
        password: 'correct-horse',
      },
      prisma,
    );

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'analyst@metrev.local' },
      select: authUserSelect,
    });
    expect(authHarness.verifyPassword).toHaveBeenCalledWith(
      'correct-horse',
      'stored-hash',
    );
    expect(authHarness.withSpan).toHaveBeenCalledWith(
      'auth.signin.authorize',
      expect.any(Function),
      { has_email: true },
    );
    expect(result).toEqual({
      id: 'user-analyst-001',
      email: 'analyst@metrev.local',
      name: 'Analyst',
      role: 'ANALYST',
    });
  });

  it('returns null when the password verification fails', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-analyst-001',
          email: 'analyst@metrev.local',
          name: 'Analyst',
          role: 'ANALYST',
          passwordHash: 'stored-hash',
        }),
      },
    };
    authHarness.verifyPassword.mockResolvedValue(false);

    await expect(
      authorizeCredentials(
        { email: 'analyst@metrev.local', password: 'wrong-pass' },
        prisma,
      ),
    ).resolves.toBeNull();
  });

  it('copies role-bearing user data into JWT and session callbacks', async () => {
    const token = await applyJwtCallback({
      token: {},
      user: {
        id: 'user-analyst-001',
        email: 'analyst@metrev.local',
        name: 'Analyst',
        role: 'ANALYST',
      },
    });

    expect(token).toMatchObject({
      sub: 'user-analyst-001',
      email: 'analyst@metrev.local',
      name: 'Analyst',
      role: 'ANALYST',
    });

    const session = await applySessionCallback({
      session: {
        user: {
          id: '',
          name: null,
          email: null,
          role: 'VIEWER',
        },
        expires: '2026-04-24T12:00:00.000Z',
      },
      token: {
        sub: 'user-analyst-001',
        email: 'analyst@metrev.local',
        role: 'ANALYST',
        jti: 'session-analyst-001',
      },
    });

    expect(session).toMatchObject({
      user: {
        id: 'user-analyst-001',
        email: 'analyst@metrev.local',
        role: 'ANALYST',
      },
      sessionId: 'session-analyst-001',
    });
  });
});
