import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  evaluateCase,
  fetchEvidenceExplorerAssistant,
  fetchEvidenceExplorerCsvExport,
  fetchEvidenceExplorerWorkspace,
  fetchEvaluationCsvExport,
  fetchEvaluationList,
} from '../../apps/web-ui/src/lib/api';

const fetchMock = vi.fn<typeof fetch>();

describe('web API client helpers', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('sends the idempotency key when evaluating a case', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          evaluation_id: 'eval-001',
          case_id: 'CASE-001',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    await evaluateCase({ case_id: 'CASE-001' } as never, {
      idempotencyKey: 'idem-001',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/cases/evaluate',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'idempotency-key': 'idem-001',
        }),
      }),
    );
  });

  it('builds the expected query string for evaluation list filters', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
          summary: {
            total: 0,
            filtered_total: 0,
            page: 2,
            page_size: 25,
            total_pages: 0,
            returned: 0,
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    await fetchEvaluationList({
      confidence: 'high',
      query: ' CASE-001 ',
      sortKey: 'created_at',
      sortDirection: 'desc',
      page: 2,
      pageSize: 25,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/evaluations?confidence=high&q=CASE-001&sort=created_at&dir=desc&page=2&pageSize=25',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      }),
    );
  });

  it('parses CSV export metadata from response headers', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response('id,value\n1,ok\n', {
        status: 200,
        headers: {
          'content-type': 'text/csv',
          'content-disposition': 'attachment; filename="workspace-export.csv"',
          'x-metrev-export-generated-at': '2026-04-24T12:00:00.000Z',
          'x-metrev-workspace-schema-version': 'workspace-v1',
        },
      }),
    );

    const result = await fetchEvaluationCsvExport('eval-001');

    expect(result).toEqual({
      content: 'id,value\n1,ok\n',
      metadata: {
        content_type: 'text/csv',
        generated_at: '2026-04-24T12:00:00.000Z',
        file_name: 'workspace-export.csv',
        workspace_schema_version: 'workspace-v1',
      },
    });
  });

  it('calls the dedicated explorer workspace route with the expected query string', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          meta: {},
          filters: {},
          summary: {
            total: 0,
            filtered_total: 0,
            pending: 0,
            accepted: 0,
            rejected: 0,
            page: 2,
            page_size: 50,
            total_pages: 1,
            returned: 0,
          },
          spotlight: [],
          items: [],
          table_groups: {
            intake_ready: [],
            recently_published: [],
          },
          warehouse_facets: {
            source_types: [],
            evidence_types: [],
            review_statuses: [],
            publishers: [],
          },
          warehouse_snapshot: {
            filtered_item_count: 0,
            returned_item_count: 0,
            claim_count: 0,
            reviewed_claim_count: 0,
            doi_count: 0,
            linked_source_count: 0,
            publisher_count: 0,
          },
          export_csv_href: '/api/exports/evidence/explorer/csv',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    await fetchEvidenceExplorerWorkspace({
      status: 'accepted',
      query: ' benchmark ',
      sourceType: 'crossref',
      page: 2,
      pageSize: 50,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/workspace/evidence/explorer?status=accepted&q=benchmark&sourceType=crossref&page=2&pageSize=50',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      }),
    );
  });

  it('calls the dedicated explorer assistant route with the expected query string', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          meta: {},
          filters: {},
          warehouse_snapshot: {
            filtered_item_count: 1,
            returned_item_count: 1,
            claim_count: 1,
            reviewed_claim_count: 0,
            doi_count: 1,
            linked_source_count: 1,
            publisher_count: 1,
          },
          spotlight: [],
          assistant: {
            summary: 'stub summary',
            narrative_metadata: {
              mode: 'stub',
              provider: 'internal',
              model: 'deterministic-summary',
              status: 'generated',
              fallback_used: false,
              prompt_version: 'evidence-assistant-stub-v1',
              error_message: null,
            },
            provenance_summary: 'provenance',
            uncertainty_summary: 'uncertainty',
            recommended_next_checks: ['check'],
            cited_evidence_ids: [],
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    await fetchEvidenceExplorerAssistant({
      status: 'accepted',
      query: ' benchmark ',
      sourceType: 'crossref',
      page: 2,
      pageSize: 50,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/workspace/evidence/explorer/assistant?status=accepted&q=benchmark&sourceType=crossref&page=2&pageSize=50',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      }),
    );
  });

  it('parses explorer CSV export metadata from response headers', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response('id,title\n1,record\n', {
        status: 200,
        headers: {
          'content-type': 'text/csv',
          'content-disposition': 'attachment; filename="evidence-explorer.csv"',
          'x-metrev-export-generated-at': '2026-04-24T12:30:00.000Z',
          'x-metrev-workspace-schema-version': 'workspace-v1',
        },
      }),
    );

    const result = await fetchEvidenceExplorerCsvExport({
      status: 'accepted',
      sourceType: 'crossref',
      query: 'benchmark',
      page: 1,
      pageSize: 25,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/exports/evidence/explorer/csv?status=accepted&q=benchmark&sourceType=crossref&page=1&pageSize=25',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      }),
    );

    expect(result).toEqual({
      content: 'id,title\n1,record\n',
      metadata: {
        content_type: 'text/csv',
        generated_at: '2026-04-24T12:30:00.000Z',
        file_name: 'evidence-explorer.csv',
        workspace_schema_version: 'workspace-v1',
      },
    });
  });

  it('surfaces API error payloads for failed CSV exports', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'CSV export failed' }), {
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    await expect(fetchEvaluationCsvExport('eval-001')).rejects.toThrow(
      'CSV export failed',
    );
  });
});
