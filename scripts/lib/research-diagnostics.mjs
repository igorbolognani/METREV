import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CURATED_MANIFEST = 'packages/database/data/curated-bigdata-manifest.json';
const CANDIDATE_INDEX = 'packages/database/data/research-candidates/index.json';
const MAX_INSPECTED_ARTIFACT_BYTES = 32 * 1024 * 1024;

function readJson(repoRoot, relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return { value: null, error: `Missing file: ${relativePath}` };
  }
  try {
    return {
      value: JSON.parse(readFileSync(absolutePath, 'utf8')),
      error: null,
    };
  } catch (error) {
    return {
      value: null,
      error: `Invalid JSON in ${relativePath}: ${error.message}`,
    };
  }

  try {
    const resolvedRoot = realpathSync(repoRoot);
    const resolvedArtifact = realpathSync(absolutePath);
    if (
      resolvedArtifact !== resolvedRoot &&
      !resolvedArtifact.startsWith(`${resolvedRoot}${sep}`)
    ) {
      throw new Error(`Artifact resolves outside the repository: ${localPath}`);
    }
  } catch (error) {
    return {
      candidate_id: record.candidate_id,
      file_name: artifact.file_name ?? null,
      status: 'FAIL',
      reason: error.message,
      local_path: localPath,
    };
  }
}

function resolveRepositoryPath(repoRoot, relativePath) {
  const absoluteRoot = resolve(repoRoot);
  const absolutePath = resolve(absoluteRoot, relativePath);
  if (
    absolutePath !== absoluteRoot &&
    !absolutePath.startsWith(`${absoluteRoot}${sep}`)
  ) {
    throw new Error(`Artifact path escapes repository: ${relativePath}`);
  }
  return absolutePath;
}

function inspectArtifact(repoRoot, record, artifact) {
  const localPath = artifact.local_path;
  if (typeof localPath !== 'string' || localPath.trim() === '') {
    return {
      candidate_id: record.candidate_id,
      file_name: artifact.file_name ?? null,
      extraction_status: artifact.extraction_status ?? 'not_recorded',
      mime_type: artifact.mime_type ?? null,
      status: 'metadata_only',
      reason: 'No local artifact path is registered.',
    };
  }

  let absolutePath;
  try {
    absolutePath = resolveRepositoryPath(repoRoot, localPath);
  } catch (error) {
    return {
      candidate_id: record.candidate_id,
      file_name: artifact.file_name ?? null,
      extraction_status: artifact.extraction_status ?? 'not_recorded',
      mime_type: artifact.mime_type ?? null,
      status: 'FAIL',
      reason: error.message,
    };
  }

  if (!existsSync(absolutePath)) {
    return {
      candidate_id: record.candidate_id,
      file_name: artifact.file_name ?? null,
      extraction_status: artifact.extraction_status ?? 'not_recorded',
      mime_type: artifact.mime_type ?? null,
      status: 'FAIL',
      reason: 'Registered local artifact is missing.',
      local_path: localPath,
    };
  }

  const fileStat = statSync(absolutePath);
  if (!fileStat.isFile()) {
    return {
      candidate_id: record.candidate_id,
      file_name: artifact.file_name ?? null,
      status: 'FAIL',
      reason: 'Registered artifact path is not a regular file.',
      local_path: localPath,
    };
  }
  if (fileStat.size > MAX_INSPECTED_ARTIFACT_BYTES) {
    return {
      candidate_id: record.candidate_id,
      file_name: artifact.file_name ?? null,
      extraction_status: artifact.extraction_status ?? 'not_recorded',
      mime_type: artifact.mime_type ?? null,
      status: 'WARN',
      reason: `Artifact exceeds local audit limit of ${MAX_INSPECTED_ARTIFACT_BYTES} bytes.`,
      file_size_bytes: fileStat.size,
      local_path: localPath,
    };
  }

  const fileHash = createHash('sha256')
    .update(readFileSync(absolutePath))
    .digest('hex');
  const sizeMatches =
    Number.isInteger(artifact.file_size_bytes) &&
    artifact.file_size_bytes === fileStat.size;
  const hashMatches =
    typeof artifact.sha256 === 'string' && artifact.sha256 === fileHash;
  const checks = {
    size_matches: sizeMatches,
    sha256_matches: hashMatches,
    mime_type_recorded:
      typeof artifact.mime_type === 'string' && artifact.mime_type.length > 0,
    license_recorded:
      typeof record.license === 'string' && record.license.length > 0,
    source_locator_recorded:
      typeof artifact.source_locator === 'string' &&
      artifact.source_locator.length > 0,
  };
  const provenanceMatches =
    checks.mime_type_recorded &&
    checks.license_recorded &&
    checks.source_locator_recorded;

  return {
    candidate_id: record.candidate_id,
    file_name: artifact.file_name ?? null,
    extraction_status: artifact.extraction_status ?? 'not_recorded',
    mime_type: artifact.mime_type ?? null,
    status: hashMatches && sizeMatches && provenanceMatches ? 'PASS' : 'FAIL',
    reason:
      hashMatches && sizeMatches && provenanceMatches
        ? null
        : 'File identity or required artifact provenance metadata did not match.',
    local_path: localPath,
    file_size_bytes: fileStat.size,
    registered_file_size_bytes: artifact.file_size_bytes ?? null,
    sha256: fileHash,
    registered_sha256: artifact.sha256 ?? null,
    checks,
  };
}

