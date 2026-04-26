import rawFixture from '../fixtures/raw-case-input.json';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import type { SessionActor } from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import { rawCaseInputSchema } from '@metrev/domain-contracts';
import { buildEvaluationWorkspace } from '../../apps/api-server/src/presenters/workspace-presenters';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';
import { EvaluationWorkspaceView } from '../../apps/web-ui/src/components/evaluation-result-view';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

const actor: SessionActor = {
  userId: 'user-analyst-001',
  email: 'analyst@metrev.local',
  role: 'ANALYST',
  sessionId: 'session-web-ui-tests',
  sessionToken: 'web-ui-tests',
};

const logger = {
  warn: vi.fn(),
};

describe('evaluation workspace', () => {
  it('renders the result surface from the backend workspace payload', async () => {
    const repository = new MemoryEvaluationRepository();

    try {
      const evaluation = await createPersistedCaseEvaluation({
        rawInput: rawCaseInputSchema.parse(rawFixture),
        actor,
        evaluationRepository: repository,
        logger,
        environment: 'test',
      });
      const history = await repository.getCaseHistory(evaluation.case_id);
      const workspace = buildEvaluationWorkspace({
        evaluation,
        history,
        versions: evaluation.audit_record.runtime_versions,
      });
      const renderWorkspace = {
        ...workspace,
        history_summary: {
          ...workspace.history_summary,
          compare_candidates: [],
        },
        links: {
          ...workspace.links,
          compare_href: null,
        },
      };

      const html = renderToStaticMarkup(
        React.createElement(EvaluationWorkspaceView, {
          workspace: renderWorkspace,
          activeTab: 'summary',
          onTabChange: vi.fn(),
        }),
      );

      expect(html).toContain('Evaluation workspace');
      expect(html).toContain('Summary');
      expect(html).toContain('Actions');
      expect(html).toContain('Model');
      expect(html).toContain('Evidence');
      expect(html).toContain('Audit');
      expect(html).toContain('Decision posture');
      expect(html).toContain('Lead action');
      expect(html).toContain('Narrative');
      expect(html).toContain('Improves confidence');
      expect(html).toContain('Case history');
      expect(html).toContain('Export JSON');
      expect(html).toContain(
        `href="http://localhost:4000/api/exports/evaluations/${evaluation.evaluation_id}/json"`,
      );
      expect(html).toContain(
        `href="http://localhost:4000/api/exports/evaluations/${evaluation.evaluation_id}/csv"`,
      );
      expect(html).not.toContain('Comparison dock');
      expect(html).not.toContain('History rail');
      expect(html).not.toContain('Roadmap &amp; Suppliers');
    } finally {
      await repository.disconnect();
    }
  });
});
