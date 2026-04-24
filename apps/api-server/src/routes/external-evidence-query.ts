import {
  externalEvidenceReviewStatusSchema,
  externalEvidenceSourceTypeSchema,
  type ExternalEvidenceReviewStatus,
  type ExternalEvidenceSourceType,
} from '@metrev/domain-contracts';

export interface ExternalEvidenceListQueryInput {
  page?: string;
  pageSize?: string;
  q?: string;
  sourceType?: string;
  status?: string;
}

export interface ParsedExternalEvidenceListQuery {
  page: number;
  pageSize: number;
  query: string | undefined;
  sourceType: ExternalEvidenceSourceType | undefined;
  status: ExternalEvidenceReviewStatus | undefined;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number | null {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseExternalEvidenceListQuery(
  query: ExternalEvidenceListQueryInput,
):
  | { success: true; value: ParsedExternalEvidenceListQuery }
  | {
      success: false;
      details: {
        page: string[];
        pageSize: string[];
        sourceType?: unknown;
        status?: unknown;
      };
    } {
  const parsedStatus = query.status
    ? externalEvidenceReviewStatusSchema.safeParse(query.status)
    : null;
  const parsedSourceType = query.sourceType
    ? externalEvidenceSourceTypeSchema.safeParse(query.sourceType)
    : null;
  const parsedPage = parsePositiveInteger(query.page, 1);
  const parsedPageSize = parsePositiveInteger(query.pageSize, 25);

  if (
    (parsedStatus && !parsedStatus.success) ||
    (parsedSourceType && !parsedSourceType.success) ||
    parsedPage === null ||
    parsedPageSize === null
  ) {
    return {
      success: false,
      details: {
        status:
          parsedStatus && !parsedStatus.success
            ? parsedStatus.error.flatten()
            : undefined,
        sourceType:
          parsedSourceType && !parsedSourceType.success
            ? parsedSourceType.error.flatten()
            : undefined,
        page: parsedPage === null ? ['page must be a positive integer'] : [],
        pageSize:
          parsedPageSize === null
            ? ['pageSize must be a positive integer']
            : [],
      },
    };
  }

  return {
    success: true,
    value: {
      status: parsedStatus?.success ? parsedStatus.data : undefined,
      sourceType: parsedSourceType?.success ? parsedSourceType.data : undefined,
      query: query.q?.trim() || undefined,
      page: parsedPage,
      pageSize: parsedPageSize,
    },
  };
}