function flattenClaims(records) {
  return records.flatMap((record) =>
    (Array.isArray(record.extracted_claim_candidates)
      ? record.extracted_claim_candidates
      : []
    ).map((claim) => ({ ...claim, candidate_id: record.candidate_id })),
  );
}

function countBy(items, keyReader) {
  return items.reduce((result, item) => {
    const key = keyReader(item) ?? 'unspecified';
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}

function baseInputs(repoRoot) {
  const curatedRead = readJson(repoRoot, CURATED_MANIFEST);
  const candidateRead = readJson(repoRoot, CANDIDATE_INDEX);
  const curated = curatedRead.value;
  const candidateIndex = candidateRead.value;
  const candidateRecords = Array.isArray(candidateIndex?.records)
    ? candidateIndex.records
    : [];
  const artifacts = candidateRecords.flatMap((record) =>
    (Array.isArray(record.artifacts) ? record.artifacts : []).map((artifact) =>
      inspectArtifact(repoRoot, record, artifact),
    ),
  );
  const claims = flattenClaims(candidateRecords);
  const recordIds = candidateRecords.map((record) => record.candidate_id);
  const duplicatedRecordIds = recordIds.filter(
    (id, index) => id && recordIds.indexOf(id) !== index,
  );
  const contractErrors = [];

  if (curatedRead.error) contractErrors.push(curatedRead.error);
  if (candidateRead.error) contractErrors.push(candidateRead.error);
  if (!Array.isArray(curated?.records)) {
    contractErrors.push('Curated manifest records must be an array.');
  } else if (curated.recordCount !== curated.records.length) {
    contractErrors.push(
      `Curated manifest recordCount (${curated.recordCount}) does not match records.length (${curated.records.length}).`,
    );
  }
  if (!Array.isArray(candidateIndex?.records)) {
    contractErrors.push('Candidate registry records must be an array.');
  } else if (
    !candidateIndex?.counts ||
    typeof candidateIndex.counts !== 'object'
  ) {
    contractErrors.push('Candidate registry counts are required.');
  } else {
    const recordsWithLocalArtifacts = candidateRecords.filter((record) =>
      record.artifacts?.some(
        (artifact) =>
          typeof artifact.local_path === 'string' &&
          artifact.local_path.trim().length > 0,
      ),
    ).length;
    const actualCounts = {
      candidate_records: candidateRecords.length,
      records_with_local_artifacts: recordsWithLocalArtifacts,
      records_metadata_only:
        candidateRecords.length - recordsWithLocalArtifacts,
      human_review_complete: candidateRecords.filter(
        (record) => record.candidate_status === 'reviewed',
      ).length,
      decision_eligible: candidateRecords.filter(
        (record) => record.eligible_for_decision === true,
      ).length,
    };
    for (const [key, actualCount] of Object.entries(actualCounts)) {
      if (candidateIndex.counts[key] !== actualCount) {
        contractErrors.push(
          `Candidate registry count ${key} (${candidateIndex.counts[key]}) does not match records (${actualCount}).`,
        );
      }
    }
  }
  if (duplicatedRecordIds.length) {
    contractErrors.push(
      `Duplicate candidate identifiers: ${[...new Set(duplicatedRecordIds)].join(', ')}.`,
    );
  }

  for (const record of candidateRecords) {
    for (const required of [
      'candidate_id',
      'document_type',
      'title',
      'source_url',
      'license',
      'candidate_status',
    ]) {
      if (typeof record[required] !== 'string' || !record[required].trim()) {
        contractErrors.push(
          `${record.candidate_id ?? 'record without id'} is missing ${required}.`,
        );
      }
    }
    if (
      record.license === 'not_assessed' &&
      !(typeof record.rights_status === 'string' && record.rights_status.trim())
    ) {
      contractErrors.push(
        `${record.candidate_id} has unassessed reuse rights without an explicit rights_status.`,
      );
    }
    if (record.eligible_for_decision !== false) {
      contractErrors.push(
        `${record.candidate_id} must remain ineligible until analyst review.`,
      );
    }
  }

  const claimErrors = [];
  for (const claim of claims) {
    if (
      !claim.claim_id ||
      !claim.metric_key ||
      !claim.source_locator ||
      !claim.evidence_role ||
      !claim.source_kind ||
      !claim.review_status ||
      !claim.missing_reason ||
      !Object.hasOwn(claim, 'original_unit')
    ) {
      claimErrors.push(
        `${claim.claim_id ?? 'claim without id'} lacks required value provenance, unit, review, or missing-data metadata.`,
      );
    }
    if (claim.eligible_for_decision !== false) {
      claimErrors.push(
        `${claim.claim_id ?? 'claim without id'} is not explicitly blocked from decision inputs.`,
      );
    }
  }

  return {
    curated,
    candidateIndex,
    candidateRecords,
    artifacts,
    claims,
    contractErrors,
    claimErrors,
  };
}

function statusFor({ failures = 0, incomplete = false }) {
  if (failures > 0) return 'FAIL';
  return incomplete ? 'WARN' : 'PASS';
}

function localFailures(inputs) {
  return [
    ...inputs.contractErrors,
    ...inputs.claimErrors,
    ...inputs.artifacts
      .filter((artifact) => artifact.status === 'FAIL')
      .map(
        (artifact) =>
          `${artifact.candidate_id}/${artifact.file_name}: ${artifact.reason}`,
      ),
  ];
}

export function buildCorpusScore(repoRoot) {
  const inputs = baseInputs(repoRoot);
  const artifactFailures = inputs.artifacts.filter(
    (artifact) => artifact.status === 'FAIL',
  ).length;
  const claimsMissingLocator = inputs.claims.filter(
    (claim) => !claim.source_locator,
  ).length;
  const reviewedClaims = inputs.claims.filter(
    (claim) => claim.review_status === 'approved',
  ).length;
  const curatedRecordCount = Array.isArray(inputs.curated?.records)
    ? inputs.curated.records.length
    : null;
  const incomplete =
    curatedRecordCount === 0 ||
    reviewedClaims === 0 ||
    inputs.candidateRecords.some(
      (record) => record.candidate_status !== 'reviewed',
    );

  return {
    tool: 'corpus-score',
    version: 'corpus-score-v2',
    mode: 'offline_local_read_only',
    generated_at: new Date().toISOString(),
    status: statusFor({
      failures:
        inputs.contractErrors.length +
        artifactFailures +
        inputs.claimErrors.length,
      incomplete,
    }),
    totals: {
      curated_source_records: curatedRecordCount,
      curated_claims: inputs.curated?.claimCount ?? null,
      candidate_source_records: inputs.candidateRecords.length,
      candidate_records_with_local_artifacts: new Set(
        inputs.artifacts
          .filter((artifact) => artifact.local_path)
          .map((artifact) => artifact.candidate_id),
      ).size,
      metadata_only_candidates: inputs.candidateRecords.filter(
        (record) => !record.artifacts?.some((artifact) => artifact.local_path),
      ).length,
      source_artifacts_registered: inputs.artifacts.length,
      source_artifacts_hash_verified: inputs.artifacts.filter(
        (artifact) => artifact.status === 'PASS',
      ).length,
      candidate_claims: inputs.claims.length,
      candidate_claims_with_source_locator:
        inputs.claims.length - claimsMissingLocator,
      candidate_claims_reviewed: reviewedClaims,
      decision_eligible_claims: inputs.claims.filter(
        (claim) => claim.eligible_for_decision === true,
      ).length,
    },
    artifact_status_counts: countBy(inputs.artifacts, (item) => item.status),
    claim_review_status_counts: countBy(
      inputs.claims,
      (item) => item.review_status,
    ),
    failures: localFailures(inputs),
    notes: [
      'Candidate and curated records are counted separately. Candidate sources do not become decision evidence automatically.',
      'A SHA-256 check confirms local file identity only; it does not establish extraction correctness or scientific validity.',
    ],
  };
}

export function buildResearchCoverage(repoRoot) {
  const inputs = baseInputs(repoRoot);
  const candidateMetrics = new Map();
  for (const claim of inputs.claims) {
    candidateMetrics.set(
      claim.metric_key,
      (candidateMetrics.get(claim.metric_key) ?? 0) + 1,
    );
  }

  const candidateClaimsFor = (predicate) =>
    inputs.claims.filter(predicate).length;
  const recordsFor = (predicate) =>
    inputs.candidateRecords.filter(predicate).length;
  const hasWastewaterScope = (record) =>
    record.technology_scope?.some((scope) => scope.includes('wastewater'));
  const areas = [
    {
      area: 'MFC wastewater treatment and effluent quality',
      relevant_candidates: recordsFor(
        (record) =>
          record.technology_scope?.includes('MFC') &&
          hasWastewaterScope(record),
      ),
      source_reported_claims: candidateClaimsFor((claim) =>
        claim.metric_key.startsWith('wastewater.'),
      ),
      decision_ready_claims: 0,
      status: candidateClaimsFor((claim) =>
        claim.metric_key.startsWith('wastewater.cod_'),
      )
        ? 'literature_reported_COD_removal_claim_needs_sample_level_table_review'
        : 'BOD5_candidate_only_no_reconciled_COD_or_effluent_dataset',
    },
    {
      area: 'MFC electrical output under wastewater conditions',
      relevant_candidates: recordsFor(
        (record) =>
          record.technology_scope?.includes('MFC') &&
          hasWastewaterScope(record),
      ),
      source_reported_claims: candidateClaimsFor((claim) =>
        /(^|\.)(current|voltage|power|electrical|coulombic)/i.test(
          claim.metric_key,
        ),
      ),
      decision_ready_claims: 0,
      status: 'downloaded_source_tables_or_figures_need_cell_level_review',
    },
    {
      area: 'MEC electrode and electrochemical characterization',
      relevant_candidates: recordsFor((record) =>
        record.technology_scope?.includes('MEC'),
      ),
      source_reported_claims: candidateClaimsFor((claim) =>
        claim.metric_key.startsWith('mec.'),
      ),
      decision_ready_claims: 0,
      status: 'ODS_current_EIS_LSV_files_wait_for_cell_level_extraction',
    },
    {
      area: 'MEC wastewater COD, gross hydrogen, and captured hydrogen',
      relevant_candidates: recordsFor(
        (record) =>
          record.technology_scope?.includes('MEC') &&
          hasWastewaterScope(record),
      ),
      source_reported_claims: candidateClaimsFor((claim) =>
        /(^|\.)(cod|hydrogen|h2)/i.test(claim.metric_key),
      ),
      decision_ready_claims: 0,
      status: 'no_compatible_external_observation_claims',
    },
    {
      area: 'Standalone electrochemical biosensor analytical performance',
      relevant_candidates: recordsFor((record) =>
        record.technology_scope?.includes('standalone_biosensor'),
      ),
      source_reported_claims: candidateClaimsFor((claim) =>
        claim.metric_key.startsWith('standalone_biosensor.'),
      ),
      decision_ready_claims: 0,
      status: 'no_candidate_with_standalone_sensor_calibration',
    },
    {
      area: 'MFC-integrated BOD biosensor',
      relevant_candidates: recordsFor(
        (record) =>
          record.technology_scope?.includes('MFC') &&
          record.technology_scope?.includes('electrochemical_biosensor'),
      ),
      source_reported_claims: candidateClaimsFor((claim) =>
        claim.metric_key.startsWith('biosensor.'),
      ),
      decision_ready_claims: 0,
      status: 'literature_claims_are_candidate_only_and_not_model_equivalent',
    },
    {
      area: 'MEC-integrated biosensor',
      relevant_candidates: recordsFor(
        (record) =>
          record.technology_scope?.includes('MEC') &&
          record.technology_scope?.includes('electrochemical_biosensor'),
      ),
      source_reported_claims: candidateClaimsFor((claim) =>
        claim.metric_key.startsWith('mec.biosensor.'),
      ),
      decision_ready_claims: 0,
      status: 'no_candidate',
    },
  ];

  return {
    tool: 'research-coverage-report',
    version: 'research-coverage-v2',
    mode: 'offline_local_read_only',
    generated_at: new Date().toISOString(),
    status: localFailures(inputs).length ? 'FAIL' : 'WARN',
    counts: {
      candidate_records: inputs.candidateRecords.length,
      local_artifacts: inputs.artifacts.length,
      extracted_claim_candidates: inputs.claims.length,
      reviewed_claims: inputs.claims.filter(
        (claim) => claim.review_status === 'approved',
      ).length,
      decision_ready_claims: 0,
    },
    claim_metric_keys: Object.fromEntries(candidateMetrics),
    coverage_by_area: areas,
    missing_reason_summary: inputs.candidateRecords.map((record) => ({
      candidate_id: record.candidate_id,
      reasons: record.missing_data_reasons ?? {},
    })),
    failures: localFailures(inputs),
    notes: [
      'This report inspects checked-in candidate metadata and local files. It does not query or mutate PostgreSQL and does not call literature providers.',
      'Coverage counts indicate staged candidate evidence only; they do not count as independent model validation.',
    ],
  };
}

export function buildAuditExplain(repoRoot) {
  const inputs = baseInputs(repoRoot);
  const records = inputs.candidateRecords;
  const artifactCandidates = new Set(
    inputs.artifacts
      .filter((artifact) => artifact.local_path)
      .map((artifact) => artifact.candidate_id),
  );
  const integrityCandidates = new Set(
    inputs.artifacts
      .filter((artifact) => artifact.status === 'PASS')
      .map((artifact) => artifact.candidate_id),
  );
  const stages = [
    { stage: 'candidate_source_record', records: records.length },
    {
      stage: 'source_url_and_reuse_rights_documented',
      records: records.filter(
        (record) =>
          record.source_url &&
          ((record.license && record.license !== 'not_assessed') ||
            record.rights_status),
      ).length,
    },
    {
      stage: 'local_source_artifact_retrieved',
      records: artifactCandidates.size,
    },
    {
      stage: 'all_registered_local_artifacts_hash_verified',
      records: integrityCandidates.size,
    },
    {
      stage: 'structured_claim_candidate_extracted',
      records: new Set(inputs.claims.map((claim) => claim.candidate_id)).size,
      claims: inputs.claims.length,
    },
    {
      stage: 'human_claim_review_complete',
      records: new Set(
        inputs.claims
          .filter((claim) => claim.review_status === 'approved')
          .map((claim) => claim.candidate_id),
      ).size,
      claims: inputs.claims.filter(
        (claim) => claim.review_status === 'approved',
      ).length,
    },
    {
      stage: 'decision_eligible',
      records: records.filter((record) => record.eligible_for_decision === true)
        .length,
      claims: inputs.claims.filter(
        (claim) => claim.eligible_for_decision === true,
      ).length,
    },
  ];
  const issueFlags = [];
  if ((inputs.curated?.recordCount ?? 0) === 0) {
    issueFlags.push({
      code: 'CURATED_CORPUS_EMPTY',
      severity: 'warning',
      count: 1,
      detail:
        'No human-reviewed source has been admitted to the curated corpus.',
    });
  }
  if (inputs.claims.some((claim) => claim.review_status !== 'approved')) {
    issueFlags.push({
      code: 'CLAIMS_AWAIT_HUMAN_REVIEW',
      severity: 'warning',
      count: inputs.claims.filter((claim) => claim.review_status !== 'approved')
        .length,
      detail:
        'Extracted values remain literature candidates and are blocked from decision inputs.',
    });
  }
  if (
    inputs.artifacts.some((artifact) =>
      artifact.extraction_status?.includes('needs_table'),
    )
  ) {
    issueFlags.push({
      code: 'SPREADSHEET_TABLE_EXTRACTION_PENDING',
      severity: 'warning',
      count: inputs.artifacts.filter((artifact) =>
        artifact.extraction_status?.includes('needs_table'),
      ).length,
      detail:
        'The source ODS files are retained unchanged; cell-level extraction and units need analyst review.',
    });
  }
  if (localFailures(inputs).length) {
    issueFlags.push({
      code: 'LOCAL_PROVENANCE_INTEGRITY_FAILURE',
      severity: 'error',
      count: localFailures(inputs).length,
      detail:
        'Candidate metadata, local artifact identity, or claim provenance failed the local audit.',
    });
  }

  return {
    tool: 'audit-explain',
    version: 'audit-explain-v2',
    mode: 'offline_local_read_only',
    generated_at: new Date().toISOString(),
    status: localFailures(inputs).length ? 'FAIL' : 'WARN',
    funnels: {
      research_evidence: stages,
    },
    issue_flags: issueFlags,
    artifact_integrity: inputs.artifacts,
    failures: localFailures(inputs),
    notes: [
      'This is a real local provenance audit, not the API-server audit endpoint. The audit itself never contacts a provider or database.',
      'Dataset source records and research claims remain separate; reported literature measurements are not METREV case measurements.',
    ],
  };
}

function providerProbeSpec(provider) {
  const query = 'microbial fuel cell wastewater';
  if (provider === 'openalex') {
    const url = new URL('https://api.openalex.org/works');
    url.searchParams.set('search', query);
    url.searchParams.set('per_page', '1');
    url.searchParams.set('select', 'id,doi,title');
    return {
      url,
      readRecords: (payload) => payload.results ?? [],
      readIdentifier: (record) => record.doi ?? record.id ?? null,
    };
  }
  if (provider === 'crossref') {
    const url = new URL('https://api.crossref.org/works');
    url.searchParams.set('query.bibliographic', query);
    url.searchParams.set('rows', '1');
    url.searchParams.set('select', 'DOI,title,type,license');
    return {
      url,
      readRecords: (payload) => payload.message?.items ?? [],
      readIdentifier: (record) => record.DOI ?? null,
    };
  }
  const url = new URL(
    'https://www.ebi.ac.uk/europepmc/webservices/rest/search',
  );
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('pageSize', '1');
  url.searchParams.set('resultType', 'core');
  return {
    url,
    readRecords: (payload) => payload.resultList?.result ?? [],
    readIdentifier: (record) => record.doi ?? record.id ?? null,
  };
}

async function runProviderProbe(provider) {
  const spec = providerProbeSpec(provider);
  try {
    const response = await fetch(spec.url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'METREV read-only provider readiness probe',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return {
        status: 'WARN',
        http_status: response.status,
        records_returned: null,
        note: 'Provider endpoint responded with a non-success HTTP status.',
      };
    }
    const payload = await response.json();
    const records = spec.readRecords(payload);
    if (!Array.isArray(records)) {
      return {
        status: 'WARN',
        http_status: response.status,
        records_returned: null,
        note: 'Provider returned JSON in an unexpected search-result shape.',
      };
    }
    return {
      status: 'PASS',
      http_status: response.status,
      records_returned: records.length,
      sample_identifier: records[0] ? spec.readIdentifier(records[0]) : null,
      note: 'One bounded metadata-only GET completed; no full text was requested or stored.',
    };
  } catch (error) {
    return {
      status: 'WARN',
      http_status: null,
      records_returned: null,
      error_name: error?.name ?? 'Error',
      note: 'Provider request failed or timed out; no retry was attempted.',
    };
  }
}

async function summarizeProviderReadiness(env, probeProviders) {
  const providers = {
    openalex: {
      configured: true,
      api_key_configured: Boolean(env.OPENALEX_API_KEY?.trim()),
      api_key_required_for_basic_search: false,
      status: 'public_api_available_not_tested',
    },
    crossref: {
      configured: true,
      contact_configured: Boolean(env.CROSSREF_MAILTO?.trim()),
      status: env.CROSSREF_MAILTO?.trim()
        ? 'public_api_contact_present_not_tested'
        : 'public_api_available_contact_optional_not_tested',
    },
    europe_pmc: {
      configured: true,
      contact_configured: Boolean(env.EUROPE_PMC_EMAIL?.trim()),
      status: env.EUROPE_PMC_EMAIL?.trim()
        ? 'public_api_contact_present_not_tested'
        : 'public_api_available_contact_optional_not_tested',
    },
  };
  if (!probeProviders) {
    return {
      ...providers,
      probe_status: 'NOT_RUN',
      check_status: 'WARN',
      note: 'Offline mode: provider endpoints were not contacted. OpenAlex basic search is public and its API key is optional. Use --probe-providers for one read-only metadata GET per provider; this does not download full text, ingest records, or write a database.',
    };
  }

  const probes = Object.fromEntries(
    await Promise.all(
      ['openalex', 'crossref', 'europe_pmc'].map(async (provider) => [
        provider,
        await runProviderProbe(provider),
      ]),
    ),
  );
  const probeStatus = Object.values(probes).every(
    (probe) => probe.status === 'PASS',
  )
    ? 'PASS'
    : 'WARN';
  return {
    ...providers,
    probes,
    probe_status: probeStatus,
    check_status: probeStatus,
    note: 'Online probe: one bounded metadata-only GET was sent to each public provider. No full text was requested or stored, no ingestion ran, and no database was contacted.',
  };
}

function safeDatabaseTarget(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return {
      host: parsed.hostname,
      port: parsed.port || null,
      database: parsed.pathname.replace(/^\//, '') || null,
      scheme: parsed.protocol.replace(':', ''),
    };
  } catch {
    return { status: 'DATABASE_URL is not a valid URL.' };
  }
}

async function readDatabaseSnapshot(databaseUrl) {
  const databasePackagePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../packages/database/package.json',
  );
  const require = createRequire(databasePackagePath);
  const { Client } = require('pg');
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
    const readOnly = await client.query('SHOW default_transaction_read_only');
    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM "ExternalSourceRecord") AS source_records,
        (SELECT count(*)::int FROM "SourceArtifactRecord") AS source_artifacts,
        (SELECT count(*)::int FROM "SourceTextChunkRecord") AS source_text_chunks,
        (SELECT count(*)::int FROM "ResearchReview") AS research_reviews,
        (SELECT count(*)::int FROM "ResearchReviewPaper") AS review_source_links,
        (SELECT count(*)::int FROM "ResearchExtractionResult") AS extraction_results,
        (SELECT count(*)::int FROM "EvidenceClaim") AS evidence_claims,
        (SELECT count(*)::int FROM "ScientificEvidenceFact") AS scientific_facts
    `);
    return {
      status:
        readOnly.rows[0]?.default_transaction_read_only === 'on'
          ? 'PASS'
          : 'FAIL',
      transaction_mode: readOnly.rows[0]?.default_transaction_read_only ?? null,
      counts: counts.rows[0] ?? null,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function buildDoctorReport(repoRoot, options = {}) {
  const corpus = buildCorpusScore(repoRoot);
  const coverage = buildResearchCoverage(repoRoot);
  const audit = buildAuditExplain(repoRoot);
  const providerReadiness = await summarizeProviderReadiness(
    options.env ?? process.env,
    options.probeProviders === true,
  );
  const databaseUrl = (options.env ?? process.env).DATABASE_URL?.trim();
  let database = {
    configured: Boolean(databaseUrl),
    inspected: false,
    status: databaseUrl ? 'WARN' : 'WARN',
    target: databaseUrl ? safeDatabaseTarget(databaseUrl) : null,
    note: databaseUrl
      ? 'DATABASE_URL is present but no connection was opened. Pass --database-readonly to perform SELECT-only counts in a read-only session.'
      : 'DATABASE_URL is not configured; no database connection was attempted.',
  };

  if (databaseUrl && options.databaseReadonly) {
    try {
      const snapshot = await readDatabaseSnapshot(databaseUrl);
      database = {
        configured: true,
        inspected: true,
        target: safeDatabaseTarget(databaseUrl),
        ...snapshot,
        note: 'Only SELECT counts were run after setting the session default to read-only.',
      };
    } catch (error) {
      database = {
        configured: true,
        inspected: true,
        status: 'FAIL',
        target: safeDatabaseTarget(databaseUrl),
        error_code: error.code ?? null,
        error: String(error.message ?? error).slice(0, 400),
        note: 'Explicit read-only database inspection failed; no write statement is used by this command.',
      };
    }
  }

  const localIntegrityFailures = corpus.failures.length;
  const checks = [
    {
      label: 'curated-manifest',
      status: corpus.totals.curated_source_records === 0 ? 'WARN' : 'PASS',
      payload: {
        record_count: corpus.totals.curated_source_records,
        claim_count: corpus.totals.curated_claims,
        note: 'Zero is the current reviewed/admitted count; candidate records are reported separately.',
      },
    },
    {
      label: 'candidate-registry-and-provenance',
      status: localIntegrityFailures ? 'FAIL' : 'PASS',
      payload: {
        source_records: corpus.totals.candidate_source_records,
        artifacts_hash_verified: corpus.totals.source_artifacts_hash_verified,
        artifacts_registered: corpus.totals.source_artifacts_registered,
        claims_with_locator: corpus.totals.candidate_claims_with_source_locator,
      },
    },
    {
      label: 'analyst-review-and-decision-eligibility',
      status: corpus.totals.candidate_claims_reviewed === 0 ? 'WARN' : 'PASS',
      payload: {
        candidate_claims: corpus.totals.candidate_claims,
        reviewed_claims: corpus.totals.candidate_claims_reviewed,
        decision_eligible_claims: corpus.totals.decision_eligible_claims,
      },
    },
    {
      label: 'source-format-extraction',
      status: corpus.status === 'FAIL' ? 'FAIL' : 'WARN',
      payload: {
        artifact_types: countBy(baseInputs(repoRoot).artifacts, (artifact) =>
          artifact.file_name?.split('.').at(-1)?.toLowerCase(),
        ),
        note: 'PDF text extraction is recorded; ODS tables still require cell-level extraction and analyst review.',
      },
    },
    {
      label: 'provider-readiness',
      status: providerReadiness.check_status,
      payload: providerReadiness,
    },
    {
      label: 'database-read-only-readiness',
      status: database.status,
      payload: database,
    },
  ];

  if (options.full) {
    const layoutSummaryPath = resolve(
      repoRoot,
      'test-results/layout-audit/summary.json',
    );
    if (!existsSync(layoutSummaryPath)) {
      checks.push({
        label: 'ui-layout-audit',
        status: 'WARN',
        payload: { note: 'No saved browser layout audit summary was found.' },
      });
    } else {
      const layout = readJson(
        repoRoot,
        'test-results/layout-audit/summary.json',
      );
      const totals = layout.value?.totals;
      checks.push({
        label: 'ui-layout-audit',
        status: layout.error ? 'FAIL' : totals?.failed === 0 ? 'PASS' : 'FAIL',
        payload: layout.error ? { error: layout.error } : { totals },
      });
    }
  }

  const failed = checks.some((check) => check.status === 'FAIL');
  const warned = checks.some((check) => check.status === 'WARN');
  return {
    tool: 'metrev-doctor',
    version: 'metrev-doctor-v2',
    generated_at: new Date().toISOString(),
    mode:
      options.databaseReadonly && options.probeProviders
        ? 'online_provider_probe_plus_read_only_database'
        : options.databaseReadonly
          ? 'offline_local_audit_plus_explicit_read_only_database'
          : options.probeProviders
            ? 'online_provider_probe_read_only'
            : 'offline_local_read_only',
    status: failed ? 'FAIL' : warned ? 'WARN' : 'PASS',
    checks,
    summaries: { corpus, research_coverage: coverage, evidence_audit: audit },
    scientific_readiness: {
      independent_model_validation: 'not_established',
      uncertainty_propagation: 'not_implemented',
      solver_scope: 'lumped_isothermal_0d_uncalibrated',
      candidate_evidence_is_measurement_of_local_case: false,
    },
    notes: [
      options.probeProviders
        ? 'Doctor audits real local manifests, source references, file hashes, extraction statuses, and eligibility gates; --probe-providers adds bounded read-only metadata GETs only. It does not fill missing science, ingest records, download full text, or write a database.'
        : 'Doctor audits real local manifests, source references, file hashes, extraction statuses, and eligibility gates. In offline mode it does not fill missing science, ingest records, call providers, or write a database.',
      'PASS from a contract or numerical test proves only the tested property and does not establish predictive accuracy.',
    ],
  };
}

export function writeCliReport(report, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `[${report.tool}] overall=${report.status} mode=${report.mode}`,
    );
    for (const check of report.checks ?? []) {
      console.log(`  - ${check.label}: ${check.status}`);
    }
  }
}

export function exitCodeFor(report) {
  return report.status === 'FAIL' ? 1 : report.status === 'WARN' ? 2 : 0;
}
