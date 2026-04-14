import Link from 'next/link';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { auth, signIn } from '@/auth';
import { normalizeCallbackPath } from '@/lib/auth-routing';

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

function errorMessage(error?: string): string | null {
  switch (error) {
    case 'CredentialsSignin':
      return 'Invalid email or password.';
    case 'AccessDenied':
      return 'Sign-in was denied for this account.';
    case undefined:
      return null;
    default:
      return 'Sign-in failed. Check the local seeded credentials and try again.';
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = normalizeCallbackPath(params.callbackUrl);
  const session = await auth();

  if (session?.user?.id) {
    redirect(callbackUrl);
  }

  const feedback = errorMessage(params.error);

  return (
    <main>
      <section className="panel auth-card">
        <span className="badge">Local analyst access</span>
        <h1>Sign in to METREV</h1>
        <p className="muted">
          Use one of the deterministic local accounts created by{' '}
          <code>pnpm run db:seed</code>. The authenticated session is required
          before the UI can create evaluations or read persisted history.
        </p>

        {feedback ? <p className="error">{feedback}</p> : null}

        <form
          className="grid"
          action={async (formData) => {
            'use server';

            const redirectTo = normalizeCallbackPath(
              formData.get('redirectTo'),
            );
            const payload = new FormData();
            payload.set('email', String(formData.get('email') ?? ''));
            payload.set('password', String(formData.get('password') ?? ''));
            payload.set('redirectTo', redirectTo);

            try {
              await signIn('credentials', payload);
            } catch (error) {
              if (error instanceof AuthError) {
                const nextParams = new URLSearchParams({
                  error: error.type,
                  callbackUrl: redirectTo,
                });
                redirect(`/login?${nextParams.toString()}`);
              }

              throw error;
            }
          }}
        >
          <input type="hidden" name="redirectTo" value={callbackUrl} />

          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              type="email"
              placeholder="analyst@metrev.local"
              required
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              type="password"
              placeholder="Local seeded password"
              required
            />
          </label>

          <button type="submit">Sign in</button>
        </form>

        <div className="panel nested-panel compact-panel grid">
          <h2>Local runtime note</h2>
          <p className="muted">
            The canonical local credentials come from the seeded runtime env.
            The quickstart documents the default analyst flow from sign-in to
            logout.
          </p>
          <Link className="button secondary" href="/">
            Back to dashboard entry
          </Link>
        </div>
      </section>
    </main>
  );
}
