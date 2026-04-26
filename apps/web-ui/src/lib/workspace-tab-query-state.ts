'use client';

import { parseAsString, useQueryState } from 'nuqs';

export function normalizeWorkspaceTab<T extends string>(input: {
  aliases?: Record<string, T>;
  allowed: readonly T[];
  defaultTab: T;
  value: string | null | undefined;
}): T {
  const candidate =
    (input.value ? (input.aliases?.[input.value] ?? input.value) : null) ??
    input.defaultTab;

  return input.allowed.includes(candidate as T)
    ? (candidate as T)
    : input.defaultTab;
}

export function useWorkspaceTabState<T extends string>(input: {
  aliases?: Record<string, T>;
  allowed: readonly T[];
  defaultTab: T;
}) {
  const [rawTab, setRawTab] = useQueryState(
    'tab',
    parseAsString
      .withDefault(input.defaultTab)
      .withOptions({ history: 'push' }),
  );

  return [
    normalizeWorkspaceTab({
      aliases: input.aliases,
      allowed: input.allowed,
      defaultTab: input.defaultTab,
      value: rawTab,
    }),
    (nextTab: T) => {
      void setRawTab(nextTab);
    },
  ] as const;
}
