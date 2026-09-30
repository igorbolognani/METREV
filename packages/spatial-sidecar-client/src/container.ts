import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { isAbsolute } from 'node:path';

/** Operational budgets only; these values are not scientific model parameters. */
export interface SpatialSidecarContainerOptions {
  image: string;
  cpus: number;
  memoryMiB: number;
  pidsLimit: number;
  temporaryMiB: number;
  dockerExecutable?: string;
}

export function validateSpatialContainerOptions(
  options: SpatialSidecarContainerOptions,
): SpatialSidecarContainerOptions {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._:/@-]{0,249}$/.test(options.image) ||
    options.image.endsWith(':latest')
  )
    throw new RangeError(
      'A reviewed local image or pinned image reference is required',
    );
  if (!Number.isFinite(options.cpus) || options.cpus < 0.25 || options.cpus > 4)
    throw new RangeError('Container cpus must be between 0.25 and 4');
  for (const [name, value, minimum, maximum] of [
    ['memoryMiB', options.memoryMiB, 128, 4096],
    ['pidsLimit', options.pidsLimit, 32, 512],
    ['temporaryMiB', options.temporaryMiB, 32, 1024],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
      throw new RangeError(
        `Container ${name} must be in [${minimum}, ${maximum}]`,
      );
  }
  if (
    options.dockerExecutable !== undefined &&
    !options.dockerExecutable.trim()
  )
    throw new RangeError('Container Docker executable cannot be blank');
  return { ...options };
}

export function spatialContainerExecutionPlan(
  options: SpatialSidecarContainerOptions,
  artifactDirectory: string | null,
) {
  const checked = validateSpatialContainerOptions(options);
  if (
    artifactDirectory &&
    (!isAbsolute(artifactDirectory) || /[,\r\n]/.test(artifactDirectory))
  )
    throw new RangeError(
      'Container artifact directory must be a safe absolute mount path',
    );
  if (!process.getuid || !process.getgid)
    throw new Error('The container sidecar requires a POSIX worker');
  const name = `metrev-spatial-${randomUUID()}`;
  const args = [
    'run',
    '--pull=never',
    '--rm',
    '--init',
    '--interactive',
    '--name',
    name,
    '--network',
    'none',
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--cpus',
    String(checked.cpus),
    '--memory',
    `${checked.memoryMiB}m`,
    '--memory-swap',
    `${checked.memoryMiB}m`,
    '--pids-limit',
    String(checked.pidsLimit),
    '--user',
    `${process.getuid()}:${process.getgid()}`,
    '--tmpfs',
    `/tmp:rw,exec,nosuid,size=${checked.temporaryMiB}m`,
    '--env',
    'HOME=/tmp',
    '--env',
    'XDG_CACHE_HOME=/tmp/.cache',
    '--label',
    'metrev.role=spatial-sidecar',
    ...(artifactDirectory
      ? [
          '--mount',
          `type=bind,source=${artifactDirectory},target=/opt/metrev-artifacts`,
        ]
      : []),
    checked.image,
    ...(artifactDirectory ? ['--output-dir', '/opt/metrev-artifacts'] : []),
  ];
  return { command: checked.dockerExecutable ?? 'docker', args, name };
}

/** Remove only this invocation's named container, including after CLI timeout/abort. */
export async function removeSpatialContainer(
  command: string,
  name: string,
): Promise<void> {
  await new Promise<void>((resolveRemoval, rejectRemoval) => {
    const child = spawn(command, ['container', 'rm', '--force', name], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) rejectRemoval(error);
      else resolveRemoval();
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error('Spatial container removal exceeded its deadline'));
    }, 10_000);
    child.stdout.resume();
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString('utf8')).slice(-4096);
    });
    child.on('error', () =>
      finish(new Error('Spatial container cleanup could not start')),
    );
    child.on('close', (code) => {
      // --rm already removes successfully exited containers.
      if (
        code === 0 ||
        (code === 1 && stderr.includes(`No such container: ${name}`))
      )
        finish();
      else finish(new Error('Spatial container cleanup failed'));
    });
  });
}
