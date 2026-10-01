'use client';
import { z } from 'zod';
import {
  structuredCellInputSchema,
  type StructuredCellInput,
} from '@metrev/domain-contracts/browser';
import type { SpatialSimulationRunSnapshot } from '@metrev/domain-contracts';

const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
async function json(response: Response) {
  const data = (await response.json()) as unknown;
  if (!response.ok)
    throw new Error(
      typeof data === 'object' && data !== null && 'message' in data
        ? String(data.message)
        : `Spatial request failed (${response.status})`,
    );
  return data;
}
export async function createSpatialCellRun(
  input: StructuredCellInput,
  evaluationId?: string,
) {
  return readRun(
    await json(
      await fetch(`${base}/api/spatial-simulations`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          input: structuredCellInputSchema.parse(input),
          ...(evaluationId ? { evaluation_id: evaluationId } : {}),
        }),
      }),
    ),
  );
}
function readRun(value: unknown): SpatialSimulationRunSnapshot {
  z.object({
    run: z
      .object({
        id: z.string().min(1),
        status: z.enum([
          'queued',
          'preparing_geometry',
          'meshing',
          'solving',
          'postprocessing',
          'completed',
          'failed',
          'cancelled',
        ]),
        progress: z.number().min(0).max(100),
        dimension: z.union([z.literal(2), z.literal(3)]),
      })
      .passthrough(),
  }).parse(value);
  return (value as { run: SpatialSimulationRunSnapshot }).run;
}
export async function fetchSpatialRun(id: string) {
  return readRun(
    await json(
      await fetch(`${base}/api/spatial-simulations/${encodeURIComponent(id)}`, {
        credentials: 'include',
      }),
    ),
  );
}
export async function cancelSpatialRun(id: string) {
  return readRun(
    await json(
      await fetch(`${base}/api/spatial-simulations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      }),
    ),
  );
}
export async function fetchSpatialArtifact(
  runId: string,
  fieldId: string | null,
  digest: string,
) {
  const suffix =
    fieldId === null ? 'mesh' : `fields/${encodeURIComponent(fieldId)}`;
  const response = await fetch(
    `${base}/api/spatial-simulations/${encodeURIComponent(runId)}/${suffix}`,
    { credentials: 'include' },
  );
  if (!response.ok) {
    await json(response);
    throw new Error('Missing spatial artifact');
  }
  const declared = Number(response.headers.get('Content-Length'));
  if (
    !Number.isSafeInteger(declared) ||
    declared < 1 ||
    declared > 64 * 1024 * 1024
  )
    throw new Error('Invalid artifact length');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== declared)
    throw new Error('Artifact length mismatch');
  const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (sha !== digest) throw new Error('Artifact checksum mismatch');
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
