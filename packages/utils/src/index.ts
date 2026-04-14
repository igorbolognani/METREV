export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function dedupeStrings(
  values: Array<string | undefined | null>,
): string[] {
  return [
    ...new Set(values.filter(isNonEmptyString).map((value) => value.trim())),
  ];
}

export function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupeStrings(
      value.map((entry) => (typeof entry === 'string' ? entry : undefined)),
    );
  }

  if (isNonEmptyString(value)) {
    return dedupeStrings(
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
  }

  return [];
}

export function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
