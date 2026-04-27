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
    const prefersCollapsedLayout =
      window.matchMedia('(max-width: 760px)').matches;

    setCollapsed(storedValue === 'true' || prefersCollapsedLayout);
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

  return (
    <div
      className={collapsed ? 'app-layout app-layout--collapsed' : 'app-layout'}
    >
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
