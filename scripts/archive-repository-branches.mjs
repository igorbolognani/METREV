import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const shaPattern = /^[a-f0-9]{40}$/;
const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;

export function validateArchivePlan(plan) {
  if (plan.schema_version !== 1 || !/^[\w-]+\/[\w.-]+$/.test(plan.repository))
    throw new Error('Invalid archive plan identity');
  if (plan.default_branch !== 'main' || !namePattern.test(plan.archive_prefix))
    throw new Error('Invalid archive namespace or main branch');
  if (
    !Array.isArray(plan.protected_branches) ||
    plan.protected_branches.length > 20 ||
    new Set(plan.protected_branches).size !== plan.protected_branches.length ||
    plan.protected_branches.some((name) => !namePattern.test(name)) ||
    !plan.protected_branches.includes(plan.default_branch)
  )
    throw new Error('Invalid protected branch inventory');
  if (!Array.isArray(plan.branches) || plan.branches.length > 100)
    throw new Error('Invalid bounded branch inventory');
  const seen = new Set();
  for (const branch of plan.branches) {
    if (
      !namePattern.test(branch.name) ||
      branch.name === 'main' ||
      branch.name.includes('//') ||
      !shaPattern.test(branch.sha) ||
      seen.has(branch.name)
    )
      throw new Error('Invalid, duplicate or default archive branch');
    seen.add(branch.name);
  }
  if (
    !namePattern.test(plan.maintenance_branch) ||
    seen.has(plan.maintenance_branch) ||
    plan.maintenance_branch === 'main'
  )
    throw new Error('Invalid maintenance branch');
  return plan;
}

export function planBranchArchives(
  plan,
  liveBranches,
  openPullRequests,
  defaultBranch,
) {
  validateArchivePlan(plan);
  if (defaultBranch !== plan.default_branch)
    throw new Error('Default branch changed');
  const live = new Map(liveBranches.map((branch) => [branch.name, branch]));
  const protectedBranches = new Set(plan.protected_branches);
  return plan.branches.map((expected) => {
    const branch = live.get(expected.name);
    const active = openPullRequests.some(
      (pr) => pr.base === expected.name || pr.head === expected.name,
    );
    const reason = !branch
      ? 'already_absent'
      : branch.protected || protectedBranches.has(expected.name)
        ? 'protected'
        : active
          ? 'open_pull_request'
          : branch.sha !== expected.sha
            ? 'head_changed'
            : null;
    return {
      ...expected,
      archive: `${plan.archive_prefix}/${expected.name}`,
      action: reason ? 'preserve' : 'archive_and_delete',
      reason,
    };
  });
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 60_000,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 2_000_000,
  }).trim();
}

/** Both refs change together, with explicit leases guarding branch AND new tag. */
export function archiveAndDeleteBranch(
  entry,
  { cwd = process.cwd(), remote = 'origin' } = {},
) {
  if (
    entry.action !== 'archive_and_delete' ||
    !entry.archive.endsWith(`/${entry.name}`)
  )
    throw new Error('Branch is not admitted for archive');
  validateArchivePlan({
    schema_version: 1,
    repository: 'local/test',
    default_branch: 'main',
    protected_branches: ['main', 'dev'],
    archive_prefix: entry.archive.slice(0, -(entry.name.length + 1)),
    maintenance_branch: 'maintenance',
    branches: [{ name: entry.name, sha: entry.sha }],
  });
  const tagRef = `refs/tags/${entry.archive}`;
  const existing = git(['ls-remote', '--refs', remote, tagRef], cwd).split(
    /\s+/,
  )[0];
  if (existing && existing !== entry.sha)
    throw new Error('Archive tag already names different content');
  git(['cat-file', '-e', `${entry.sha}^{commit}`], cwd);
  git(
    [
      'push',
      '--atomic',
      '--porcelain',
      `--force-with-lease=refs/heads/${entry.name}:${entry.sha}`,
      ...(existing ? [] : [`--force-with-lease=${tagRef}:`]),
      remote,
      ...(existing ? [] : [`${entry.sha}:${tagRef}`]),
      `:refs/heads/${entry.name}`,
    ],
    cwd,
  );
  const after = git(
    ['ls-remote', '--refs', remote, tagRef, `refs/heads/${entry.name}`],
    cwd,
  );
  if (
    !after.includes(`${entry.sha}\t${tagRef}`) ||
    after.includes(`refs/heads/${entry.name}`)
  )
    throw new Error('Archive/deletion verification failed');
}

