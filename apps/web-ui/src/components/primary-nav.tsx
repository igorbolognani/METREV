'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Tooltip } from '@/components/ui/tooltip';
import { getNavItemsForRole, type NavIcon } from '@/lib/navigation';

export interface PrimaryNavProps {
  collapsed?: boolean;
  role?: string;
}

function NavigationIcon({ icon }: { icon: NavIcon }) {
  switch (icon) {
    case 'dashboard':
      return (
        <svg
          aria-hidden="true"
          className="app-sidebar__nav-icon"
          viewBox="0 0 24 24"
        >
          <path
            d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"
            fill="currentColor"
          />
        </svg>
      );
    case 'input-deck':
      return (
        <svg
          aria-hidden="true"
          className="app-sidebar__nav-icon"
          viewBox="0 0 24 24"
        >
          <path
            d="M7 4h10l3 3v13H7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M9 10h8M9 14h8M9 18h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case 'evidence-explorer':
      return (
        <svg
          aria-hidden="true"
          className="app-sidebar__nav-icon"
          viewBox="0 0 24 24"
        >
          <circle
            cx="10"
            cy="10"
            fill="none"
            r="5.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m14 14 5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8.5 10h3M10 8.5v3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case 'evidence-review':
      return (
        <svg
          aria-hidden="true"
          className="app-sidebar__nav-icon"
          viewBox="0 0 24 24"
        >
          <path
            d="M5 6h14v12H5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 10h8M8 14h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m15 17 2 2 3-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case 'research-tables':
      return (
        <svg
          aria-hidden="true"
          className="app-sidebar__nav-icon"
          viewBox="0 0 24 24"
        >
          <path
            d="M4 5h16v14H4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4 10h16M9 5v14M15 5v14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case 'evaluations':
    case 'reports':
      return (
        <svg
          aria-hidden="true"
          className="app-sidebar__nav-icon"
          viewBox="0 0 24 24"
        >
          <path
            d="M5 18h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M7 16V8M12 16V5M17 16v-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
  }
}

export function PrimaryNav({ collapsed = false, role }: PrimaryNavProps) {
  const pathname = usePathname();
  const visibleItems = getNavItemsForRole(role);
  const sections = [
    {
      label: 'Workspace',
      items: visibleItems.filter((item) => item.section === 'primary'),
    },
    {
      label: 'Advanced/Internal',
      items: visibleItems.filter((item) => item.section === 'advanced'),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <nav aria-label="Primary" className="app-sidebar__nav">
      {sections.map((section) => (
        <div className="app-sidebar__nav-section" key={section.label}>
          {!collapsed ? (
            <span className="app-sidebar__section-label">
              {section.label}
            </span>
          ) : null}
          {section.items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            const navItem = item.disabled ? (
              <span
                aria-disabled="true"
                className={`app-sidebar__nav-item${isActive ? ' app-sidebar__nav-item--active' : ''}`}
                key={item.id}
              >
                <NavigationIcon icon={item.icon} />
                {!collapsed ? <span>{item.label}</span> : null}
              </span>
            ) : (
              <Link
                className={`app-sidebar__nav-item${isActive ? ' app-sidebar__nav-item--active' : ''}`}
                href={item.href}
                key={item.id}
              >
                <NavigationIcon icon={item.icon} />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );

            if (!collapsed) {
              return navItem;
            }

            return (
              <Tooltip content={item.label} key={item.id} side="right">
                {navItem}
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
