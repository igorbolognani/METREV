import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  QueueResearchBackfillPreset,
  QueueResearchBackfillRequest,
  ResearchSearchProvider,
} from '@metrev/domain-contracts';

export const FOCUSED_MFC_MEC_WASTEWATER_BIOSENSORS_PRESET_ID =
  'mfc_mec_wastewater_biosensors' as const;
const DEFAULT_PRESET_CONFIG_PATH =
  '../data/focused-mfc-mec-wastewater-biosensors.config.json';
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
  estimatedMaxRecords: number;
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
  const presetId =
    input.presetId ?? FOCUSED_MFC_MEC_WASTEWATER_BIOSENSORS_PRESET_ID;
  const configPath = input.configPath ?? DEFAULT_PRESET_CONFIG_PATH;
  const targetRecords = Math.trunc(input.targetRecords ?? 500);
  const config = readJsonFile(configPath);
  const queries = normalizeQueries(config);
  const providers = selectProviders(config);

  if (queries.length === 0) {
    throw new Error(`Preset ${presetId} has no configured research queries.`);
  }

  const providerQuerySlots = queries.length * providers.length;
  if (targetRecords < providerQuerySlots || targetRecords > 5000) {
    throw new Error(
      `Preset targetRecords must be between ${providerQuerySlots} and 5000 for ${providerQuerySlots} provider/query slots.`,
    );
  }
  const perProviderLimit = clampPositiveInteger(
    Math.min(
      Math.floor(targetRecords / Math.max(providerQuerySlots, 1)),
      DEFAULT_PROVIDER_PAGE_LIMIT,
    ),
    DEFAULT_PROVIDER_PAGE_LIMIT,
  );
  const maxPages = 1;

  return {
    configPath,
    presetId,
    plannedBackfills: queries.map((query) => ({
      query,
      providers,
      per_provider_limit: perProviderLimit,
      max_pages: maxPages,
      target_records: perProviderLimit * providers.length,
    })),
    providers,
    queryCount: queries.length,
    targetRecords,
    estimatedMaxRecords: perProviderLimit * providerQuerySlots,
  };
}
