import { z } from 'zod';

const id = z.string().trim().min(1).max(160);
const quantity = (unit: string) =>
  z
    .object({
      value: z.number().finite(),
      unit: z.literal(unit),
      source_kind: z.enum([
        'measured',
        'literature',
        'assumption',
        'default',
        'test_fixture',
        'modeled',
      ]),
      source_ref: id,
    })
    .strict();

/** Bounded linear DC reduction. This is a separate stack scale, never a cell mesh. */
export const stackNetworkInputSchema = z
  .object({
    contract_version: z.literal('stack-network-linear-input-v1'),
    model_id: z.literal('stack-network-linear-development-v1'),
    system: z.enum(['MFC', 'MEC']),
    nodes: z.array(id).min(2).max(128),
    reference_node: id,
    branches: z
      .array(
        z
          .object({
            id,
            from: id,
            to: id,
            kind: z.enum([
              'reduced_cell',
              'contact',
              'shunt',
              'load',
              'supply',
            ]),
            resistance: quantity('ohm').refine(
              (q) => q.value > 0,
              'Resistance must be positive',
            ),
            emf: quantity('V').optional(),
            cell_run_ref: id.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(512),
    auxiliary_power: quantity('W').refine(
      (q) => q.value >= 0,
      'Auxiliary demand cannot be negative',
    ),
  })
  .strict()
  .superRefine((input, ctx) => {
    const nodes = new Set(input.nodes);
    if (nodes.size !== input.nodes.length || !nodes.has(input.reference_node))
      ctx.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'Nodes must be unique and contain the reference node',
      });
    if (new Set(input.branches.map((b) => b.id)).size !== input.branches.length)
      ctx.addIssue({
        code: 'custom',
        path: ['branches'],
        message: 'Branch IDs must be unique',
      });
    input.branches.forEach((branch, i) => {
      if (
        !nodes.has(branch.from) ||
        !nodes.has(branch.to) ||
        branch.from === branch.to
      )
        ctx.addIssue({
          code: 'custom',
          path: ['branches', i],
          message: 'A branch must join two distinct declared nodes',
        });
      const active = branch.kind === 'reduced_cell' || branch.kind === 'supply';
      if (active !== Boolean(branch.emf))
        ctx.addIssue({
          code: 'custom',
          path: ['branches', i, 'emf'],
          message:
            'Only reduced cells and supplies require an explicit signed EMF',
        });
      if ((branch.kind === 'reduced_cell') !== Boolean(branch.cell_run_ref))
        ctx.addIssue({
          code: 'custom',
          path: ['branches', i, 'cell_run_ref'],
          message: 'Each reduced cell must declare its source cell/study run',
        });
    });
    const reached = new Set([input.reference_node]);
    for (let pass = 0; pass < nodes.size; pass++)
      for (const b of input.branches) {
        if (reached.has(b.from)) reached.add(b.to);
        if (reached.has(b.to)) reached.add(b.from);
      }
    if (reached.size !== nodes.size)
      ctx.addIssue({
        code: 'custom',
        path: ['branches'],
        message:
          'Every node must connect to the reference; floating networks are unsupported',
      });
  });

export type StackNetworkInput = z.infer<typeof stackNetworkInputSchema>;
