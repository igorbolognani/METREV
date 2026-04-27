import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { PublicOverviewHub } from '@/components/public-overview-hub';

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return (
    <main className="landing-main">
      <PublicOverviewHub />
    </main>
  );
}
