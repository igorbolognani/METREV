import './globals.css';

import type { Metadata } from 'next';

import { auth, signOut } from '@/auth';
import { PrimaryNav } from '@/components/primary-nav';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'METREV',
  description: 'Auditable bioelectrochemical decision-support runtime.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        {session?.user ? (
          <header className="site-header">
            <div className="site-header-inner">
              <div className="grid compact-grid">
                <span className="badge">Analyst runtime</span>
                <strong>METREV technical workspace</strong>
              </div>

              <PrimaryNav />

              <div className="stack compact auth-meta">
                <span className="badge subtle">{session.user.role}</span>
                <span className="muted">{session.user.email}</span>
                <form
                  className="inline-form"
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/login' });
                  }}
                >
                  <button className="secondary" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>
        ) : null}

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
