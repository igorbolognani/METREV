import { randomUUID } from 'node:crypto';

import {
  acquisitionAttemptSchema,
  loadEvidenceDiscoveryPolicy,
  type AcquisitionAttempt,
} from '@metrev/domain-contracts';

export interface SourceRecordForAcquisition {
  source_record_id: string;
  title: string;
  doi: string | null;
  source_url: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  access_status: string;
  license: string | null;
  has_traceable_full_text: boolean;
}

export interface AcquisitionRepositoryLike {
  createAcquisitionAttempt(attempt: AcquisitionAttempt): Promise<string>;
  updateAcquisitionAttemptStatus(
    attemptId: string,
    update: Partial<
      Pick<
        AcquisitionAttempt,
        'status' | 'found_url' | 'found_access_status' | 'failure_reason'
      >
    >,
  ): Promise<void>;
  markSourceRecordFullTextResolved(input: {
    sourceRecordId: string;
    foundUrl: string;
    accessStatus?: string | null;
    strategy: AcquisitionAttempt['strategy'];
  }): Promise<void>;
}

export interface ResolvedFullTextCandidate {
  url: string;
  accessStatus: AcquisitionAttempt['found_access_status'];
  strategy: AcquisitionAttempt['strategy'];
}

export type FullTextResolver = (
  record: SourceRecordForAcquisition,
) => Promise<ResolvedFullTextCandidate | null>;

function timeoutMs(): number {
  const policy = loadEvidenceDiscoveryPolicy();
  const acquisitionPolicy = policy.acquisition_policy as {
    fetch_timeout_ms?: unknown;
  };
  return typeof acquisitionPolicy.fetch_timeout_ms === 'number'
    ? acquisitionPolicy.fetch_timeout_ms
    : 15_000;
}

async function fetchJson(
  url: string,
  options?: { timeout?: number },
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeout ?? timeoutMs(),
  );

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

function readNestedString(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' && current.length > 0 ? current : null;
}

export async function defaultFullTextResolver(
  record: SourceRecordForAcquisition,
): Promise<ResolvedFullTextCandidate | null> {
  if (record.xml_url) {
    return {
      url: record.xml_url,
      accessStatus: 'green',
      strategy: 'direct_xml',
    };
  }

  if (record.pdf_url) {
    return {
      url: record.pdf_url,
      accessStatus: 'green',
      strategy: 'direct_pdf',
    };
  }

  if (!record.doi) {
    return null;
  }

  const encodedDoi = encodeURIComponent(record.doi);
  const unpaywallEmail =
    process.env.METREV_UNPAYWALL_EMAIL ?? 'metadata@metrev.local';
  const unpaywall = await fetchJson(
    `https://api.unpaywall.org/v2/${encodedDoi}?email=${encodeURIComponent(
      unpaywallEmail,
    )}`,
  );
  const unpaywallUrl =
    readNestedString(unpaywall, ['best_oa_location', 'url_for_pdf']) ??
    readNestedString(unpaywall, ['best_oa_location', 'url']);
  if (unpaywallUrl) {
    return {
      url: unpaywallUrl,
      accessStatus: 'green',
      strategy: 'unpaywall',
    };
  }

  const semanticScholar = await fetchJson(
    `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodedDoi}?fields=openAccessPdf`,
  );
  const semanticScholarUrl = readNestedString(semanticScholar, [
    'openAccessPdf',
    'url',
  ]);
  if (semanticScholarUrl) {
    return {
      url: semanticScholarUrl,
      accessStatus: 'green',
      strategy: 'semantic_scholar',
    };
  }

  return null;
}

export async function resolveFullText(input: {
  record: SourceRecordForAcquisition;
  repository: AcquisitionRepositoryLike;
  resolver?: FullTextResolver;
}): Promise<AcquisitionAttempt> {
  if (input.record.has_traceable_full_text) {
    const attempt = acquisitionAttemptSchema.parse({
      attempt_id: randomUUID(),
      source_record_id: input.record.source_record_id,
      strategy: 'source_artifact',
      status: 'skipped',
      found_url: null,
      found_access_status: null,
      failure_reason: 'traceable_full_text_already_available',
      created_at: new Date().toISOString(),
    });
    await input.repository.createAcquisitionAttempt(attempt);
    return attempt;
  }

  const attempt = acquisitionAttemptSchema.parse({
    attempt_id: randomUUID(),
    source_record_id: input.record.source_record_id,
    strategy: input.record.xml_url
      ? 'direct_xml'
      : input.record.pdf_url
        ? 'direct_pdf'
        : 'unpaywall',
    status: 'running',
    found_url: null,
    found_access_status: null,
    failure_reason: null,
    created_at: new Date().toISOString(),
  });
  await input.repository.createAcquisitionAttempt(attempt);

  const resolver = input.resolver ?? defaultFullTextResolver;
  const resolved = await resolver(input.record);

  if (!resolved) {
    await input.repository.updateAcquisitionAttemptStatus(attempt.attempt_id, {
      status: 'failed',
      failure_reason: 'no_open_access_full_text_found',
    });

    return acquisitionAttemptSchema.parse({
      ...attempt,
      status: 'failed',
      failure_reason: 'no_open_access_full_text_found',
    });
  }

  await input.repository.markSourceRecordFullTextResolved({
    sourceRecordId: input.record.source_record_id,
    foundUrl: resolved.url,
    accessStatus: resolved.accessStatus,
    strategy: resolved.strategy,
  });
  await input.repository.updateAcquisitionAttemptStatus(attempt.attempt_id, {
    status: 'success',
    found_url: resolved.url,
    found_access_status: resolved.accessStatus,
  });

  return acquisitionAttemptSchema.parse({
    ...attempt,
    strategy: resolved.strategy,
    status: 'success',
    found_url: resolved.url,
    found_access_status: resolved.accessStatus,
  });
}
