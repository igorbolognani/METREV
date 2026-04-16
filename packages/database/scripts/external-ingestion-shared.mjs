function truncateText(value, maxLength = 480) {
  if (!value) {
    return '';
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function normalizeIsoTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeDateParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const [year, month = 1, day = 1] = parts;
  if (!year) {
    return null;
  }

  return normalizeIsoTimestamp(
    new Date(Date.UTC(year, Math.max(month - 1, 0), day)).toISOString(),
  );
}

function stripMarkup(value) {
  if (typeof value !== 'string') {
    return null;
  }

  return (
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || null
  );
}

export function expandOpenAlexAbstract(abstractInvertedIndex) {
  if (
    !abstractInvertedIndex ||
    typeof abstractInvertedIndex !== 'object' ||
    Array.isArray(abstractInvertedIndex)
  ) {
    return null;
  }

  const positionedWords = [];

  for (const [word, positions] of Object.entries(abstractInvertedIndex)) {
    if (!Array.isArray(positions)) {
      continue;
    }

    for (const position of positions) {
      if (typeof position === 'number') {
        positionedWords.push([position, word]);
      }
    }
  }

  if (positionedWords.length === 0) {
    return null;
  }

  return positionedWords
    .sort((left, right) => left[0] - right[0])
    .map(([, word]) => word)
    .join(' ');
}

function buildCatalogEntry({
  sourceType,
  sourceKey,
  sourceUrl,
  title,
  sourceCategory,
  doi,
  publisher,
  publishedAt,
  asOf,
  abstractText,
  rawPayload,
  importQuery,
}) {
  if (!sourceKey || !title) {
    return null;
  }

  const summary = truncateText(
    abstractText ?? `${title} imported for review from ${sourceType} metadata.`,
  );

  return {
    sourceRecord: {
      sourceType,
      sourceKey,
      sourceUrl,
      title,
      sourceCategory,
      doi,
      publisher,
      publishedAt,
      asOf,
      abstractText,
      rawPayload,
    },
    catalogItem: {
      evidenceType: 'literature_evidence',
      title,
      summary,
      strengthLevel: 'moderate',
      provenanceNote: `Imported from ${sourceType} metadata for query "${importQuery}". Review before use in decision flows.`,
      reviewStatus: 'PENDING',
      sourceState: 'PARSED',
      applicabilityScope: {
        import_query: importQuery,
      },
      extractedClaims: [],
      tags: [
        'external-ingestion',
        'literature-evidence',
        sourceType.toLowerCase(),
      ],
      payload: {
        source_url: sourceUrl,
        doi,
        publisher,
        import_query: importQuery,
        imported_at: asOf,
      },
    },
  };
}

export function normalizeOpenAlexWork(work, importQuery, ingestedAt) {
  const sourceKey = typeof work?.id === 'string' ? work.id : null;
  const title =
    typeof work?.display_name === 'string' ? work.display_name.trim() : null;
  const sourceUrl =
    work?.primary_location?.landing_page_url ??
    (typeof work?.id === 'string' ? work.id : null);
  const doi =
    typeof work?.doi === 'string'
      ? work.doi.replace(/^https?:\/\/doi\.org\//i, '')
      : null;
  const publisher =
    work?.primary_location?.source?.display_name ??
    work?.primary_location?.source?.host_organization_name ??
    null;
  const publishedAt = normalizeIsoTimestamp(work?.publication_date);
  const abstractText = expandOpenAlexAbstract(work?.abstract_inverted_index);

  return buildCatalogEntry({
    sourceType: 'OPENALEX',
    sourceKey,
    sourceUrl,
    title,
    sourceCategory: 'scholarly_work',
    doi,
    publisher,
    publishedAt,
    asOf: ingestedAt,
    abstractText,
    rawPayload: work,
    importQuery,
  });
}

export function normalizeCrossrefWork(work, importQuery, ingestedAt) {
  const sourceKey =
    typeof work?.DOI === 'string'
      ? work.DOI
      : typeof work?.URL === 'string'
        ? work.URL
        : Array.isArray(work?.title)
          ? work.title[0]
          : null;
  const title =
    Array.isArray(work?.title) && typeof work.title[0] === 'string'
      ? work.title[0].trim()
      : null;
  const publishedAt = normalizeDateParts(
    work?.issued?.['date-parts']?.[0] ?? work?.published?.['date-parts']?.[0],
  );

  return buildCatalogEntry({
    sourceType: 'CROSSREF',
    sourceKey,
    sourceUrl: typeof work?.URL === 'string' ? work.URL : null,
    title,
    sourceCategory: 'scholarly_work',
    doi: typeof work?.DOI === 'string' ? work.DOI : null,
    publisher: typeof work?.publisher === 'string' ? work.publisher : null,
    publishedAt,
    asOf: ingestedAt,
    abstractText: stripMarkup(work?.abstract),
    rawPayload: work,
    importQuery,
  });
}
