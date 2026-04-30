import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const actionlintImage = 'rhysd/actionlint:1.7.12';

function main() {
  try {
    execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '--volume',
        `${repoRoot}:/repo`,
        '--workdir',
        '/repo',
        actionlintImage,
        '-color',
        ...process.argv.slice(2),
      ],
      {
        stdio: 'inherit',
      },
    );
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      console.error(
        'Docker is required to run workflow semantic lint via the official actionlint container.',
      );
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

main();
