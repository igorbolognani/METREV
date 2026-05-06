'use client';

import { usePathname } from 'next/navigation';
import * as React from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { WorkspaceBreadcrumbs } from '@/components/workspace-breadcrumbs';

export interface AppShellProps {
  children: React.ReactNode;
  signOutAction: (formData: FormData) => void | Promise<void>;
  user: {
    email: string | null;
    role: string;
  } | null;
}

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

export function AppShell({ children, signOutAction, user }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [hasHydrated, setHasHydrated] = React.useState(false);
  const isPublicLearningPath =
    pathname === '/' || pathname.startsWith('/learn');

  React.useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const prefersCollapsedLayout = window.matchMedia(
      '(max-width: 1366px)',
    ).matches;

    if (storedValue === 'true' || storedValue === 'false') {
      setCollapsed(storedValue === 'true');
    } else {
      setCollapsed(prefersCollapsedLayout);
    }
    setHasHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      collapsed ? 'true' : 'false',
    );
  }, [collapsed, hasHydrated]);

  if (!user || isPublicLearningPath) {
    return <>{children}</>;
  }

  if (pathname.includes('/report')) {
    return <div className="app-main app-main--report">{children}</div>;
  }

  const layoutClassName = [
    'app-layout',
    'app-layout--workspace-density',
    collapsed ? 'app-layout--collapsed' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={layoutClassName}>
      <AppSidebar
        collapsed={collapsed}
        email={user.email}
        onToggleCollapsed={() => setCollapsed((currentValue) => !currentValue)}
        role={user.role}
        signOutAction={signOutAction}
      />
      <div className="app-main">
        <WorkspaceBreadcrumbs />
        {children}
      </div>
      <CommandPalette role={user.role} />
    </div>
  );
}
