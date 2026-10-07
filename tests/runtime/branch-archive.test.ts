import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  archiveAndDeleteBranch,
  planBranchArchives,
  validateArchivePlan,
} from '../../scripts/archive-repository-branches.mjs';

const sha = 'a'.repeat(40);
const plan = {
  schema_version: 1,
  repository: 'local/test',
  default_branch: 'main',
  protected_branches: ['main', 'dev'],
  archive_prefix: 'archive/2026-09-30',
  maintenance_branch: 'maintenance',
  branches: [{ name: 'old/work', sha }],
};

describe('audited repository branch archiving', () => {
  it('plans offline without Git, credentials, network or a database', () => {
    const root = mkdtempSync(join(tmpdir(), 'metrev-offline-archive-'));
    try {
      const path = join(root, 'plan.json');
      writeFileSync(path, JSON.stringify(plan));
      const result = execFileSync(
        process.execPath,
        [
          join(process.cwd(), 'scripts/archive-repository-branches.mjs'),
          `--plan=${path}`,
        ],
        {
          cwd: root,
          env: { PATH: '/no-tools', GITHUB_TOKEN: '' },
          encoding: 'utf8',
        },
      );
      expect(JSON.parse(result)).toMatchObject({
        mode: 'offline_plan',
        branches: plan.branches,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it.each([
    { branches: [{ name: 'main', sha }] },
    { branches: [{ name: '--all', sha }] },
    { branches: [{ name: 'old/work', sha: 'short' }] },
    { branches: [plan.branches[0], plan.branches[0]] },
    { default_branch: 'temporary' },
    { protected_branches: ['main', 'dev', 'dev'] },
    { protected_branches: ['main', '../outside'] },
    { protected_branches: ['dev'] },
  ])('rejects unsafe inventories %j', (variant) => {
    expect(() => validateArchivePlan({ ...plan, ...variant })).toThrow();
  });

  it.each([
    [[], [], 'already_absent'],
    [[{ name: 'old/work', sha, protected: true }], [], 'protected'],
    [[{ name: 'old/work', sha: 'b'.repeat(40) }], [], 'head_changed'],
    [
      [{ name: 'old/work', sha }],
      [{ head: 'old/work', base: 'main' }],
      'open_pull_request',
    ],
    [
      [{ name: 'old/work', sha }],
      [{ head: 'new/work', base: 'old/work' }],
      'open_pull_request',
    ],
  ])('preserves branches when evidence changed', (branches, prs, reason) => {
    expect(planBranchArchives(plan, branches, prs, 'main')[0]).toMatchObject({
      action: 'preserve',
      reason,
    });
  });

  it('always preserves named long-lived branches even when GitHub has not protected them', () => {
    const result = planBranchArchives(
      { ...plan, branches: [{ name: 'dev', sha }] },
      [{ name: 'dev', sha, protected: false }],
      [],
      'main',
    );
    expect(result[0]).toMatchObject({
      action: 'preserve',
      reason: 'protected',
    });
  });

  it('refuses to proceed if the default branch changed', () => {
    expect(() => planBranchArchives(plan, [], [], 'other')).toThrow();
  });

  it.each(['archive', 'changed_head', 'tag_collision', 'existing_archive'])(
    'checks atomic archive/deletion against a real Git server: %s',
    (mode) => {
      const root = mkdtempSync(join(tmpdir(), 'metrev-branch-archive-'));
      try {
        const remote = join(root, 'server.git');
        const cwd = join(root, 'work');
        const git = (args: string[]) =>
          execFileSync('git', args, {
            cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          }).trim();
        execFileSync('git', ['init', '--bare', remote], { stdio: 'pipe' });
        execFileSync('git', ['clone', remote, cwd], { stdio: 'pipe' });
        git(['config', 'user.name', 'fixture']);
        git(['config', 'user.email', 'fixture@metrev.local']);
        git(['switch', '-c', 'main']);
        writeFileSync(join(cwd, 'file'), 'baseline');
        git(['add', 'file']);
        git(['commit', '-m', 'baseline']);
        git(['push', 'origin', 'main']);
        git(['switch', '-c', 'old/work']);
        writeFileSync(join(cwd, 'file'), 'unique work');
        git(['commit', '-am', 'unique work']);
        const expected = git(['rev-parse', 'HEAD']);
        git(['push', 'origin', 'old/work']);
        const entry = {
          name: 'old/work',
          sha: expected,
          action: 'archive_and_delete',
          archive: 'archive/2026-09-30/old/work',
        };
        if (mode === 'changed_head') {
          writeFileSync(join(cwd, 'file'), 'newer work');
          git(['commit', '-am', 'new work']);
          git(['push', 'origin', 'old/work']);
        }
        if (mode === 'tag_collision' || mode === 'existing_archive') {
          git([
            'push',
            'origin',
            `${mode === 'tag_collision' ? 'main' : expected}:refs/tags/${entry.archive}`,
          ]);
        }
        if (mode === 'changed_head' || mode === 'tag_collision') {
          expect(() => archiveAndDeleteBranch(entry, { cwd })).toThrow();
          expect(git(['ls-remote', '--heads', 'origin', 'old/work'])).toContain(
            'refs/heads/old/work',
          );
          if (mode === 'changed_head')
            expect(git(['ls-remote', '--tags', 'origin', entry.archive])).toBe(
              '',
            );
        } else {
          archiveAndDeleteBranch(entry, { cwd });
          expect(git(['ls-remote', '--heads', 'origin', 'old/work'])).toBe('');
          expect(git(['ls-remote', '--tags', 'origin', entry.archive])).toBe(
            `${expected}\trefs/tags/${entry.archive}`,
          );
          // The unmerged unique content can be restored, not merely the branch name.
          expect(git(['show', `${expected}:file`])).toBe('unique work');
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
});
