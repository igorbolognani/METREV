import {
    loadContractOutputDefinition,
    type ContractOutputFieldDefinition,
    type ContractOutputRecordDefinition,
} from './loaders';
import { canonicalOutputSections } from './reconciliation';
import { decisionOutputSchema, type DecisionOutput } from './schemas';

export interface DecisionOutputValidationIssue {
  field: string;
  received: unknown;
  expected: string;
  source_state?: string;
  missing_behavior?: string;
  severity: 'error';
}

export interface DecisionOutputValidationInput {
  decisionOutput: unknown;
  environment?: string;
  logger?: (issue: DecisionOutputValidationIssue) => void;
}

export interface DecisionOutputValidationResult {
  valid: boolean;
  issues: DecisionOutputValidationIssue[];
  decisionOutput?: DecisionOutput;
}

const outputDefinition = loadContractOutputDefinition();

const recordDefinitions: Record<
  string,
  ContractOutputRecordDefinition | undefined
> = {
  prioritized_improvement_options: outputDefinition.recommendation_record,
  impact_map: outputDefinition.impact_map_record,
  supplier_shortlist: outputDefinition.supplier_shortlist_record,
  phased_roadmap: outputDefinition.phased_roadmap_record,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getValueAtPath(root: unknown, path: Array<number | string>): unknown {
  return path.reduce<unknown>((current, segment) => {
    if (Array.isArray(current) && typeof segment === 'number') {
      return current[segment];
    }

    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[String(segment)];
    }

    return undefined;
  }, root);
}

function shouldEnforce(environment?: string): boolean {
  return (
    (environment ?? process.env.NODE_ENV ?? 'development').toLowerCase() ===
    'production'
  );
}

function describeExpectation(
  definition: ContractOutputFieldDefinition | undefined,
  fallback: string,
): string {
  if (!definition) {
    return fallback;
  }

  return `${definition.type} from ${definition.source_state} state`;
}

function validateFieldDefinitions(input: {
  value: Record<string, unknown>;
  fieldDefinitions?: Record<string, ContractOutputFieldDefinition>;
  pathPrefix: string;
}): DecisionOutputValidationIssue[] {
  if (!input.fieldDefinitions) {
    return [];
  }

  return Object.entries(input.fieldDefinitions).flatMap(
    ([fieldName, fieldDefinition]) => {
      if (
        !fieldDefinition.required ||
        Object.prototype.hasOwnProperty.call(input.value, fieldName)
      ) {
        return [];
      }

      return [
        {
          field: `${input.pathPrefix}.${fieldName}`,
          received: undefined,
          expected: describeExpectation(fieldDefinition, 'required field'),
          source_state: fieldDefinition.source_state,
          missing_behavior: fieldDefinition.missing_behavior,
          severity: 'error' as const,
        },
      ];
    },
  );
}

function validateRecordArray(input: {
  value: unknown;
  definition?: ContractOutputRecordDefinition;
  pathPrefix: string;
}): DecisionOutputValidationIssue[] {
  const definition = input.definition;

  if (!definition || !Array.isArray(input.value)) {
    return [];
  }

  return input.value.flatMap((record, index) => {
    if (!isRecord(record)) {
      return [
        {
          field: `${input.pathPrefix}.${index}`,
          received: record,
          expected: 'object record',
          severity: 'error' as const,
        },
      ];
    }

    return validateFieldDefinitions({
      value: record,
      fieldDefinitions: definition.fields,
      pathPrefix: `${input.pathPrefix}.${index}`,
    });
  });
}

function emitIssues(
  issues: DecisionOutputValidationIssue[],
  logger?: (issue: DecisionOutputValidationIssue) => void,
): void {
  const write =
    logger ??
    ((issue: DecisionOutputValidationIssue) => {
      console.error('decision_output_contract_validation_issue', issue);
    });

  issues.forEach((issue) => write(issue));
}

export function validateDecisionOutputContract(
  input: DecisionOutputValidationInput,
): DecisionOutputValidationResult {
  const issues: DecisionOutputValidationIssue[] = [];
  const parsed = decisionOutputSchema.safeParse(input.decisionOutput);

  if (!parsed.success) {
    issues.push(
      ...parsed.error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join('.') : 'decision_output',
        received: getValueAtPath(input.decisionOutput, issue.path),
        expected: issue.message,
        severity: 'error' as const,
      })),
    );
  }

  const rawDecisionOutput = isRecord(input.decisionOutput)
    ? input.decisionOutput
    : {};
  const sectionDefinitions =
    outputDefinition.normalized_decision_output.sections ?? {};
  const requiredSections = Array.from(
    new Set([
      ...outputDefinition.normalized_decision_output.required_sections,
      ...canonicalOutputSections,
    ]),
  );

  for (const sectionName of requiredSections) {
    const sectionDefinition = sectionDefinitions[sectionName];
    if (!Object.prototype.hasOwnProperty.call(rawDecisionOutput, sectionName)) {
      issues.push({
        field: sectionName,
        received: undefined,
        expected: describeExpectation(sectionDefinition, 'required section'),
        source_state: sectionDefinition?.source_state,
        missing_behavior: sectionDefinition?.missing_behavior,
        severity: 'error',
      });
      continue;
    }

    const sectionValue = rawDecisionOutput[sectionName];
    if (isRecord(sectionValue)) {
      issues.push(
        ...validateFieldDefinitions({
          value: sectionValue,
          fieldDefinitions: sectionDefinition?.fields,
          pathPrefix: sectionName,
        }),
      );
    }

    issues.push(
      ...validateRecordArray({
        value: sectionValue,
        definition: recordDefinitions[sectionName],
        pathPrefix: sectionName,
      }),
    );
  }

  if (issues.length > 0) {
    emitIssues(issues, input.logger);
  }

  if (issues.length > 0 && shouldEnforce(input.environment)) {
    throw new Error(
      `Decision output contract validation failed for ${issues.length} field(s).`,
    );
  }

  return {
    valid: issues.length === 0,
    issues,
    decisionOutput: parsed.success ? parsed.data : undefined,
  };
}
