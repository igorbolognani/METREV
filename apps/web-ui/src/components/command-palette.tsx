'use client';

import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { Dialog } from '@/components/ui/dialog';
import { fetchEvaluationList } from '@/lib/api';
import { formatToken } from '@/lib/formatting';
import { NAV_ITEMS } from '@/lib/navigation';

interface PaletteItem {
  disabled?: boolean;
  group: string;
  hint?: string;
  id: string;
  keywords?: string[];
  label: string;
  onSelect: () => void;
}

export function CommandPalette() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const query = useQuery({
    queryFn: () =>
      fetchEvaluationList({
        sortKey: 'created_at',
        sortDirection: 'desc',
        page: 1,
        pageSize: 5,
      }),
    queryKey: ['evaluation-list', 'command-palette', 5],
  });

  const recentEvaluations = React.useMemo(
    () => query.data?.items ?? [],
    [query.data?.items],
  );

  const recentCases = React.useMemo(() => {
    const dedupedCases = new Map<string, (typeof recentEvaluations)[number]>();

    for (const evaluation of recentEvaluations) {
      if (!dedupedCases.has(evaluation.case_id)) {
        dedupedCases.set(evaluation.case_id, evaluation);
      }
    }

    return Array.from(dedupedCases.values()).slice(0, 5);
  }, [recentEvaluations]);

  const items = React.useMemo<PaletteItem[]>(() => {
    const navigationItems = NAV_ITEMS.map((item) => ({
      disabled: item.disabled,
      group: 'Navigation',
      hint: item.href,
      id: item.id,
      keywords: [item.label, item.href],
      label: item.label,
      onSelect: () => {
        if (!item.disabled) {
          router.push(item.href);
        }
      },
    }));

    const evaluationItems = recentEvaluations.map((item) => ({
      group: 'Recent Evaluations',
      hint: formatToken(item.technology_family),
      id: item.evaluation_id,
      keywords: [item.case_id, item.summary, item.technology_family],
      label: item.evaluation_id.slice(0, 8),
      onSelect: () => {
        router.push(`/evaluations/${item.evaluation_id}`);
      },
    }));

    const caseItems = recentCases.map((item) => ({
      group: 'Recent Cases',
      hint: formatToken(item.primary_objective),
      id: item.case_id,
      keywords: [item.case_id, item.primary_objective, item.technology_family],
      label: item.case_id,
      onSelect: () => {
        router.push(`/cases/${item.case_id}/history`);
      },
    }));

    return [...navigationItems, ...evaluationItems, ...caseItems];
  }, [recentCases, recentEvaluations, router]);

  React.useEffect(() => {
    if (pathname.includes('/report')) {
      setOpen(false);
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((currentValue) => !currentValue);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pathname]);

  if (pathname.includes('/report')) {
    return null;
  }

  const groupedItems = items.reduce<Map<string, PaletteItem[]>>(
    (groups, item) => {
      const currentItems = groups.get(item.group) ?? [];
      currentItems.push(item);
      groups.set(item.group, currentItems);
      return groups;
    },
    new Map(),
  );

  return (
    <Dialog
      contentClassName="command-palette__dialog"
      hideClose
      onOpenChange={setOpen}
      open={open}
      title="Workspace command palette"
    >
      <Command className="command-palette__frame">
        <Command.Input
          className="command-palette__input"
          placeholder="Search routes, evaluations, and cases..."
        />
        <Command.List className="command-palette__list">
          <Command.Empty className="command-palette__empty">
            No results found.
          </Command.Empty>
          {Array.from(groupedItems.entries()).map(([group, groupItems]) => (
            <Command.Group
              className="command-palette__group"
              heading={group}
              key={group}
            >
              {groupItems.map((item) => (
                <Command.Item
                  className="command-palette__item"
                  disabled={item.disabled}
                  key={`${group}-${item.id}`}
                  keywords={item.keywords}
                  onSelect={() => {
                    item.onSelect();
                    setOpen(false);
                  }}
                >
                  <span className="command-palette__item-copy">
                    <span>{item.label}</span>
                    {item.hint ? (
                      <span className="command-palette__item-hint">
                        {item.hint}
                      </span>
                    ) : null}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </Dialog>
  );
}
