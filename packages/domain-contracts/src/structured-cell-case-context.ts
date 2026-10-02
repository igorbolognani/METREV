import { z } from 'zod';

export const spatialStackBlockSchema = z.enum([
  'reactor_architecture',
  'anode_biofilm_support',
  'cathode_catalyst_support',
  'membrane_or_separator',
]);
export function structuredCellDomainMappingMatches(
  layers: readonly { tag: string; kind: string }[],
  mappings: readonly { domain_tag: string; stack_block: string }[],
): boolean {
  const blocks: Record<string, string> = {
    bulk_liquid: 'reactor_architecture',
    anode: 'anode_biofilm_support',
    biofilm: 'anode_biofilm_support',
    membrane: 'membrane_or_separator',
    separator: 'membrane_or_separator',
    cathode: 'cathode_catalyst_support',
  };
  return (
    mappings.length === layers.length &&
    new Set(mappings.map((m) => m.domain_tag)).size === layers.length &&
    layers.every((l) =>
      mappings.some(
        (m) => m.domain_tag === l.tag && m.stack_block === blocks[l.kind],
      ),
    )
  );
}
export const structuredCellCaseContextSchema = z
  .object({
    version: z.literal('structured-cell-case-context-v1'),
    case_id: z.string().min(1).max(160),
    evaluation_id: z.string().min(1).max(160),
    normalized_case_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    mapping_policy: z.literal('explicit_layer_to_case_stack_block_v1'),
    component_domains: z
      .array(
        z
          .object({
            domain_tag: z.string().min(1).max(64),
            stack_block: spatialStackBlockSchema,
          })
          .strict(),
      )
      .min(3)
      .max(16),
    architecture_family: z.string().min(1),
    input_role: z.literal('source_traced_case_development_input'),
    decision_eligible: z.literal(false),
  })
  .strict();
