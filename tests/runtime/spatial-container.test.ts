import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  runSpatialSidecar,
  spatialContainerExecutionPlan,
  validateSpatialContainerOptions,
} from '@metrev/spatial-sidecar-client';
import { developmentSidecarConfiguration } from '../../packages/spatial-worker/src/development-sidecar-config';

const budgets = {
  image: 'metrev-spatial-toolchain',
  cpus: 2,
  memoryMiB: 4096,
  pidsLimit: 256,
  temporaryMiB: 512,
};
const health = {
  protocol_version: 'spatial-sidecar-v1' as const,
  operation: 'health' as const,
  request_id: '00000000-0000-4000-8000-000000000001',
};

describe('resource-bounded spatial containers', () => {
  it('enforces explicit resource, network, filesystem and privilege bounds', () => {
    const plan = spatialContainerExecutionPlan(budgets, '/tmp/private output');
    expect(plan.command).toBe('docker');
    expect(plan.args).toEqual(
      expect.arrayContaining([
        '--pull=never',
        '--rm',
        '--init',
        '--network',
        'none',
        '--read-only',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--cpus',
        '2',
        '--memory',
        '4096m',
        '--memory-swap',
        '4096m',
        '--pids-limit',
        '256',
        'type=bind,source=/tmp/private output,target=/opt/metrev-artifacts',
      ]),
    );
    expect(plan.name).toMatch(/^metrev-spatial-[a-f0-9-]+$/);
    expect(plan.args.slice(-3)).toEqual([
      budgets.image,
      '--output-dir',
      '/opt/metrev-artifacts',
    ]);
    expect(() => spatialContainerExecutionPlan(budgets, '/tmp/a,b')).toThrow();
  });
  it.each([
    { cpus: 0 },
    { cpus: 5 },
    { memoryMiB: 0 },
    { memoryMiB: 8192 },
    { pidsLimit: -1 },
    { temporaryMiB: 2048 },
    { image: '-v /' },
    { image: 'solver:latest' },
  ])('rejects unbounded or malformed settings %j', (variant) => {
    expect(() =>
      validateSpatialContainerOptions({ ...budgets, ...variant }),
    ).toThrow();
  });
  it('configures both regimes through one strict explicit factory without requiring a host Python toolchain', () => {
    const options = developmentSidecarConfiguration({
      METREV_SPATIAL_DEVELOPMENT_ARTIFACT_ROOT: '/tmp/metrev',
      METREV_SPATIAL_SIDECAR_IMAGE: budgets.image,
    });
    expect(options.container).toMatchObject(budgets);
    expect(() =>
      developmentSidecarConfiguration({
        METREV_SPATIAL_DEVELOPMENT_ARTIFACT_ROOT: '/tmp/metrev',
        METREV_SPATIAL_SIDECAR_IMAGE: '',
        METREV_SPATIAL_SIDECAR_TIMEOUT_MS: '12bad',
      }),
    ).toThrow();
  });
  it.each([
    'success',
    'already_removed',
    'failure',
    'timeout',
    'cancel',
    'bad_response',
    'cleanup_failure',
  ])(
    'removes the exact named invocation after %s and never falls back to host Python',
    async (mode) => {
      const root = await mkdtemp(join(tmpdir(), 'metrev-container-test-'));
      try {
        const log = join(root, 'invocations.jsonl');
        const executable = join(root, 'docker-stub');
        await writeFile(
          executable,
          `#!/usr/bin/env python3
import sys,json,time,pathlib
args=sys.argv[1:]
with pathlib.Path(${JSON.stringify(log)}).open('a') as f: f.write(json.dumps(args)+'\\n')
mode=${JSON.stringify(mode)}
if args[:2]==['container','rm']:
    if mode=='cleanup_failure': sys.stderr.write('daemon unavailable'); sys.exit(1)
    if mode=='already_removed': sys.stderr.write('Error response from daemon: No such container: '+args[-1]); sys.exit(1)
    sys.exit(0)
request=json.loads(sys.stdin.read())
if mode=='failure': sys.exit(7)
if mode in ('timeout','cancel'): time.sleep(10)
if mode=='bad_response': print('invalid'); sys.exit(0)
print(json.dumps({'protocol_version':'spatial-sidecar-v1','request_id':request['request_id'],'status':'ok','operation':'health','capabilities':[], 'metadata':{'sidecar_version':'0.3.0','protocol_version':'spatial-sidecar-v1','python_version':'3.12.0','gmsh_version':None,'dolfinx_version':None,'petsc_version':None}}))
`,
          { mode: 0o700 },
        );
        const shutdown = new AbortController();
        const cancelTimer =
          mode === 'cancel'
            ? setTimeout(() => shutdown.abort(), 100)
            : undefined;
        const result = runSpatialSidecar(health, {
          pythonExecutable: '/must-not-execute-host-python',
          moduleDirectory: root,
          artifactRoot: root,
          timeoutMs: mode === 'timeout' ? 200 : 3000,
          signal: shutdown.signal,
          container: { ...budgets, dockerExecutable: executable },
        });
        if (mode === 'success' || mode === 'already_removed')
          expect((await result).response.status).toBe('ok');
        else
          await expect(result).rejects.toMatchObject({
            code: {
              failure: 'process_failure',
              timeout: 'timeout',
              cancel: 'cancelled',
              bad_response: 'invalid_response',
              cleanup_failure: 'container_cleanup',
            }[mode],
          });
        if (cancelTimer) clearTimeout(cancelTimer);
        const calls = (await readFile(log, 'utf8'))
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line) as string[]);
        expect(calls).toHaveLength(2);
        const name = calls[0][calls[0].indexOf('--name') + 1];
        expect(calls[1]).toEqual(['container', 'rm', '--force', name]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});
