export const playwrightBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3012';

export const playwrightApiBaseUrl =
  process.env.PLAYWRIGHT_API_BASE_URL?.trim() || 'http://localhost:4012';

export const analystEmail =
  process.env.METREV_LOCAL_ANALYST_EMAIL?.trim() || 'analyst@metrev.local';

export const analystPassword =
  process.env.METREV_LOCAL_ANALYST_PASSWORD?.trim() || 'MetrevAnalystPass123!';

export const seededEvidenceSourceKey = 'playwright-local-evidence-crossref';

export const seededEvidenceTitle = 'Playwright local evidence acceptance';

export const seededEvidenceSummary =
  'Local E2E evidence fixture that must be reviewed, accepted, and attached before deterministic intake submission.';
