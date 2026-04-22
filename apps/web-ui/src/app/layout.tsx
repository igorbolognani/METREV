import './globals.css';

import type { Metadata } from 'next';

import { auth, signOut } from '@/auth';
import { AppShell } from '@/components/app-shell';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'METREV',
  description: 'Auditable bioelectrochemical decision-support workspace.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const signOutAction = async (_formData: FormData) => {
    'use server';
    await signOut({ redirectTo: '/' });
  };

  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell
            signOutAction={signOutAction}
            user={
              session?.user
                ? {
                    email: session.user.email ?? null,
                    role: session.user.role,
                  }
                : null
            }
          >
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
