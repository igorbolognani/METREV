'use client';

import { PrimaryNav } from '@/components/primary-nav';
import { RecentEvaluationsNav } from '@/components/recent-evaluations-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';

export interface AppSidebarProps {
  collapsed: boolean;
  email: string | null;
  onToggleCollapsed: () => void;
  role: string;
  signOutAction: (formData: FormData) => void | Promise<void>;
}

export function AppSidebar({
  collapsed,
  email,
  onToggleCollapsed,
  role,
  signOutAction,
}: AppSidebarProps) {
  return (
    <aside
      className={
        collapsed ? 'app-sidebar app-sidebar--collapsed' : 'app-sidebar'
      }
    >
      <div className="app-sidebar__inner">
        <div className="app-sidebar__top">
          <div className="app-sidebar__brand-row">
            <div className="app-sidebar__brand-copy">
              {!collapsed ? <Badge variant="info">Live workspace</Badge> : null}
              {!collapsed ? <strong>METREV</strong> : null}
              {!collapsed ? (
                <span className="app-sidebar__brand-note">
                  Decision, evidence, and audit surfaces
                </span>
              ) : null}
            </div>
            <Button
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="app-sidebar__toggle"
              size="icon"
              variant="ghost"
              onClick={onToggleCollapsed}
            >
              {collapsed ? '>>' : '<<'}
            </Button>
          </div>

          <PrimaryNav collapsed={collapsed} />

          {!collapsed ? (
            <section
              aria-label="Recent evaluations"
              className="app-sidebar__section"
            >
              <span className="app-sidebar__section-label">
                Recent Evaluations
              </span>
              <RecentEvaluationsNav />
            </section>
          ) : null}
        </div>

        <footer className="app-sidebar__footer">
          <div className="app-sidebar__footer-copy">
            {!collapsed ? (
              <Badge size="sm" variant="muted">
                {role.toLowerCase()}
              </Badge>
            ) : null}
            {!collapsed && email ? (
              <span className="app-sidebar__footer-email">{email}</span>
            ) : null}
          </div>

          {collapsed ? (
            <Tooltip content="Sign out" side="right">
              <form
                action={signOutAction}
                className="app-sidebar__signout-form"
              >
                <Button
                  aria-label="Sign out"
                  size="icon"
                  type="submit"
                  variant="outline"
                >
                  SO
                </Button>
              </form>
            </Tooltip>
          ) : (
            <form action={signOutAction} className="app-sidebar__signout-form">
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          )}
        </footer>
      </div>
    </aside>
  );
}
