'use client';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import { Collapsible } from '@/components/ui/collapsible';
import { WorkspaceSkeleton } from '@/components/workspace-chrome';
import { fetchEvaluation } from '@/lib/api';

export function RawEvaluationDisclosure({
  evaluationId,
}: {
  evaluationId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [hasRequested, setHasRequested] = React.useState(false);
  const query = useQuery({
    enabled: false,
    queryFn: () => fetchEvaluation(evaluationId),
    queryKey: ['evaluation-raw', evaluationId],
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen && !hasRequested) {
      setHasRequested(true);
      void query.refetch();
    }
  };

  return (
    <Collapsible
      onOpenChange={handleOpenChange}
      open={open}
      title="View raw evaluation data"
    >
      {query.isFetching ? <WorkspaceSkeleton lines={4} /> : null}
      {query.error ? <p className="error">{query.error.message}</p> : null}
      {query.data ? (
        <pre className="code-block evaluation-raw-pre">
          {JSON.stringify(query.data, null, 2)}
        </pre>
      ) : null}
      {!hasRequested && !query.isFetching ? (
        <p className="muted">
          Open this disclosure to load the raw evaluation payload.
        </p>
      ) : null}
    </Collapsible>
  );
}
