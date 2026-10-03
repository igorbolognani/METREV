import {
  structuredCellInputSchema,
  type StructuredCellInput,
} from '@metrev/domain-contracts/browser';

export function structuredCellScientificParameters(input: StructuredCellInput) {
  const parameters: {
    path: string[];
    value: number;
    unit: string;
    source_kind: string;
    source_ref: string;
    source_locator?: string;
  }[] = [];
  function visit(value: unknown, path: string[]) {
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if (
      typeof object.value === 'number' &&
      typeof object.unit === 'string' &&
      typeof object.source_kind === 'string' &&
      typeof object.source_ref === 'string'
    ) {
      parameters.push({
        path,
        value: object.value,
        unit: object.unit,
        source_kind: object.source_kind,
        source_ref: object.source_ref,
        ...(typeof object.source_locator === 'string'
          ? { source_locator: object.source_locator }
          : {}),
      });
      return;
    }
    Object.entries(object).forEach(([key, child]) =>
      visit(child, [...path, key]),
    );
  }
  visit(input, []);
  return parameters;
}

/** Edits only declared sourced parameters; revalidates units, reaction balance and model constraints. */
export function updateStructuredCellParameter(
  input: StructuredCellInput,
  path: string[],
  patch: {
    value: number;
    source_kind: string;
    source_ref: string;
    source_locator?: string;
  },
) {
  if (
    !structuredCellScientificParameters(input).some(
      (parameter) => parameter.path.join('.') === path.join('.'),
    )
  )
    throw new Error('Unknown scientific parameter');
  const copy = structuredClone(input);
  let target = copy as unknown as Record<string, unknown>;
  for (const segment of path)
    target = target[segment] as Record<string, unknown>;
  Object.assign(target, patch);
  return structuredCellInputSchema.parse(copy);
}

/** Counts are numerical resolution choices. Geometry, provenance and requested dimension are retained. */
export function updateStructuredCellResolution(
  input: StructuredCellInput,
  layers: number[],
  transverse: number[],
) {
  if (
    layers.length !== input.geometry.layers.length ||
    transverse.length !== input.dimension - 1
  )
    throw new Error('Resolution rank mismatch');
  const copy = structuredClone(input);
  copy.geometry.layers.forEach((layer, index) => {
    layer.cells = layers[index];
  });
  copy.geometry.transverse_cells = [...transverse];
  return structuredCellInputSchema.parse(copy);
}
