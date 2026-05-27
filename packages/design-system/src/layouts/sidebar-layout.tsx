import type { ReactNode } from 'react';

import { cx } from '../utils';

export function SidebarLayout({
  sidebar,
  children,
  className,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('metrev-sidebar-layout', className)}>
      <aside className="metrev-sidebar-layout-rail">{sidebar}</aside>
      <main className="metrev-sidebar-layout-main">{children}</main>
    </div>
  );
}
