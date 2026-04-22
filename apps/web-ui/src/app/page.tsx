import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { PublicLandingPage } from '@/components/public-landing';

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return (
    <main>
      <PublicLandingPage />
    </main>
  );
}
