'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { fetchEvaluationList } from '@/lib/api';
import { formatToken } from '@/lib/formatting';

export interface RecentEvaluationsNavProps {
  collapsed?: boolean;
}

function truncateEvaluationId(value: string): string {
  return value.slice(0, 8);
}

export function RecentEvaluationsNav({
  collapsed = false,
}: RecentEvaluationsNavProps) {
  const query = useQuery({
    queryFn: () =>
      fetchEvaluationList({
        sortKey: 'created_at',
        sortDirection: 'desc',
        page: 1,
        pageSize: 5,
      }),
    queryKey: ['evaluation-list', 'recent', 5],
  });

  const recentEvaluations = query.data?.items ?? [];

  if (collapsed) {
    return null;
  }

  if (query.isLoading) {
    return (
      <div aria-hidden="true" className="app-sidebar__recent-skeleton">
        {Array.from({ length: 3 }, (_, index) => (
          <span className="app-sidebar__recent-skeleton-line" key={index} />
        ))}
      </div>
    );
  }

  if (query.isError || recentEvaluations.length === 0) {
    return null;
  }

  return (
    <div className="app-sidebar__recent-list">
      {recentEvaluations.map((item) => (
        <Link
          className="app-sidebar__recent-item"
          href={`/evaluations/${item.evaluation_id}`}
          key={item.evaluation_id}
        >
          <strong>{truncateEvaluationId(item.evaluation_id)}</strong>
          <span>{formatToken(item.technology_family)}</span>
        </Link>
      ))}
    </div>
  );
}
