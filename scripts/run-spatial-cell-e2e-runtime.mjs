import { spawn } from 'node:child_process';

if (process.env.METREV_SPATIAL_E2E !== '1' || !process.env.DATABASE_URL) {
  throw new Error(
    'The isolated spatial E2E runtime requires an explicitly configured test database and METREV_SPATIAL_E2E=1',
  );
}
const children = ['@metrev/api-server', '@metrev/spatial-worker'].map((name) =>
  spawn('pnpm', ['--filter', name, 'start'], {
    stdio: 'inherit',
    env: process.env,
    detached: true,
  }),
);
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children)
    if (child.pid) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        /* Already stopped. */
      }
    }
  const deadline = setTimeout(() => {
    for (const child of children)
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          /* Already stopped. */
        }
      }
  }, 5000);
  deadline.unref();
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', () => {
    if (!stopping) stop(1);
  });
}
process.once('SIGTERM', () => stop(0));
process.once('SIGINT', () => stop(0));
