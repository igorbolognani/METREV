export type LegacyRouteSearchParams = Record<
  string,
  string | string[] | undefined
>;

export async function buildLegacyRouteRedirectTarget(
  pathname: string,
  searchParams?: Promise<LegacyRouteSearchParams>,
) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!resolvedSearchParams) {
    return pathname;
  }

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) {
          query.append(key, entry);
        }
      }
      continue;
    }

    if (value) {
      query.append(key, value);
    }
  }

  const queryString = query.toString();
  return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
}
