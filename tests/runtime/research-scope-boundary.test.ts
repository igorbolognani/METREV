import { describe, expect, it } from 'vitest';

import {
  assessResearchWarehouseEligibility,
  detectResearchTechnologyClasses,
} from '../../packages/database/src/research-repository';
import { detectTechnologyClasses } from '../../packages/research-intelligence/src/extraction/deterministic-extractor';

describe('active research scope boundary', () => {
  it('does not classify legacy technologies as active evidence', () => {
    const outOfScopeText =
      'Microbial desalination cell for nitrogen recovery and biogas synergy.';

    expect(detectResearchTechnologyClasses(outOfScopeText)).toEqual([]);
    expect(detectTechnologyClasses(outOfScopeText)).toEqual(['not_reported']);
  });

  it('keeps out-of-scope literature off the active evidence surface', () => {
    const eligibility = assessResearchWarehouseEligibility({
      id: 'source-mdc-001',
      title: 'Microbial desalination cell for nutrient recovery',
      abstractText:
        'A microbial desalination cell couples salt removal with nitrogen recovery.',
      sourceType: 'openalex',
      accessStatus: 'gold',
      license: 'CC-BY-4.0',
      pdfUrl: 'https://example.org/mdc.pdf',
      sourceUrl: 'https://example.org/mdc',
    });

    expect(eligibility).toMatchObject({
      status: 'excluded',
      active_surface: false,
      technology_classes: [],
      reasons: ['out_of_scope_technology'],
    });
  });

  it('recognizes active MEC and biosensor evidence while retaining secondary hydrogen', () => {
    expect(
      detectResearchTechnologyClasses(
        'MEC wastewater treatment with captured hydrogen as a secondary output',
      ),
    ).toEqual(['MEC']);
    expect(
      detectTechnologyClasses(
        'Standalone electrochemical biosensor for wastewater monitoring',
      ),
    ).toEqual(['electrochemical_biosensor']);
  });
});
