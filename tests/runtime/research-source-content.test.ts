import { describe, expect, it } from 'vitest';

import { researchPaperMetadataSchema } from '@metrev/domain-contracts';
import { hydrateResearchPaperText } from '@metrev/research-intelligence';

describe('research source content hydration', () => {
  it('derives structured blocks and granular traces from html full text', async () => {
    const paper = researchPaperMetadataSchema.parse({
      paper_id: 'paper-html-001',
      source_document_id: 'source-html-001',
      title: 'Structured hydration fixture',
      authors: [],
      year: 2026,
      doi: '10.1000/structured-hydration-fixture',
      journal: 'Fixture Journal',
      publisher: 'Fixture Publisher',
      source_type: 'manual',
      source_url: 'https://example.org/structured-fixture',
      pdf_url: null,
      xml_url: null,
      abstract_text: null,
      citation_count: null,
      metadata: {},
    });

    const hydrated = await hydrateResearchPaperText(
      paper,
      async () =>
        new Response(
          `
            <html>
              <body>
                <h1>Introduction</h1>
                <p>Microbial fuel cell context for wastewater treatment.</p>
                <h2>Methods</h2>
                <p>Carbon felt anodes and carbon cloth cathodes were used.</p>
                <p>Table 1 reports power density of 950 mW/m2 for the tested reactor.</p>
                <figure>
                  <figcaption>Figure 2. Biofilm attachment on the cathode surface.</figcaption>
                </figure>
                <h2>Results</h2>
                <p>Current density reached 1.2 A/m2 and COD removal reached 76%.</p>
              </body>
            </html>
          `,
          {
            status: 200,
            headers: {
              'content-type': 'text/html',
            },
          },
        ),
    );

    expect(hydrated).not.toBeNull();
    expect(hydrated?.blocks?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(hydrated?.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionLabel: 'Methods',
        }),
        expect.objectContaining({
          kind: 'table',
          tableLabel: 'Table 1',
        }),
        expect.objectContaining({
          kind: 'figure',
          caption: expect.stringContaining('Figure 2.'),
        }),
      ]),
    );
    expect(hydrated?.trace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section_label: 'Methods',
        }),
        expect.objectContaining({
          table_label: 'Table 1',
        }),
      ]),
    );
  });
});
