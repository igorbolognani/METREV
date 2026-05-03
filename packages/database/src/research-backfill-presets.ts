import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
    QueueResearchBackfillPreset,
    QueueResearchBackfillRequest,
    ResearchSearchProvider
} from '@metrev/domain-contracts';

export const MFC_MEC_30000_PRESET_ID = 'mfc_mec_30000' as const;
const DEFAULT_PRESET_CONFIG_PATH = '../data/bigdata-mfc-mec-30000.config.json';
const DEFAULT_PROVIDER_PAGE_LIMIT = 1000;

interface ResearchBackfillPresetConfig {
  queries?: unknown;
  sources?: Record<string, { enabled?: boolean } | undefined>;
}

export interface PlannedResearchBackfill extends QueueResearchBackfillRequest {
  query: string;
}

export interface PlannedResearchBackfillPreset {
  configPath: string;
  presetId: QueueResearchBackfillPreset;
  plannedBackfills: PlannedResearchBackfill[];
  providers: ResearchSearchProvider[];
  queryCount: number;
  targetRecords: number;
}

function readJsonFile(filePath: string) {
  const absolutePath = isAbsolute(filePath)
    ? filePath
    : resolve(dirname(fileURLToPath(import.meta.url)), filePath);

  return JSON.parse(
    readFileSync(absolutePath, 'utf8'),
  ) as ResearchBackfillPresetConfig;
}

function normalizeProvider(value: string): ResearchSearchProvider | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'openalex' || normalized === 'crossref') {
    return normalized;
  }

  if (normalized === 'europepmc' || normalized === 'europe_pmc') {
    return 'europe_pmc';
  }

  return null;
}

function uniqueProviders(
  value: string[] | undefined,
): ResearchSearchProvider[] {
  const normalized = (value ?? [])
    .map(normalizeProvider)
    .filter((entry): entry is ResearchSearchProvider => Boolean(entry));

  return [...new Set(normalized)];
}

function selectProviders(
  config: ResearchBackfillPresetConfig,
): ResearchSearchProvider[] {
  const configured = Object.entries(config.sources ?? {})
    .filter(([, sourceConfig]) => sourceConfig?.enabled !== false)
    .map(([key]) => normalizeProvider(key))
    .filter((entry): entry is ResearchSearchProvider => Boolean(entry));

  const providers = [...new Set(configured)];

  return providers.length > 0
    ? providers
    : ['openalex', 'crossref', 'europe_pmc'];
}

function normalizeQueries(config: ResearchBackfillPresetConfig): string[] {
  return Array.isArray(config.queries)
    ? config.queries
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0)
    : [];
}

function clampPositiveInteger(value: number, max: number) {
  return Math.max(1, Math.min(max, Math.trunc(value)));
}

export function planResearchBackfillPreset(input: {
  configPath?: string;
  presetId?: QueueResearchBackfillPreset;
  targetRecords?: number;
}): PlannedResearchBackfillPreset {
  const presetId = input.presetId ?? MFC_MEC_30000_PRESET_ID;
  const configPath = input.configPath ?? DEFAULT_PRESET_CONFIG_PATH;
  const targetRecords = Math.max(1, Math.trunc(input.targetRecords ?? 30000));
  const config = readJsonFile(configPath);
  const queries = normalizeQueries(config);
  const providers = selectProviders(config);

  if (queries.length === 0) {
    throw new Error(`Preset ${presetId} has no configured research queries.`);
  }

  const perQueryTarget = Math.max(1, Math.ceil(targetRecords / queries.length));
  const perProviderLimit = clampPositiveInteger(
    Math.min(perQueryTarget, DEFAULT_PROVIDER_PAGE_LIMIT),
    DEFAULT_PROVIDER_PAGE_LIMIT,
  );
  const maxPages = clampPositiveInteger(
    Math.ceil(perQueryTarget / perProviderLimit),
    500,
  );

  return {
    configPath,
    presetId,
    plannedBackfills: queries.map((query) => ({
      query,
      providers,
      per_provider_limit: perProviderLimit,
      max_pages: maxPages,
      target_records: perQueryTarget,
    })),
    providers,
    queryCount: queries.length,
    targetRecords,
  };
}