async function githubGet(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`Repository inspection failed (${response.status})`);
  return response.json();
}

async function allPages(path, token) {
  const results = [];
  for (let page = 1; page <= 10; page++) {
    const rows = await githubGet(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
      token,
    );
    results.push(...rows);
    if (rows.length < 100) return results;
  }
  throw new Error('Repository inspection exceeded its pagination bound');
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const planPath =
    args.find((arg) => arg.startsWith('--plan='))?.slice(7) ??
    'governance/BRANCH_ARCHIVE_PLAN.json';
  const plan = validateArchivePlan(JSON.parse(readFileSync(planPath, 'utf8')));
  if (!execute) {
    // Offline: no GitHub, network, credentials or database initialization.
    console.log(
      JSON.stringify(
        {
          mode: 'offline_plan',
          repository: plan.repository,
          archive_prefix: plan.archive_prefix,
          protected_branches: plan.protected_branches,
          branches: plan.branches,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.GITHUB_REPOSITORY !== plan.repository ||
    !shaPattern.test(process.env.METREV_VERIFIED_MAIN_SHA ?? '') ||
    !process.env.GITHUB_TOKEN
  )
    throw new Error('Execution requires this repository main CI context');
  const token = process.env.GITHUB_TOKEN;
  const expectedMain = process.env.METREV_VERIFIED_MAIN_SHA;
  const repo = await githubGet(`/repos/${plan.repository}`, token);
  const branches = await allPages(`/repos/${plan.repository}/branches`, token);
  const openPRs = await allPages(
    `/repos/${plan.repository}/pulls?state=open`,
    token,
  );
  const recentlyClosedPRs = await githubGet(
    `/repos/${plan.repository}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
    token,
  );
  const mainBranch = branches.find(
    (branch) => branch.name === plan.default_branch,
  );
  if (
    mainBranch?.commit.sha !== expectedMain ||
    git(['rev-parse', 'HEAD']) !== expectedMain
  )
    throw new Error('Verified main moved; defer to its next successful CI run');
  const maintenance = branches.find(
    (branch) => branch.name === plan.maintenance_branch,
  );
  if (maintenance) {
    try {
      git([
        'merge-base',
        '--is-ancestor',
        maintenance.commit.sha,
        expectedMain,
      ]);
      plan.branches.push({
        name: maintenance.name,
        sha: maintenance.commit.sha,
      });
      // The maintenance branch is now an explicit snapshot entry, not a wildcard.
      plan.maintenance_branch = 'maintenance-completed';
    } catch {
      /* New, unintegrated maintenance work stays active. */
    }
  }
  // Future main-targeted PRs use the same archival lifecycle after main CI passes.
  for (const pr of recentlyClosedPRs) {
    if (
      !pr.merged_at ||
      pr.merge_commit_sha !== expectedMain ||
      pr.base.ref !== plan.default_branch ||
      pr.head.repo?.full_name !== plan.repository ||
      plan.branches.some((branch) => branch.name === pr.head.ref) ||
      pr.head.ref === plan.default_branch
    )
      continue;
    plan.branches.push({ name: pr.head.ref, sha: pr.head.sha });
  }
  const entries = planBranchArchives(
    plan,
    branches.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
    })),
    openPRs.map((pr) => ({
      base: pr.base.ref,
      head: pr.head.repo?.full_name === plan.repository ? pr.head.ref : null,
    })),
    repo.default_branch,
  );
  const results = [];
  for (const entry of entries) {
    try {
      if (entry.action === 'archive_and_delete') archiveAndDeleteBranch(entry);
      results.push({
        ...entry,
        outcome:
          entry.action === 'archive_and_delete' ? 'archived' : 'preserved',
      });
    } catch {
      // A rejected transaction changes neither ref; never retry with --force.
      results.push({
        ...entry,
        outcome: 'failed',
        reason: 'archive_transaction_failed',
      });
    }
    console.log(JSON.stringify(results.at(-1)));
  }
  writeFileSync(
    'branch-archive-results.json',
    JSON.stringify(
      { repository: plan.repository, verified_main: expectedMain, results },
      null,
      2,
    ),
  );
  if (results.some((result) => result.outcome === 'failed'))
    process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
