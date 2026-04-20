'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const primaryLinks = [
  {
    href: '/',
    label: 'Dashboard',
  },
  {
    href: '/cases/new',
    label: 'Input deck',
  },
  {
    href: '/evidence/review',
    label: 'Evidence review',
  },
] as const;

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Primary">
      {primaryLinks.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== '/' && pathname.startsWith(link.href));

        return (
          <Link
            className={`site-nav-link${isActive ? ' active' : ''}`}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
