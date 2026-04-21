'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import * as React from 'react';

import { buildBreadcrumbs } from '@/lib/navigation';

function normalizeParams(
  value: ReturnType<typeof useParams>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      Array.isArray(entry) ? (entry[0] ?? '') : (entry ?? ''),
    ]),
  );
}

export function WorkspaceBreadcrumbs() {
  const pathname = usePathname();
  const params = useParams();

  const trail = React.useMemo(
    () => buildBreadcrumbs(pathname, normalizeParams(params)),
    [params, pathname],
  );

  if (pathname.includes('/report') || trail.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol className="breadcrumb__list">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;

          return (
            <li className="breadcrumb__item" key={`${item.label}-${index}`}>
              {isLast || !item.href ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="breadcrumb__separator">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
