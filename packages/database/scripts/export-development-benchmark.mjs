#!/usr/bin/env node
/** Offline, deterministic export of CORA component curves and literature aggregates. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const extracts = [
  'current-density-complete-series.json',
  'lsv-complete-series.json',
  'eis-observed-pairs.json',
];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const csv = (row) =>
  row
    .map((cell) => {
      const s = String(cell);
      return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
    })
    .join(',');

function ensure(condition, message) {
  if (!condition) throw new Error(`CORA benchmark: ${message}`);
}
function countMatches(series, values, label) {
  ensure(
    values.length === series.sample_count,
    `${label}: sample count mismatch`,
  );
  ensure(values.every(Number.isFinite), `${label}: non-finite measurement`);
}

export async function buildDevelopmentBenchmark(repoRoot = root) {
  const registryBytes = await readFile(
    resolve(repoRoot, 'packages/database/data/research-candidates/index.json'),
  );
  const registry = JSON.parse(registryBytes.toString('utf8'));
  const candidate = registry.records.find(
    (record) => record.doi === '10.34810/DATA2866',
  );
  ensure(candidate?.license === 'CC0-1.0', 'source license not verified');
  const loaded = [];
  for (const file of extracts) {
    const artifact = candidate.artifacts.find(
      (item) => item.file_name === file,
    );
    ensure(
      artifact?.local_path && artifact.sha256,
      `${file}: missing registered artifact`,
    );
    const bytes = await readFile(resolve(repoRoot, artifact.local_path));
    ensure(sha(bytes) === artifact.sha256, `${file}: extract hash mismatch`);
    const data = JSON.parse(bytes.toString('utf8'));
    ensure(
      data.source_doi === candidate.doi && data.source_sha256,
      `${file}: source DOI/hash absent`,
    );
    const original = candidate.artifacts.find(
      (item) => item.local_path === data.source_file,
    );
    ensure(
      original?.sha256 === data.source_sha256,
      `${file}: original source not registered`,
    );
    ensure(
      sha(await readFile(resolve(repoRoot, original.local_path))) ===
        data.source_sha256,
      `${file}: original source hash mismatch`,
    );
    loaded.push({ file, data, extractSha256: artifact.sha256 });
  }
  const [time, lsv, eis] = loaded.map((entry) => entry.data);
  const header = [
    'dataset_role',
    'split',
    'source_doi',
    'source_sha256',
    'extract_sha256',
    'source_file',
    'source_cell',
    'coordinate_source_cell',
    'series_label',
    'coordinate_name',
    'coordinate_value',
    'coordinate_unit',
    'metric',
    'observed_value',
    'observed_unit',
    'uncertainty_status',
    'review_status',
  ];
  const rows = [csv(header)];
  const add = (entry, series, coordinate, metric, y, unit, sourceCell) => {
    ensure(
      Number.isFinite(y) && Number.isFinite(coordinate),
      `${entry.file}: missing numeric pair`,
    );
    const coordinateColumn =
      entry.data.coordinate.source_locator.match(/!([A-Z]+)\d+:/)?.[1];
    const sourceRow = sourceCell.match(/\d+$/)?.[0];
    ensure(
      coordinateColumn && sourceRow,
      `${entry.file}: missing coordinate/value worksheet pair`,
    );
    rows.push(
      csv([
        entry.data.dataset_role,
        'development_candidate',
        entry.data.source_doi,
        entry.data.source_sha256,
        entry.extractSha256,
        entry.data.source_file,
        sourceCell,
        `Hoja1!${coordinateColumn}${sourceRow}`,
        series.source_label,
        entry.data.coordinate.name,
        coordinate,
        entry.data.coordinate.unit,
        metric,
        y,
        unit,
        'not_reported',
        entry.data.review_status,
      ]),
    );
  };
  for (const [entry, metric] of [
    [loaded[0], 'current_density'],
    [loaded[1], 'electrode_current'],
  ]) {
    const data = entry.data;
    countMatches(
      data.coordinate,
      data.coordinate.values,
      `${entry.file} coordinate`,
    );
    for (const series of data.series) {
      countMatches(
        series,
        series.values,
        `${entry.file} ${series.source_label}`,
      );
      const cellColumn = series.source_locator.match(/!([A-Z]+)\d+:/)?.[1];
      ensure(cellColumn, `${entry.file}: invalid worksheet locator`);
      series.values.forEach((v, i) =>
        add(
          entry,
          series,
          data.coordinate.values[i],
          metric,
          v,
          series.unit,
          `Hoja1!${cellColumn}${i + 2}`,
        ),
      );
    }
  }
  const incomplete = time.excluded_series;
  ensure(incomplete.length === 1, 'unexpected incomplete-series count');
  for (const s of incomplete) {
    ensure(
      s.observed_row_numbers.length === s.available_sample_count &&
        s.observed_time_days.length === s.available_sample_count &&
        s.observed_current_density_mA_cm2.length === s.available_sample_count,
      'incomplete trace pairs/count mismatch',
    );
    s.observed_row_numbers.forEach((row, i) => {
      ensure(
        Number.isInteger(row) && row >= 2,
        'invalid incomplete worksheet row',
      );
      add(
        loaded[0],
        s,
        s.observed_time_days[i],
        'current_density',
        s.observed_current_density_mA_cm2[i],
        'mA/cm2',
        `Hoja1!${s.worksheet_column}${row}`,
      );
    });
  }
  const observations = rows.join('\n') + '\n';

  // EIS has no frequency coordinate and an ambiguous secondary header: keep
  // paired sheet values with their row ID, never label the axis as -Im(Z).
  const eisRows = [
    csv([
      'dataset_role',
      'split',
      'source_doi',
      'source_sha256',
      'extract_sha256',
      'source_file',
      'source_cells',
      'series_label',
      'real_ohm',
      'secondary_ohm_raw',
      'frequency_status',
      'review_status',
    ]),
  ];
  for (const series of eis.series) {
    const columns = series.source_locator.match(/!([A-Z]+)\d+:([A-Z]+)\d+/);
    ensure(columns, `EIS ${series.source_label}: invalid source columns`);
    ensure(
      series.worksheet_rows.length === series.sample_count &&
        series.real_ohm.length === series.sample_count &&
        series.secondary_ohm_raw.length === series.sample_count,
      'EIS pair count mismatch',
    );
    series.worksheet_rows.forEach((row, i) => {
      ensure(
        Number.isInteger(row) &&
          Number.isFinite(series.real_ohm[i]) &&
          Number.isFinite(series.secondary_ohm_raw[i]),
        'invalid EIS numeric pair',
      );
      eisRows.push(
        csv([
          eis.dataset_role,
          'development_candidate',
          eis.source_doi,
          eis.source_sha256,
          loaded[2].extractSha256,
          eis.source_file,
          `Hoja1!${columns[1]}${row}:${columns[2]}${row}`,
          series.source_label,
          series.real_ohm[i],
          series.secondary_ohm_raw[i],
          'not_supplied',
          eis.review_status,
        ]),
      );
    });
  }
  const eisPairs = eisRows.join('\n') + '\n';
  // Aggregate paper claims are a separate kind of observation. Preserve
  // their reported shapes, qualifiers, and missing-condition explanations;
  // never turn a range/mean into an invented raw measurement pair.
  const claims = registry.records.flatMap((record) =>
    (record.extracted_claim_candidates ?? []).map((claim) => {
      ensure(
        record.doi &&
          record.source_url &&
          record.license &&
          claim.claim_id &&
          claim.metric_key &&
          claim.sample_context &&
          claim.source_locator &&
          claim.evidence_role &&
          claim.review_status &&
          claim.original_value &&
          Object.keys(claim.original_value).length &&
          claim.missing_reason &&
          !claim.eligible_for_decision,
        `${record.candidate_id}/${claim.claim_id}: incomplete candidate provenance`,
      );
      return {
        record_kind: 'published_aggregate_or_qualitative_claim',
        split: 'development_candidate',
        source_doi: record.doi,
        source_url: record.source_url,
        license: record.license,
        registry_sha256: sha(registryBytes),
        claim_id: claim.claim_id,
        metric_key: claim.metric_key,
        technology_scope: record.technology_scope,
        sample_context: claim.sample_context,
        source_locator: claim.source_locator,
        original_value: claim.original_value,
        ...(claim.original_unit ? { original_unit: claim.original_unit } : {}),
        ...(claim.uncertainty_type
          ? { uncertainty_type: claim.uncertainty_type }
          : {}),
        evidence_role: claim.evidence_role,
        review_status: claim.review_status,
        decision_eligible: false,
        independent_validation: false,
        missing_for_model_comparison: claim.missing_reason,
      };
    }),
  );
  ensure(claims.length === 26, 'unexpected literature-claim coverage');
  const literatureClaims =
    claims.map((claim) => JSON.stringify(claim)).join('\n') + '\n';
  const manifest = {
    schema_version: 'metrev-development-benchmark-v1',
    source_doi: candidate.doi,
    source_url: candidate.source_url,
    license: candidate.license,
    split: 'development_candidate',
    decision_eligible: false,
    independent_validation: false,
    original_source_hashes: loaded.map(({ file, data }) => ({
      extract_file: file,
      source_sha256: data.source_sha256,
    })),
    extract_hashes: loaded.map(({ file, extractSha256 }) => ({
      file,
      sha256: extractSha256,
    })),
    candidate_registry_sha256: sha(registryBytes),
    exports: [
      {
        file: 'observations.csv',
        row_count: rows.length - 1,
        sha256: sha(observations),
      },
      {
        file: 'eis-pairs.csv',
        row_count: eisRows.length - 1,
        sha256: sha(eisPairs),
      },
      {
        file: 'literature-claims.jsonl',
        row_count: claims.length,
        sha256: sha(literatureClaims),
      },
    ],
    study_context: time.study_context,
    exclusions: {
      time_series_missing_cells_not_interpolated: incomplete.reduce(
        (n, s) => n + s.missing_sample_count,
        0,
      ),
      unpaired_source_cells: time.unpaired_source_rows.map((row) => row.cell),
      eis_frequency: 'not_supplied',
      electrode_area_for_LSV_normalization: 'not_established',
      full_cell_wastewater_and_hydrogen_balance: 'not_supplied',
    },
    applicability: [time.applicability, lsv.applicability, eis.applicability],
  };
  ensure(
    rows.length - 1 === 39540 && eisRows.length - 1 === 290,
    'unexpected observation coverage',
  );
  return { observations, eisPairs, literatureClaims, manifest };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const output = process.argv
    .find((arg) => arg.startsWith('--output='))
    ?.slice(9);
  if (!output)
    throw new Error('Pass --output=<directory> for this offline export');
  const { observations, eisPairs, literatureClaims, manifest } =
    await buildDevelopmentBenchmark();
  await mkdir(resolve(output), { recursive: true });
  await Promise.all([
    writeFile(join(resolve(output), 'observations.csv'), observations),
    writeFile(join(resolve(output), 'eis-pairs.csv'), eisPairs),
    writeFile(
      join(resolve(output), 'literature-claims.jsonl'),
      literatureClaims,
    ),
    writeFile(
      join(resolve(output), 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
    ),
  ]);
  process.stdout.write(
    `Development export: ${manifest.exports.map((e) => `${e.row_count} ${e.file}`).join(', ')}\n`,
  );
}
