'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import {
    PUBLIC_TOPIC_PAGES,
    getPublicTopicHref,
} from '@/components/public-topic-content';

void React;

export function PublicTopicNav() {
  const pathname = usePathname() ?? '/';
  const normalizedPathname =
    pathname === '/' ? pathname : pathname.replace(/\/$/, '');

  return (
    <nav
      aria-label="Public topic routes"
      className="public-route-nav"
      data-testid="public-topic-nav"
    >
      <Link
        aria-current={normalizedPathname === '/' ? 'page' : undefined}
        className={
          normalizedPathname === '/'
            ? 'public-route-nav__brand is-active'
            : 'public-route-nav__brand'
        }
        href="/"
      >
        <span className="public-route-nav__brand-mark">METREV</span>
        <span className="public-route-nav__brand-text">Overview</span>
      </Link>

      <div className="public-route-nav__tabs">
        {PUBLIC_TOPIC_PAGES.map((topic) => {
          const href = getPublicTopicHref(topic.slug);
          const isActive = normalizedPathname === href;

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? 'is-active' : undefined}
              href={href}
              key={topic.slug}
            >
              {topic.navLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
