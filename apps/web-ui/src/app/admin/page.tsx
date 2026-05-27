import Link from 'next/link';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { requireRoleSession } from '@/lib/require-session';

const adminLinks = [
  {
    href: '/admin/intelligence/evidence/explorer',
    label: 'Evidence Explorer',
  },
  {
    href: '/admin/intelligence/evidence/quality',
    label: 'Evidence Quality',
  },
  {
    href: '/admin/intelligence/evidence/review',
    label: 'Evidence Review',
  },
  {
    href: '/admin/intelligence/research/reviews',
    label: 'Research Tables',
  },
];

export default async function AdminWorkspacePage() {
  const { session, authorized } = await requireRoleSession('/admin', 'ADMIN');

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  return (
    <main>
      <section className="workspace-hero workspace-hero--instrument">
        <div>
          <span className="workspace-kicker">Administration</span>
          <h1>Intelligence controls</h1>
          <p>
            Audit, review, and research operations for the local METREV
            workspace.
          </p>
        </div>
      </section>
      <section className="instrument-grid instrument-grid--three">
        {adminLinks.map((item) => (
          <Link
            className="workspace-data-card admin-action-card"
            href={item.href}
            key={item.href}
          >
            <strong>{item.label}</strong>
            <span>Open</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
