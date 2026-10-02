'use client';
import { z } from 'zod';
import {
  structuredCellInputSchema,
  type StructuredCellInput,
  structuredCellRunViewSchema,
  structuredCellEquationGraphSchema,
  caseSpatialRequestSchema,
  caseSpatialRunHistoryEntrySchema,
  type CaseSpatialRequest,
} from '@metrev/domain-contracts/browser';

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
export async function createSpatialCellRun(input: StructuredCellInput) {
  return fetchSpatialRun(
    readRunId(
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
          }),
        }),
      ),
    ),
  );
}
const casePlanSchema = z.object({
  status: z.string(),
  resolution: z.object({
    model_id: z.string(),
    dimension: z.number(),
    missing_inputs: z.array(z.string()),
    missing_modules: z.array(z.string()),
    unsupported_configuration: z.array(z.string()),
    equation_graph: structuredCellEquationGraphSchema.nullable(),
    input: structuredCellInputSchema.nullable().optional(),
    decision_eligible: z.literal(false),
  }),
  run: z.object({ id: z.string() }).nullable(),
  created: z.boolean(),
});
export async function fetchCaseSpatialPlan(
  evaluationId: string,
  request: CaseSpatialRequest,
  enqueue = false,
  key?: string,
) {
  return casePlanSchema.parse(
    await json(
      await fetch(
        `${base}/api/evaluations/${encodeURIComponent(evaluationId)}/spatial-simulations${enqueue ? '' : '/plan'}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(enqueue
              ? { 'Idempotency-Key': key ?? crypto.randomUUID() }
              : {}),
          },
          body: JSON.stringify(caseSpatialRequestSchema.parse(request)),
        },
      ),
    ),
  );
}
export async function fetchCaseSpatialRuns(evaluationId: string) {
  return z
    .object({
      runs: z.array(caseSpatialRunHistoryEntrySchema).max(25),
      limit: z.number(),
    })
    .parse(
      await json(
        await fetch(
          `${base}/api/evaluations/${encodeURIComponent(evaluationId)}/spatial-simulations`,
          { credentials: 'include' },
        ),
      ),
    );
}
function readRunId(value: unknown) {
  return z
    .object({ run: z.object({ id: z.string().min(1).max(160) }) })
    .parse(value).run.id;
}
export function readRun(value: unknown) {
  return z.object({ run: structuredCellRunViewSchema }).parse(value).run;
}
export async function fetchSpatialRun(id: string) {
  return readRun(
    await json(
      await fetch(
        `${base}/api/spatial-simulations/${encodeURIComponent(id)}/view`,
        {
          credentials: 'include',
        },
      ),
    ),
  );
}
export async function cancelSpatialRun(id: string) {
  return fetchSpatialRun(
    readRunId(
      await json(
        await fetch(
          `${base}/api/spatial-simulations/${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
            credentials: 'include',
          },
        ),
      ),
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
