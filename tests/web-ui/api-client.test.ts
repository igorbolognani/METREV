import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    evaluateCase,
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
