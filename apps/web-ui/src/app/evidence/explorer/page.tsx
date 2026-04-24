import { ExternalEvidenceExplorer } from '@/components/evidence-explorer/external-evidence-explorer';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function ExternalEvidenceExplorerPage() {
  await requireAuthenticatedSession('/evidence/explorer');

  return (
    <main>
      <ExternalEvidenceExplorer />
    </main>
  );
}
