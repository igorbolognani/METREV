import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildCorpusScore,
  buildDoctorReport,
} from '../../scripts/lib/research-diagnostics.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('local research diagnostics', () => {
  it('audits the checked-in source candidates and reports honest readiness warnings', async () => {
    const report = await buildDoctorReport(repoRoot, { env: {} });
    const corpus = report.summaries.corpus;
    const coverage = report.summaries.research_coverage;

    expect(report.status).toBe('WARN');
    expect(
      report.checks.find(
        (check) => check.label === 'candidate-registry-and-provenance',
      )?.status,
    ).toBe('PASS');
    expect(corpus.totals.candidate_source_records).toBe(8);
    expect(corpus.totals.curated_source_records).toBe(0);
    expect(corpus.totals.source_artifacts_registered).toBe(6);
    expect(corpus.totals.source_artifacts_hash_verified).toBe(6);
    expect(corpus.totals.candidate_claims).toBe(26);
    expect(corpus.totals.candidate_claims_reviewed).toBe(0);
    expect(corpus.totals.decision_eligible_claims).toBe(0);
    expect(
      coverage.coverage_by_area.find(
        (area) => area.area === 'MFC-integrated BOD biosensor',
      )?.source_reported_claims,
    ).toBe(18);
    expect(
      report.checks.find((check) => check.label === 'provider-readiness')
        ?.payload.openalex.api_key_required_for_basic_search,
    ).toBe(false);
    expect(
      report.checks.find(
        (check) => check.label === 'database-read-only-readiness',
      )?.payload.inspected,
    ).toBe(false);
  });

  it('fails local file integrity when a registered candidate artifact changes', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'metrev-diagnostics-'));
    temporaryDirectories.push(root);
    const dataDirectory = resolve(root, 'packages/database/data');
    const candidateDirectory = resolve(dataDirectory, 'research-candidates');
    const fileDirectory = resolve(candidateDirectory, 'candidate-1');
    await mkdir(fileDirectory, { recursive: true });

    await writeFile(
      resolve(dataDirectory, 'curated-bigdata-manifest.json'),
      JSON.stringify({ recordCount: 0, claimCount: 0, records: [] }),
    );
    const artifactBytes = Buffer.from('original source record\n');
    await writeFile(resolve(fileDirectory, 'source.txt'), artifactBytes);
    const candidateIndex = {
      counts: {
        candidate_records: 1,
        records_with_local_artifacts: 1,
        records_metadata_only: 0,
        human_review_complete: 0,
        decision_eligible: 0,
      },
      records: [
        {
          candidate_id: 'candidate-1',
          document_type: 'dataset',
          title: 'A test candidate',
          source_url: 'https://example.org/source',
          license: 'CC0-1.0',
          candidate_status: 'needs_human_review',
          eligible_for_decision: false,
          artifacts: [
            {
              file_name: 'source.txt',
              local_path:
                'packages/database/data/research-candidates/candidate-1/source.txt',
              file_size_bytes: artifactBytes.byteLength,
              sha256: createHash('sha256').update(artifactBytes).digest('hex'),
              mime_type: 'text/plain',
              source_locator: 'Repository record, file 1',
              extraction_status: 'not_extracted',
            },
          ],
        },
      ],
    };
    await writeFile(
      resolve(candidateDirectory, 'index.json'),
      JSON.stringify(candidateIndex),
    );

    const beforeTamper = buildCorpusScore(root);
    expect(beforeTamper.artifact_status_counts.PASS).toBe(1);
    expect(beforeTamper.status).toBe('WARN');

    await writeFile(resolve(fileDirectory, 'source.txt'), 'altered bytes\n');
    const afterTamper = buildCorpusScore(root);
    expect(afterTamper.artifact_status_counts.FAIL).toBe(1);
    expect(afterTamper.status).toBe('FAIL');
    expect(afterTamper.failures).toContain(
      'candidate-1/source.txt: File identity or required artifact provenance metadata did not match.',
    );
  });

  it('probes public metadata providers only when explicitly requested', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = new URL(String(input));
        const payload =
          url.hostname === 'api.openalex.org'
            ? { results: [{ doi: 'https://doi.org/10.1234/openalex' }] }
            : url.hostname === 'api.crossref.org'
              ? { message: { items: [{ DOI: '10.1234/crossref' }] } }
              : { resultList: { result: [{ doi: '10.1234/europepmc' }] } };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

    const offlineReport = await buildDoctorReport(repoRoot, { env: {} });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(
      offlineReport.checks.find((check) => check.label === 'provider-readiness')
        ?.payload.probe_status,
    ).toBe('NOT_RUN');

    const probedReport = await buildDoctorReport(repoRoot, {
      env: {},
      probeProviders: true,
    });
    const readiness = probedReport.checks.find(
      (check) => check.label === 'provider-readiness',
    );

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(readiness?.status).toBe('PASS');
    expect(readiness?.payload.probes.openalex.sample_identifier).toContain(
      '10.1234/openalex',
    );
    expect(readiness?.payload.probes.crossref.sample_identifier).toBe(
      '10.1234/crossref',
    );
    expect(readiness?.payload.probes.europe_pmc.sample_identifier).toBe(
      '10.1234/europepmc',
    );
    expect(
      probedReport.checks.find(
        (check) => check.label === 'database-read-only-readiness',
      )?.payload.inspected,
    ).toBe(false);
  });
});
