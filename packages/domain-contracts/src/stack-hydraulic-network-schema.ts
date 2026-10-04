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

/**
 * EQ-NET-HYD-001 input. A hydraulic stack graph is a reduced scale and is
 * never interpreted as a cell CFD mesh. Positive flow is from `from` to `to`.
 */
export const stackHydraulicNetworkInputSchema = z
  .object({
    contract_version: z.literal('stack-hydraulic-network-input-v1'),
    model_id: z.literal('stack-hydraulic-network-development-v1'),
    nodes: z.array(id).min(2).max(128),
    reference_node: id,
    reference_pressure: quantity('Pa'),
    branches: z
      .array(
        z
          .object({
            id,
            from: id,
            to: id,
            kind: z.enum(['cell_channel', 'manifold', 'bypass', 'pump']),
            hydraulic_resistance: quantity('Pa*s/m3').refine(
              (q) => q.value > 0,
              'Hydraulic resistance must be positive',
            ),
            pressure_rise: quantity('Pa').optional(),
            cell_run_ref: id.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(512),
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
    input.branches.forEach((branch, index) => {
      if (
        !nodes.has(branch.from) ||
        !nodes.has(branch.to) ||
        branch.from === branch.to
      )
        ctx.addIssue({
          code: 'custom',
          path: ['branches', index],
          message: 'A branch must join two distinct declared nodes',
        });
      if ((branch.kind === 'pump') !== Boolean(branch.pressure_rise))
        ctx.addIssue({
          code: 'custom',
          path: ['branches', index, 'pressure_rise'],
          message: 'Only pumps require an explicit signed pressure rise',
        });
      if ((branch.kind === 'cell_channel') !== Boolean(branch.cell_run_ref))
        ctx.addIssue({
          code: 'custom',
          path: ['branches', index, 'cell_run_ref'],
          message: 'Every cell channel must identify its reduced cell/run',
        });
    });
    if (!input.branches.some((branch) => branch.kind === 'pump'))
      ctx.addIssue({
        code: 'custom',
        path: ['branches'],
        message: 'A driven development network requires at least one pump',
      });
    if (!input.branches.some((branch) => branch.kind === 'cell_channel'))
      ctx.addIssue({
        code: 'custom',
        path: ['branches'],
        message: 'A stack network requires at least one reduced cell channel',
      });
    const reached = new Set([input.reference_node]);
    for (let pass = 0; pass < nodes.size; pass++)
      for (const branch of input.branches) {
        if (reached.has(branch.from)) reached.add(branch.to);
        if (reached.has(branch.to)) reached.add(branch.from);
      }
    if (reached.size !== nodes.size)
      ctx.addIssue({
        code: 'custom',
        path: ['branches'],
        message: 'Every node must connect to the pressure reference',
      });
  });

export type StackHydraulicNetworkInput = z.infer<
  typeof stackHydraulicNetworkInputSchema
>;
