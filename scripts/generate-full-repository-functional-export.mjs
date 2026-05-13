import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import ts from 'typescript';

const repoRoot = resolve(process.cwd());
const defaultOutputPath = resolve(
  repoRoot,
  'docs/metrev-full-repository-functional-export.md',
);
const generatorVersion = 'full-export-v3';

const ruleContractPaths = {
  compatibility:
    'bioelectro-copilot-contracts/contracts/rules/compatibility.yaml',
  diagnostics: 'bioelectro-copilot-contracts/contracts/rules/diagnostics.yaml',
  improvements:
    'bioelectro-copilot-contracts/contracts/rules/improvements.yaml',
  scoring: 'bioelectro-copilot-contracts/contracts/rules/scoring.yaml',
  sensitivity: 'bioelectro-copilot-contracts/contracts/rules/sensitivity.yaml',
};

const manifestGroups = [
  {
    key: 'domainContracts',
    label: 'packages/domain-contracts/src/*.ts',
    test: (filePath) =>
      filePath.startsWith('packages/domain-contracts/src/') &&
      filePath.endsWith('.ts'),
  },
  {
    key: 'ruleEngine',
    label: 'packages/rule-engine/src/index.ts',
    test: (filePath) => filePath === 'packages/rule-engine/src/index.ts',
  },
  {
    key: 'electrochemModels',
    label: 'packages/electrochem-models/src/index.ts',
    test: (filePath) => filePath === 'packages/electrochem-models/src/index.ts',
  },
  {
    key: 'researchIntelligence',
    label: 'packages/research-intelligence/src/**/*.ts',
    test: (filePath) =>
      filePath.startsWith('packages/research-intelligence/src/') &&
      filePath.endsWith('.ts'),
  },
  {
    key: 'prismaSchema',
    label: 'packages/database/prisma/schema.prisma',
    test: (filePath) => filePath === 'packages/database/prisma/schema.prisma',
  },
  {
    key: 'databaseMigrations',
    label: 'packages/database/prisma/migrations/**/*.sql',
    test: (filePath) =>
      filePath.startsWith('packages/database/prisma/migrations/') &&
      filePath.endsWith('.sql'),
  },
  {
    key: 'databaseSource',
    label: 'packages/database/src/**/*.ts',
    test: (filePath) =>
      filePath.startsWith('packages/database/src/') && filePath.endsWith('.ts'),
  },
  {
    key: 'databaseScripts',
    label: 'packages/database/scripts/**/*.{ts,d.ts}',
    test: (filePath) =>
      filePath.startsWith('packages/database/scripts/') &&
      (filePath.endsWith('.ts') || filePath.endsWith('.d.ts')),
  },
  {
    key: 'authSource',
    label: 'packages/auth/src/**/*.ts',
    test: (filePath) =>
      filePath.startsWith('packages/auth/src/') && filePath.endsWith('.ts'),
  },
  {
    key: 'auditSource',
    label: 'packages/audit/src/**/*.ts',
    test: (filePath) =>
      filePath.startsWith('packages/audit/src/') && filePath.endsWith('.ts'),
  },
  {
    key: 'telemetrySource',
    label: 'packages/telemetry/src/**/*.ts',
    test: (filePath) =>
      filePath.startsWith('packages/telemetry/src/') &&
      filePath.endsWith('.ts'),
  },
  {
    key: 'llmAdapterSource',
    label: 'packages/llm-adapter/src/**/*.ts',
    test: (filePath) =>
      filePath.startsWith('packages/llm-adapter/src/') &&
      filePath.endsWith('.ts'),
  },
  {
    key: 'utilsSource',
    label: 'packages/utils/src/**/*.ts',
    test: (filePath) =>
      filePath.startsWith('packages/utils/src/') && filePath.endsWith('.ts'),
  },
  {
    key: 'apiServerSource',
    label: 'apps/api-server/src/**/*.ts',
    test: (filePath) =>
      filePath.startsWith('apps/api-server/src/') && filePath.endsWith('.ts'),
  },
  {
    key: 'researchWorkerSource',
    label: 'apps/research-worker/src/*.ts',
    test: (filePath) =>
      filePath.startsWith('apps/research-worker/src/') &&
      filePath.endsWith('.ts'),
  },
  {
    key: 'webUiSource',
    label: 'apps/web-ui/src/**/*.{ts,tsx}',
    test: (filePath) =>
      filePath.startsWith('apps/web-ui/src/') &&
      (filePath.endsWith('.ts') || filePath.endsWith('.tsx')),
  },
  {
    key: 'testsSource',
    label: 'tests/**/*.{ts,tsx}',
    test: (filePath) =>
      filePath.startsWith('tests/') &&
      (filePath.endsWith('.ts') || filePath.endsWith('.tsx')),
  },
  {
    key: 'toolingTypeScript',
    label: 'tracked TypeScript tooling/config surfaces',
    test: (filePath) =>
      [
        'apps/web-ui/next-env.d.ts',
        'packages/database/prisma.config.ts',
        'playwright.config.ts',
        'vitest.config.ts',
        'vitest.postgres.config.ts',
      ].includes(filePath),
  },
  {
    key: 'specsSource',
    label: 'specs/**/*.md',
    test: (filePath) =>
      filePath.startsWith('specs/') && filePath.endsWith('.md'),
  },
];

function parseArgs(argv) {
  return {
    checkOnly: argv.includes('--check'),
    stdout: argv.includes('--stdout'),
    write: argv.includes('--write') || argv.length === 0,
  };
}

function listTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  return output
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort();
}

function buildManifest(trackedFiles) {
  const manifest = Object.fromEntries(
    manifestGroups.map((group) => [group.key, []]),
  );

  for (const filePath of trackedFiles) {
    for (const group of manifestGroups) {
      if (group.test(filePath)) {
        manifest[group.key].push(filePath);
      }
    }
  }

  return manifest;
}

function readRepoFile(filePath) {
  return readFileSync(resolve(repoRoot, filePath), 'utf8');
}

function readStructuredYamlText(filePath) {
  return readRepoFile(filePath).replace(/\r\n/g, '\n');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractYamlSection(text, key, indent = 0) {
  const sectionPattern = new RegExp(
    `^${' '.repeat(indent)}${escapeRegExp(key)}:\n([\\s\\S]*?)(?=^${' '.repeat(indent)}[^\\s-][^:]*:|(?![\\s\\S]))`,
    'm',
  );
  const match = text.match(sectionPattern);
  return match?.[1] ?? '';
}

function extractYamlItemBlocks(sectionText, itemIndent = 2) {
  const lines = sectionText.split('\n');
  const blocks = [];
  let current = [];
  const prefix = `${' '.repeat(itemIndent)}- `;

  for (const line of lines) {
    if (line.startsWith(prefix)) {
      if (current.length > 0) {
        blocks.push(current.join('\n'));
      }

      current = [line];
      continue;
    }

    if (current.length > 0) {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current.join('\n'));
  }

  return blocks.filter((block) => block.trim().length > 0);
}

function extractYamlScalar(blockText, key, indent = 4) {
  const directPattern = new RegExp(
    `^${' '.repeat(indent)}${escapeRegExp(key)}:\\s*(.+)$`,
    'm',
  );
  const directMatch = blockText.match(directPattern);

  if (directMatch?.[1]) {
    return directMatch[1].trim();
  }

  if (indent >= 2) {
    const itemPattern = new RegExp(
      `^${' '.repeat(indent - 2)}-\\s+${escapeRegExp(key)}:\\s*(.+)$`,
      'm',
    );
    const itemMatch = blockText.match(itemPattern);
    if (itemMatch?.[1]) {
      return itemMatch[1].trim();
    }
  }

  return '';
}

function extractYamlNestedBlock(blockText, key, indent = 4) {
  const nestedPattern = new RegExp(
    `^${' '.repeat(indent)}${escapeRegExp(key)}:\n([\\s\\S]*?)(?=^${' '.repeat(indent)}[^\\s][^:]*:|^  - |(?![\\s\\S]))`,
    'm',
  );
  const match = blockText.match(nestedPattern);
  return match?.[1] ?? '';
}

function extractYamlList(blockText, key, indent = 4, itemIndent = 6) {
  const nestedBlock = extractYamlNestedBlock(blockText, key, indent);
  const itemPattern = new RegExp(`^${' '.repeat(itemIndent)}-\\s*(.+)$`, 'gm');
  return [...nestedBlock.matchAll(itemPattern)].map((match) => match[1].trim());
}

function extractYamlMap(blockText, key, indent = 4, childIndent = 6) {
  const nestedBlock = extractYamlNestedBlock(blockText, key, indent);
  const entryPattern = new RegExp(
    `^${' '.repeat(childIndent)}([^:]+):\\s*(.+)$`,
    'gm',
  );

  return Object.fromEntries(
    [...nestedBlock.matchAll(entryPattern)].map((match) => [
      match[1].trim(),
      match[2].trim(),
    ]),
  );
}

function parseRuleBlocks(filePath, topLevelKey) {
  const text = readStructuredYamlText(filePath);
  const section = extractYamlSection(text, topLevelKey);
  return extractYamlItemBlocks(section);
}

function parseScoringModel() {
  const text = readStructuredYamlText(ruleContractPaths.scoring);
  const scoringSection = extractYamlSection(text, 'scoring_model');
  const dimensionsSection = extractYamlSection(scoringSection, 'dimensions', 2);
  const dimensionPattern =
    /^ {4}([^:]+):\n([\s\S]*?)(?=^ {4}[^:\n]+:\n|(?![\s\S]))/gm;

  const dimensions = [...dimensionsSection.matchAll(dimensionPattern)].map(
    (match) => ({
      name: match[1].trim(),
      weight: extractYamlScalar(match[2], 'weight', 6),
      scale: extractYamlScalar(match[2], 'scale', 6),
      invert: extractYamlScalar(match[2], 'invert', 6),
    }),
  );

  const rule = extractYamlScalar(scoringSection, 'rule', 2);

  return { dimensions, rule };
}

function parseSensitivityPolicy() {
  const text = readStructuredYamlText(ruleContractPaths.sensitivity);
  const sensitivitySection = extractYamlSection(text, 'sensitivity_policy');
  const trackedFactorPattern = /^ {4}-\s*(.+)$/gm;

  return {
    trackedFactors: [...sensitivitySection.matchAll(trackedFactorPattern)].map(
      (match) => match[1].trim(),
    ),
    rule: extractYamlScalar(sensitivitySection, 'rule', 2),
  };
}

function countLines(text) {
  return text.length === 0 ? 0 : text.split('\n').length;
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncateSnippet(value, maxLength = 240) {
  const normalized = collapseWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function createSourceFile(filePath, text) {
  return ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function hasExportModifier(node) {
  return Boolean(
    node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ),
  );
}

function isExportedNode(node) {
  if (hasExportModifier(node)) {
    return true;
  }

  if (
    ts.isVariableDeclaration(node) &&
    ts.isVariableDeclarationList(node.parent) &&
    ts.isVariableStatement(node.parent.parent)
  ) {
    return hasExportModifier(node.parent.parent);
  }

  return false;
}

function declarationHeaderText(node, sourceFile) {
  if (
    (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
    node.body
  ) {
    return collapseWhitespace(
      sourceFile.text.slice(
        node.getStart(sourceFile),
        node.body.getStart(sourceFile),
      ),
    );
  }

  if (
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    const text = sourceFile.text.slice(node.getStart(sourceFile), node.end);
    const braceIndex = text.indexOf('{');

    return collapseWhitespace(
      braceIndex >= 0 ? text.slice(0, braceIndex).trimEnd() : text,
    );
  }

  return collapseWhitespace(node.getText(sourceFile));
}

function isLikelyZodInitializer(initializer) {
  if (!initializer) {
    return false;
  }

  const text = initializer.getText();
  return (
    text.includes('z.') ||
    text.includes('.safeParse(') ||
    text.includes('.parse(')
  );
}

function categorizeVariableExport(name, initializer) {
  if (name.endsWith('Schema') || isLikelyZodInitializer(initializer)) {
    return 'schema';
  }

  return 'const';
}

function collectExportEntries(sourceFile) {
  const entries = [];

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      entries.push({
        name: statement.getText(sourceFile),
        type: 're-export',
        signature: collapseWhitespace(statement.getText(sourceFile)),
      });
      continue;
    }

    if (!isExportedNode(statement)) {
      continue;
    }

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      entries.push({
        name: statement.name.text,
        type: 'function',
        signature: declarationHeaderText(statement, sourceFile),
      });
      continue;
    }

    if (ts.isInterfaceDeclaration(statement)) {
      entries.push({
        name: statement.name.text,
        type: 'interface',
        signature: declarationHeaderText(statement, sourceFile),
      });
      continue;
    }

    if (ts.isTypeAliasDeclaration(statement)) {
      entries.push({
        name: statement.name.text,
        type: 'type',
        signature: declarationHeaderText(statement, sourceFile),
      });
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name) {
      entries.push({
        name: statement.name.text,
        type: 'class',
        signature: declarationHeaderText(statement, sourceFile),
      });
      continue;
    }

    if (ts.isEnumDeclaration(statement)) {
      entries.push({
        name: statement.name.text,
        type: 'const',
        signature: declarationHeaderText(statement, sourceFile),
      });
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }

        const name = declaration.name.text;
        const initializerText = declaration.initializer
          ? truncateSnippet(declaration.initializer.getText(sourceFile), 260)
          : 'undefined';

        entries.push({
          name,
          type: categorizeVariableExport(name, declaration.initializer),
          signature: `const ${name} = ${initializerText}`,
        });
      }
    }
  }

  return entries;
}

function topLevelDeclarationMap(sourceFile) {
  const declarations = new Map();

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          declarations.set(declaration.name.text, declaration.initializer);
        }
      }
    }
  }

  return declarations;
}

function mergeFieldMaps(baseEntries, extensionEntries) {
  const merged = new Map(
    baseEntries.map((entry) => [entry.name, entry.expression]),
  );

  for (const entry of extensionEntries) {
    merged.set(entry.name, entry.expression);
  }

  return [...merged.entries()].map(([name, expression]) => ({
    name,
    expression,
  }));
}

function propertyNameText(nameNode, sourceFile) {
  if (!nameNode) {
    return '[computed]';
  }

  if (
    ts.isIdentifier(nameNode) ||
    ts.isStringLiteral(nameNode) ||
    ts.isNumericLiteral(nameNode)
  ) {
    return nameNode.text;
  }

  return nameNode.getText(sourceFile);
}

function objectLiteralFields(objectLiteral, sourceFile) {
  return objectLiteral.properties.map((property) => {
    if (ts.isPropertyAssignment(property)) {
      return {
        name: propertyNameText(property.name, sourceFile),
        expression: collapseWhitespace(
          property.initializer.getText(sourceFile),
        ),
      };
    }

    if (ts.isShorthandPropertyAssignment(property)) {
      return {
        name: property.name.text,
        expression: property.name.text,
      };
    }

    return {
      name: property.getText(sourceFile),
      expression: property.getText(sourceFile),
    };
  });
}

function zodObjectFields(
  initializer,
  sourceFile,
  declarationMap,
  seen = new Set(),
) {
  if (!initializer) {
    return [];
  }

  if (ts.isIdentifier(initializer)) {
    if (seen.has(initializer.text)) {
      return [];
    }

    const referenced = declarationMap.get(initializer.text);
    if (!referenced) {
      return [];
    }

    const nextSeen = new Set(seen);
    nextSeen.add(initializer.text);
    return zodObjectFields(referenced, sourceFile, declarationMap, nextSeen);
  }

  if (!ts.isCallExpression(initializer)) {
    return [];
  }

  if (
    ts.isPropertyAccessExpression(initializer.expression) &&
    initializer.expression.name.text === 'extend' &&
    initializer.arguments.length > 0 &&
    ts.isObjectLiteralExpression(initializer.arguments[0])
  ) {
    const baseEntries = zodObjectFields(
      initializer.expression.expression,
      sourceFile,
      declarationMap,
      seen,
    );
    const extensionEntries = objectLiteralFields(
      initializer.arguments[0],
      sourceFile,
    );
    return mergeFieldMaps(baseEntries, extensionEntries);
  }

  if (
    ts.isPropertyAccessExpression(initializer.expression) &&
    initializer.expression.name.text === 'merge' &&
    initializer.arguments.length > 0
  ) {
    const leftEntries = zodObjectFields(
      initializer.expression.expression,
      sourceFile,
      declarationMap,
      seen,
    );
    const rightEntries = zodObjectFields(
      initializer.arguments[0],
      sourceFile,
      declarationMap,
      seen,
    );
    return mergeFieldMaps(leftEntries, rightEntries);
  }

  if (
    ts.isPropertyAccessExpression(initializer.expression) &&
    [
      'default',
      'partial',
      'optional',
      'nullable',
      'catchall',
      'array',
      'brand',
      'describe',
      'transform',
    ].includes(initializer.expression.name.text)
  ) {
    return zodObjectFields(
      initializer.expression.expression,
      sourceFile,
      declarationMap,
      seen,
    );
  }

  if (
    ts.isPropertyAccessExpression(initializer.expression) &&
    initializer.expression.expression.getText(sourceFile) === 'z' &&
    initializer.expression.name.text === 'object' &&
    initializer.arguments.length > 0 &&
    ts.isObjectLiteralExpression(initializer.arguments[0])
  ) {
    return objectLiteralFields(initializer.arguments[0], sourceFile);
  }

  return [];
}

function collectZodSchemas(sourceFile) {
  const declarationMap = topLevelDeclarationMap(sourceFile);
  const schemas = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        continue;
      }

      if (!isLikelyZodInitializer(declaration.initializer)) {
        continue;
      }

      const name = declaration.name.text;
      const fields = zodObjectFields(
        declaration.initializer,
        sourceFile,
        declarationMap,
      );

      schemas.push({
        name,
        fields,
        raw: collapseWhitespace(declaration.initializer.getText(sourceFile)),
      });
    }
  }

  return schemas;
}

function collectTopLevelFunctionNames(sourceFile) {
  const names = new Set();

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      names.add(statement.name.text);
    }
  }

  return names;
}

function importBindingMap(sourceFile) {
  const bindings = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) {
      continue;
    }

    const moduleSpecifier = statement.moduleSpecifier
      .getText(sourceFile)
      .slice(1, -1);
    const { importClause } = statement;

    if (importClause.name) {
      bindings.set(importClause.name.text, `${moduleSpecifier}:default`);
    }

    if (
      importClause.namedBindings &&
      ts.isNamedImports(importClause.namedBindings)
    ) {
      for (const element of importClause.namedBindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        bindings.set(element.name.text, `${moduleSpecifier}:${importedName}`);
      }
    }

    if (
      importClause.namedBindings &&
      ts.isNamespaceImport(importClause.namedBindings)
    ) {
      bindings.set(
        importClause.namedBindings.name.text,
        `${moduleSpecifier}:*`,
      );
    }
  }

  return bindings;
}

function leftmostIdentifier(expression) {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return leftmostIdentifier(expression.expression);
  }

  if (ts.isCallExpression(expression)) {
    return leftmostIdentifier(expression.expression);
  }

  return null;
}

function collectCallTargets(sourceFile) {
  const imports = importBindingMap(sourceFile);
  const localFunctions = collectTopLevelFunctionNames(sourceFile);
  const calls = new Set();

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const calleeText = collapseWhitespace(
        node.expression.getText(sourceFile),
      );
      const leftmost = leftmostIdentifier(node.expression);

      if (leftmost && imports.has(leftmost)) {
        calls.add(`${imports.get(leftmost)} -> ${calleeText}`);
      } else if (leftmost && localFunctions.has(leftmost)) {
        calls.add(leftmost);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return [...calls].sort();
}

function exportedLongFunctions(sourceFile) {
  return sourceFile.statements.filter(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      Boolean(statement.name) &&
      isExportedNode(statement) &&
      statement.body &&
      countLines(statement.body.getText(sourceFile)) > 50,
  );
}

function statementStepText(statement, sourceFile) {
  if (ts.isVariableStatement(statement)) {
    return truncateSnippet(statement.getText(sourceFile), 220);
  }

  if (ts.isIfStatement(statement)) {
    return truncateSnippet(
      `if (${statement.expression.getText(sourceFile)})`,
      220,
    );
  }

  if (ts.isReturnStatement(statement)) {
    return truncateSnippet(statement.getText(sourceFile), 220);
  }

  return truncateSnippet(statement.getText(sourceFile), 220);
}

function buildLogicFlowEntries(sourceFile) {
  const entries = [];

  for (const statement of exportedLongFunctions(sourceFile)) {
    const functionName = statement.name?.text ?? 'anonymous';
    for (const bodyStatement of statement.body.statements) {
      entries.push(
        `Step ${entries.length + 1}: ${functionName} -> ${statementStepText(bodyStatement, sourceFile)}`,
      );
    }
  }

  return entries;
}

function collectInvariantEntries(sourceFile, schemas) {
  const entries = new Set();

  if (schemas.length > 0) {
    entries.add(
      `Zod schemas declared in this file enforce ${schemas.length} runtime validation contract(s).`,
    );
  }

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ['parse', 'safeParse'].includes(node.expression.name.text)
    ) {
      entries.add(truncateSnippet(node.getText(sourceFile), 220));
    }

    if (ts.isThrowStatement(node)) {
      entries.add(truncateSnippet(node.getText(sourceFile), 220));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return [...entries];
}

function renderSchemaEntry(schema) {
  if (schema.fields.length === 0) {
    return `${schema.name}: ${schema.raw}`;
  }

  return `${schema.name}: { ${schema.fields
    .map((field) => `${field.name}: ${field.expression}`)
    .join(', ')} }`;
}

function classifyYamlPath(yamlPath) {
  if (yamlPath.startsWith('rules/')) {
    return 'rules';
  }

  if (yamlPath.startsWith('ontology/')) {
    return 'ontology';
  }

  if (yamlPath.startsWith('suppliers/')) {
    return 'suppliers';
  }

  if (yamlPath.startsWith('cases/')) {
    return 'cases';
  }

  return 'yaml';
}

function findResolveStringArgument(node) {
  let foundPath = null;

  function visit(childNode) {
    if (
      ts.isCallExpression(childNode) &&
      ts.isIdentifier(childNode.expression) &&
      childNode.expression.text === 'resolve'
    ) {
      const stringArgument = childNode.arguments.find(ts.isStringLiteral);
      if (stringArgument) {
        foundPath = stringArgument.text;
      }
    }

    ts.forEachChild(childNode, visit);
  }

  visit(node);
  return foundPath;
}

function collectYamlLoads(sourceFile) {
  const loads = [];

  for (const statement of sourceFile.statements) {
    if (
      !ts.isFunctionDeclaration(statement) ||
      !statement.name ||
      !statement.body
    ) {
      continue;
    }

    const foundPath = findResolveStringArgument(statement.body);

    if (foundPath) {
      loads.push(
        `${foundPath} → ${statement.name.text} (${classifyYamlPath(foundPath)})`,
      );
    }
  }

  return loads;
}

function renderBulletSection(title, entries, fallback = '- none') {
  if (entries.length === 0) {
    return `${title}\n${fallback}`;
  }

  return `${title}\n${entries.map((entry) => `- ${entry}`).join('\n')}`;
}

function uniqueSorted(entries) {
  return [...new Set(entries.filter(Boolean))].sort();
}

function getGitValue(args) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'not-recorded';
  }
}

function toRepoRelativePath(filePath) {
  return relative(repoRoot, filePath).replace(/\\/g, '/');
}

function resolveTypeScriptImport(fromFilePath, moduleSpecifier) {
  if (!moduleSpecifier.startsWith('.')) {
    return moduleSpecifier;
  }

  const basePath = resolve(repoRoot, dirname(fromFilePath), moduleSpecifier);
  const candidates = [
    `${basePath}.ts`,
    `${basePath}.tsx`,
    resolve(basePath, 'index.ts'),
    resolve(basePath, 'index.tsx'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ? toRepoRelativePath(match) : moduleSpecifier;
}

function collectImportEntries(sourceFile) {
  return sourceFile.statements
    .filter(ts.isImportDeclaration)
    .map((statement) => collapseWhitespace(statement.getText(sourceFile)));
}

function collectImportModuleSpecifiers(sourceFile) {
  return sourceFile.statements
    .filter(ts.isImportDeclaration)
    .map((statement) => statement.moduleSpecifier)
    .filter(ts.isStringLiteral)
    .map((specifier) => specifier.text)
    .sort();
}

function collectNamedImportSources(filePath, sourceFile) {
  const imports = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) {
      continue;
    }

    const moduleSpecifier = statement.moduleSpecifier
      .getText(sourceFile)
      .slice(1, -1);
    const resolvedModule = resolveTypeScriptImport(filePath, moduleSpecifier);
    const { importClause } = statement;

    if (importClause.name) {
      imports.set(importClause.name.text, resolvedModule);
    }

    if (
      importClause.namedBindings &&
      ts.isNamedImports(importClause.namedBindings)
    ) {
      for (const element of importClause.namedBindings.elements) {
        imports.set(element.name.text, resolvedModule);
      }
    }
  }

  return imports;
}

function collectLocalDeclarationEntries(sourceFile) {
  const entries = [];

  for (const statement of sourceFile.statements) {
    if (isExportedNode(statement) || ts.isExportDeclaration(statement)) {
      continue;
    }

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      entries.push(
        `${statement.name.text} : function — ${declarationHeaderText(statement, sourceFile)}`,
      );
      continue;
    }

    if (ts.isInterfaceDeclaration(statement)) {
      entries.push(
        `${statement.name.text} : interface — ${declarationHeaderText(statement, sourceFile)}`,
      );
      continue;
    }

    if (ts.isTypeAliasDeclaration(statement)) {
      entries.push(
        `${statement.name.text} : type — ${declarationHeaderText(statement, sourceFile)}`,
      );
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name) {
      entries.push(
        `${statement.name.text} : class — ${declarationHeaderText(statement, sourceFile)}`,
      );
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }

        const initializer = declaration.initializer
          ? ` = ${truncateSnippet(declaration.initializer.getText(sourceFile), 160)}`
          : '';
        entries.push(`${declaration.name.text} : const${initializer}`);
      }
    }
  }

  return entries;
}

function collectStringLiteralCallArguments(sourceFile, names) {
  const entries = [];
  const nameSet = new Set(names);

  function calleeName(expression) {
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }

    if (ts.isPropertyAccessExpression(expression)) {
      return expression.name.text;
    }

    return null;
  }

  function firstArgumentText(node) {
    const first = node.arguments[0];
    if (!first) {
      return null;
    }

    if (
      ts.isStringLiteral(first) ||
      ts.isNoSubstitutionTemplateLiteral(first)
    ) {
      return first.text;
    }

    return truncateSnippet(first.getText(sourceFile), 180);
  }

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = calleeName(node.expression);
      const firstArgument = firstArgumentText(node);

      if (name && nameSet.has(name) && firstArgument) {
        entries.push(`${name}: ${firstArgument}`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return uniqueSorted(entries);
}

function collectEnvironmentReads(text) {
  const dotReads = [...text.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(
    (match) => match[1],
  );
  const bracketReads = [
    ...text.matchAll(/process\.env\[['"]([A-Z0-9_]+)['"]\]/g),
  ].map((match) => match[1]);
  return uniqueSorted([...dotReads, ...bracketReads]);
}

function collectSchemaParserCalls(text) {
  return uniqueSorted(
    [...text.matchAll(/\b([A-Za-z0-9_]+Schema)\.(parse|safeParse)\(/g)].map(
      (match) => `${match[1]}.${match[2]}`,
    ),
  );
}

function collectRoleRequirements(text) {
  return uniqueSorted([
    ...[...text.matchAll(/requireRole\([^,]+,\s*['"]([A-Z]+)['"]/g)].map(
      (match) => `requireRole:${match[1]}`,
    ),
    ...[...text.matchAll(/requireRoleSession\([^,]+,\s*['"]([A-Z]+)['"]/g)].map(
      (match) => `requireRoleSession:${match[1]}`,
    ),
  ]);
}

function collectPrismaOperations(text) {
  const operations = [
    ...text.matchAll(
      /\b(?:prisma|transaction|tx)\.([A-Za-z][A-Za-z0-9_]*)\.(findMany|findFirst|findUnique|create|createMany|update|updateMany|upsert|delete|deleteMany|count|aggregate|groupBy)\s*\(/g,
    ),
  ].map((match) => `${match[1]}.${match[2]}`);

  if (/\b(?:prisma|transaction|tx)\.\$transaction\s*\(/.test(text)) {
    operations.push('$transaction');
  }

  return uniqueSorted(operations);
}

function collectFetchCalls(text) {
  return uniqueSorted(
    [...text.matchAll(/\bfetch\(([^\n;]{1,220})/g)].map((match) =>
      truncateSnippet(`fetch(${match[1]}`, 220),
    ),
  );
}

function collectTanstackHooks(text) {
  return uniqueSorted(
    [...text.matchAll(/\b(useQuery|useMutation|useQueryClient)\s*\(/g)].map(
      (match) => match[1],
    ),
  );
}

function collectJsxSurfaceMarkers(text) {
  const dataTestIds = [...text.matchAll(/data-testid=['"]([^'"]+)['"]/g)].map(
    (match) => `data-testid:${match[1]}`,
  );
  const ariaLabels = [...text.matchAll(/aria-label=['"]([^'"]+)['"]/g)].map(
    (match) => `aria-label:${match[1]}`,
  );
  const headings = [
    ...text.matchAll(/<h[1-6][^>]*>\s*([^<{]{2,120})\s*<\/h[1-6]>/g),
  ].map((match) => `heading:${collapseWhitespace(match[1])}`);

  return uniqueSorted([...dataTestIds, ...ariaLabels, ...headings]);
}

function collectExportedFunctionNames(sourceFile) {
  return collectExportEntries(sourceFile)
    .filter((entry) => entry.type === 'function')
    .map((entry) => entry.name);
}

function renderTypeScriptFileSection(filePath, options = {}) {
  const text = readRepoFile(filePath);
  const sourceFile = createSourceFile(filePath, text);
  const schemasData = collectZodSchemas(sourceFile);
  const sections = [
    `FILE: ${filePath}`,
    `LINES: ${countLines(text)}`,
    renderBulletSection('IMPORTS:', collectImportEntries(sourceFile)),
    renderBulletSection(
      'EXPORTS:',
      collectExportEntries(sourceFile).map(
        (entry) => `${entry.name} : ${entry.type} — ${entry.signature}`,
      ),
    ),
  ];

  if (options.localDeclarations !== false) {
    sections.push(
      renderBulletSection(
        'LOCAL_DECLARATIONS:',
        collectLocalDeclarationEntries(sourceFile),
      ),
    );
  }

  sections.push(
    renderBulletSection('SCHEMAS (Zod):', schemasData.map(renderSchemaEntry)),
    renderBulletSection('CALLS_TO:', collectCallTargets(sourceFile)),
    renderBulletSection('SCHEMA_PARSERS:', collectSchemaParserCalls(text)),
    renderBulletSection('ENVIRONMENT_READS:', collectEnvironmentReads(text)),
    renderBulletSection('PRISMA_OPERATIONS:', collectPrismaOperations(text)),
    renderBulletSection('ROLE_GATES:', collectRoleRequirements(text)),
    renderBulletSection('FETCH_CALLS:', collectFetchCalls(text)),
    renderBulletSection('TANSTACK_QUERY_HOOKS:', collectTanstackHooks(text)),
    renderBulletSection('JSX_SURFACE_MARKERS:', collectJsxSurfaceMarkers(text)),
    renderBulletSection('LOGIC_FLOW:', buildLogicFlowEntries(sourceFile)),
    renderBulletSection(
      'INVARIANTS_ENFORCED:',
      collectInvariantEntries(sourceFile, schemasData),
    ),
  );

  return sections.join('\n');
}

function renderTypeScriptGroupSection(title, filePaths, options = {}) {
  return [
    `## ${title}`,
    '',
    filePaths
      .map((filePath) => renderTypeScriptFileSection(filePath, options))
      .join('\n\n'),
  ].join('\n');
}

function extractStringArrayInitializer(sourceFile, variableName) {
  const declaration = findNamedVariableDeclaration(sourceFile, variableName);
  if (!declaration?.initializer) {
    return [];
  }

  return uniqueSorted(
    [
      ...declaration.initializer
        .getText(sourceFile)
        .matchAll(/['"]([^'"]+)['"]/g),
    ].map((match) => match[1]),
  );
}

function extractSetInitializer(sourceFile, variableName) {
  return extractStringArrayInitializer(sourceFile, variableName);
}

function collectSwitchCases(sourceFile, functionName) {
  const functionDeclaration = findFunctionDeclaration(sourceFile, functionName);
  if (!functionDeclaration?.body) {
    return [];
  }

  const cases = [];

  function visit(node) {
    if (ts.isCaseClause(node)) {
      cases.push(
        truncateSnippet(`case ${node.expression.getText(sourceFile)}`, 160),
      );
    }

    ts.forEachChild(node, visit);
  }

  visit(functionDeclaration.body);
  return cases;
}

function collectMetricRulesFromText(text) {
  return [
    ...text.matchAll(
      /metricKey:\s*['"]([^'"]+)['"][\s\S]*?canonicalUnit:\s*['"]([^'"]+)['"]/g,
    ),
  ].map((match) => `${match[1]} -> ${match[2]}`);
}

function collectResearchColumns(text) {
  return [
    ...text.matchAll(
      /column_id:\s*['"]([^'"]+)['"][\s\S]{0,320}?name:\s*['"]([^'"]+)['"][\s\S]{0,220}?type:\s*['"]([^'"]+)['"]/g,
    ),
  ].map((match) => `${match[1]} (${match[3]}): ${match[2]}`);
}

function collectFastifyRegistrations(filePath) {
  const text = readRepoFile(filePath);
  return [
    ...text.matchAll(
      /app\.register\(([^,]+),\s*\{\s*prefix:\s*['"]([^'"]+)['"]/g,
    ),
  ].map((match) => `${collapseWhitespace(match[1])} -> ${match[2]}`);
}

function collectApiRoutePrefixByFile() {
  const appFilePath = 'apps/api-server/src/app.ts';
  const text = readRepoFile(appFilePath);
  const sourceFile = createSourceFile(appFilePath, text);
  const importSources = collectNamedImportSources(appFilePath, sourceFile);
  const prefixByFile = new Map();

  for (const match of text.matchAll(
    /app\.register\(([^,]+),\s*\{\s*prefix:\s*['"]([^'"]+)['"]/g,
  )) {
    const registerName = collapseWhitespace(match[1]);
    const routeFilePath = importSources.get(registerName);
    if (routeFilePath) {
      prefixByFile.set(routeFilePath, match[2]);
    }
  }

  return prefixByFile;
}

function joinRoutePath(prefix, routePath) {
  if (!prefix) {
    return routePath;
  }

  if (routePath === '/') {
    return prefix;
  }

  return `${prefix.replace(/\/$/, '')}/${routePath.replace(/^\//, '')}`;
}

function collectFastifyRoutes(sourceFile, prefix = '') {
  const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
  const routes = [];

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      methods.has(node.expression.name.text)
    ) {
      const firstArg = node.arguments[0];

      if (
        firstArg &&
        (ts.isStringLiteral(firstArg) ||
          ts.isNoSubstitutionTemplateLiteral(firstArg))
      ) {
        const localPath = firstArg.text;
        const handlerText = node.getText(sourceFile);
        const roles = collectRoleRequirements(handlerText);
        const schemas = collectSchemaParserCalls(handlerText);
        const spans = [
          ...handlerText.matchAll(/withSpan\(\s*['"]([^'"]+)['"]/g),
        ].map((match) => match[1]);
        const replyCodes = [
          ...handlerText.matchAll(/reply\.code\((\d+)\)/g),
        ].map((match) => match[1]);

        routes.push(
          `${node.expression.name.text.toUpperCase()} ${joinRoutePath(prefix, localPath)} | roles=${roles.join(', ') || 'none'} | schemas=${schemas.join(', ') || 'none'} | spans=${spans.join(', ') || 'none'} | reply_codes=${uniqueSorted(replyCodes).join(', ') || 'default'}`,
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routes;
}

function nextRouteFromAppPath(filePath) {
  const marker = 'apps/web-ui/src/app/';
  if (!filePath.startsWith(marker) || !filePath.endsWith('/page.tsx')) {
    return null;
  }

  const route = filePath
    .slice(marker.length, -'/page.tsx'.length)
    .split('/')
    .filter((segment) => !segment.startsWith('('))
    .join('/');

  return route ? `/${route}` : '/';
}

function collectApiClientFunctions(text) {
  return [
    ...text.matchAll(
      /export\s+async\s+function\s+([A-Za-z0-9_]+)[\s\S]*?fetch\(([^\n;]{1,220})/g,
    ),
  ].map(
    (match) => `${match[1]} -> ${truncateSnippet(`fetch(${match[2]}`, 220)}`,
  );
}

function collectTestInventory(sourceFile) {
  return collectStringLiteralCallArguments(sourceFile, [
    'describe',
    'it',
    'test',
  ]);
}

function collectTestAssertions(text) {
  return uniqueSorted(
    [...text.matchAll(/expect\(([^\n]{1,180})/g)].map((match) =>
      truncateSnippet(`expect(${match[1]}`, 180),
    ),
  );
}

function collectSqlStatements(text) {
  const withoutLineComments = text
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return withoutLineComments
    .split(';')
    .map((statement) => collapseWhitespace(statement))
    .filter(Boolean)
    .map(
      (statement, index) =>
        `${index + 1}. ${truncateSnippet(`${statement};`, 420)}`,
    );
}

function collectSqlObjects(text) {
  const patterns = [
    ['CREATE_TABLE', /CREATE\s+TABLE\s+"?([A-Za-z0-9_]+)"?/gi],
    ['ALTER_TABLE', /ALTER\s+TABLE\s+"?([A-Za-z0-9_]+)"?/gi],
    ['CREATE_INDEX', /CREATE\s+(?:UNIQUE\s+)?INDEX\s+"?([A-Za-z0-9_]+)"?/gi],
    ['DROP_TABLE', /DROP\s+TABLE\s+"?([A-Za-z0-9_]+)"?/gi],
  ];

  return uniqueSorted(
    patterns.flatMap(([label, pattern]) =>
      [...text.matchAll(pattern)].map((match) => `${label}:${match[1]}`),
    ),
  );
}

function renderSqlFileSection(filePath) {
  const text = readRepoFile(filePath);

  return [
    `FILE: ${filePath}`,
    `LINES: ${countLines(text)}`,
    renderBulletSection('SQL_OBJECTS:', collectSqlObjects(text)),
    renderBulletSection('SQL_STATEMENTS:', collectSqlStatements(text)),
  ].join('\n');
}

function parsePrismaBlocks(text, blockType) {
  const pattern = new RegExp(
    `^${blockType}\\s+([A-Za-z0-9_]+)\\s+\\{\\n([\\s\\S]*?)^\\}`,
    'gm',
  );
  return [...text.matchAll(pattern)].map((match) => ({
    name: match[1],
    body: match[2],
  }));
}

function renderPrismaSchemaSection(filePath) {
  const text = readRepoFile(filePath);
  const enums = parsePrismaBlocks(text, 'enum');
  const models = parsePrismaBlocks(text, 'model');
  const generators = parsePrismaBlocks(text, 'generator');
  const datasources = parsePrismaBlocks(text, 'datasource');
  const enumEntries = enums.map((entry) => {
    const values = entry.body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//'));
    return `${entry.name}: ${values.join(', ')}`;
  });
  const modelEntries = models.map((entry) => {
    const lines = entry.body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//'));
    const fields = lines.filter((line) => !line.startsWith('@@'));
    const attributes = lines.filter((line) => line.startsWith('@@'));
    return `${entry.name}: fields=[${fields.join('; ')}] attributes=[${attributes.join('; ')}]`;
  });

  return [
    '## packages/database/prisma/schema.prisma',
    '',
    `FILE: ${filePath}`,
    `LINES: ${countLines(text)}`,
    renderBulletSection(
      'GENERATORS:',
      generators.map(
        (entry) => `${entry.name}: ${collapseWhitespace(entry.body)}`,
      ),
    ),
    renderBulletSection(
      'DATASOURCES:',
      datasources.map(
        (entry) => `${entry.name}: ${collapseWhitespace(entry.body)}`,
      ),
    ),
    renderBulletSection('ENUMS:', enumEntries),
    renderBulletSection('MODELS:', modelEntries),
    `SUMMARY: ${enums.length} enum(s), ${models.length} model(s).`,
  ].join('\n');
}

function specAuthorityStatus(folder) {
  if (folder === '_templates') {
    return 'active_workflow_template_surface';
  }

  if (folder === '_examples') {
    return 'example_only_workflow_surface';
  }

  const authorityText = readRepoFile('docs/repository-authority-map.md');
  const folderPath = `specs/${folder}/`;
  const matchingLine = authorityText
    .split('\n')
    .find((line) => line.includes(folderPath));

  if (!matchingLine) {
    return 'numbered_feature_pack_not_explicitly_listed_in_authority_map';
  }

  const normalized = matchingLine.toLowerCase();

  if (normalized.includes('superseded')) {
    return 'superseded_reference';
  }

  if (normalized.includes('active')) {
    return 'active_execution_or_roadmap_surface';
  }

  if (normalized.includes('completed')) {
    return 'completed_reference_baseline';
  }

  if (normalized.includes('background')) {
    return 'background_reference';
  }

  if (normalized.includes('example-only')) {
    return 'example_only_workflow_surface';
  }

  return 'authority_map_referenced_surface';
}

function specFolderSignals(specFilePaths) {
  const names = new Set(
    specFilePaths.map((filePath) => filePath.split('/').pop()),
  );
  return [
    `has_spec=${names.has('spec.md')}`,
    `has_plan=${names.has('plan.md')}`,
    `has_tasks=${names.has('tasks.md')}`,
    `has_quickstart=${names.has('quickstart.md')}`,
    `has_research=${names.has('research.md')}`,
    `has_contract_notes=${specFilePaths.some((filePath) => filePath.includes('/contracts/'))}`,
  ];
}

function collectSpecTouchedAreas(specFilePaths) {
  const pathPattern =
    /`((?:apps|packages|tests|docs|scripts|bioelectro-copilot-contracts|bioelectrochem_agent_kit|specs)\/[^`\s]+)`/g;

  return uniqueSorted(
    specFilePaths.flatMap((filePath) =>
      [...readRepoFile(filePath).matchAll(pathPattern)].map(
        (match) => match[1],
      ),
    ),
  ).slice(0, 40);
}

function parseMarkdownSpec(filePath, specFilesByFolder) {
  const text = readRepoFile(filePath);
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? filePath;
  const headings = [...text.matchAll(/^#{1,3}\s+(.+)$/gm)].map((match) =>
    match[1].trim(),
  );
  const checked = [...text.matchAll(/^- \[[xX]\]/gm)].length;
  const unchecked = [...text.matchAll(/^- \[ \]/gm)].length;
  const folder = filePath.split('/')[1] ?? 'specs';
  const role = filePath.includes('/contracts/')
    ? 'planning contract note'
    : filePath.includes('/_templates/')
      ? 'template surface'
      : filePath.includes('/_examples/')
        ? 'example surface'
        : 'feature artifact';
  const siblingSpecFiles = specFilesByFolder.get(folder) ?? [filePath];

  return [
    `FILE: ${filePath}`,
    `LINES: ${countLines(text)}`,
    `SPEC_FOLDER: ${folder}`,
    `SPEC_ARTIFACT_ROLE: ${role}`,
    `SPEC_AUTHORITY_STATUS: ${specAuthorityStatus(folder)}`,
    `TITLE: ${title}`,
    renderBulletSection('HEADINGS:', headings),
    renderBulletSection(
      'SPEC_FOLDER_SIGNALS:',
      specFolderSignals(siblingSpecFiles),
    ),
    renderBulletSection(
      'SPEC_TOUCHED_AREAS:',
      collectSpecTouchedAreas(siblingSpecFiles),
    ),
    `TASK_CHECKBOXES: checked=${checked}; unchecked=${unchecked}`,
  ].join('\n');
}

function strictTrackedSourceFiles(trackedFiles) {
  return trackedFiles.filter((filePath) =>
    /\.(ts|tsx|prisma|sql)$/.test(filePath),
  );
}

function strictScopeFailures(trackedFiles, manifest) {
  const scopedFiles = new Set(scopedManifestFiles(manifest));
  return strictTrackedSourceFiles(trackedFiles)
    .filter((filePath) => !scopedFiles.has(filePath))
    .map(
      (filePath) =>
        `${filePath} is a tracked TS/TSX/Prisma/SQL file outside the export manifest.`,
    );
}

function sourceFilesForCoverageComparison(manifest) {
  return [
    ...manifest.domainContracts,
    ...manifest.ruleEngine,
    ...manifest.electrochemModels,
    ...manifest.researchIntelligence,
    ...manifest.prismaSchema,
    ...manifest.databaseMigrations,
    ...manifest.databaseSource,
    ...manifest.databaseScripts,
    ...manifest.authSource,
    ...manifest.auditSource,
    ...manifest.telemetrySource,
    ...manifest.llmAdapterSource,
    ...manifest.utilsSource,
    ...manifest.apiServerSource,
    ...manifest.researchWorkerSource,
    ...manifest.webUiSource,
    ...manifest.toolingTypeScript,
  ].sort();
}

function packageImportCoverageGroups(manifest) {
  return new Map([
    ['@metrev/domain-contracts', manifest.domainContracts],
    ['@metrev/rule-engine', manifest.ruleEngine],
    ['@metrev/electrochem-models', manifest.electrochemModels],
    ['@metrev/research-intelligence', manifest.researchIntelligence],
    ['@metrev/database', manifest.databaseSource],
    ['@metrev/auth', manifest.authSource],
    ['@metrev/audit', manifest.auditSource],
    ['@metrev/telemetry', manifest.telemetrySource],
    ['@metrev/llm-adapter', manifest.llmAdapterSource],
    ['@metrev/utils', manifest.utilsSource],
  ]);
}

function testCoverageComparison(manifest) {
  const sourceFiles = sourceFilesForCoverageComparison(manifest);
  const sourceFileSet = new Set(sourceFiles);
  const coveredFiles = new Set();
  const edges = [];
  const packageGroups = packageImportCoverageGroups(manifest);

  for (const testFilePath of manifest.testsSource) {
    const sourceFile = createSourceFile(
      testFilePath,
      readRepoFile(testFilePath),
    );

    for (const moduleSpecifier of collectImportModuleSpecifiers(sourceFile)) {
      const resolved = resolveTypeScriptImport(testFilePath, moduleSpecifier);

      if (sourceFileSet.has(resolved)) {
        coveredFiles.add(resolved);
        edges.push(`${testFilePath} -> ${resolved}`);
      }

      for (const [packageName, packageFiles] of packageGroups) {
        if (
          moduleSpecifier === packageName ||
          moduleSpecifier.startsWith(`${packageName}/`)
        ) {
          for (const packageFile of packageFiles) {
            coveredFiles.add(packageFile);
          }
          edges.push(
            `${testFilePath} -> ${packageName} (${packageFiles.length} file group)`,
          );
        }
      }
    }
  }

  const untestedFiles = sourceFiles.filter(
    (filePath) => !coveredFiles.has(filePath),
  );

  return {
    sourceFiles,
    coveredFiles: [...coveredFiles].sort(),
    untestedFiles,
    edges: uniqueSorted(edges),
  };
}

function renderTestCoverageComparison(manifest) {
  const comparison = testCoverageComparison(manifest);
  const coveredPercent =
    comparison.sourceFiles.length === 0
      ? 100
      : Number(
          (
            (comparison.coveredFiles.length / comparison.sourceFiles.length) *
            100
          ).toFixed(2),
        );

  return [
    'TEST_SOURCE_COVERAGE_COMPARISON:',
    `- scoped_source_files_compared=${comparison.sourceFiles.length}`,
    `- direct_or_package_import_covered=${comparison.coveredFiles.length}`,
    `- direct_or_package_import_covered_percent=${coveredPercent}`,
    renderBulletSection('DIRECT_OR_INDIRECT_TEST_EDGES:', comparison.edges),
    renderBulletSection(
      'UNTESTED_SCOPED_SOURCE_FILES:',
      comparison.untestedFiles,
    ),
  ].join('\n');
}

function scopedManifestFiles(manifest) {
  return Object.values(manifest).flat().sort();
}

function validateGeneratedDocument(documentText, manifest) {
  const fileMarkerCounts = new Map();

  for (const match of documentText.matchAll(/^FILE: (.+)$/gm)) {
    fileMarkerCounts.set(match[1], (fileMarkerCounts.get(match[1]) ?? 0) + 1);
  }

  const failures = [];

  for (const filePath of scopedManifestFiles(manifest)) {
    const count = fileMarkerCounts.get(filePath) ?? 0;
    if (count !== 1) {
      failures.push(`${filePath} appears ${count} time(s) as a FILE section.`);
    }
  }

  if (/Planned Section|Planned Coverage/.test(documentText)) {
    failures.push(
      'Generated document still contains planned-section placeholder text.',
    );
  }

  if (
    /unknown extraction|extraction not implemented|section not implemented/i.test(
      documentText,
    )
  ) {
    failures.push(
      'Generated document contains unfinished extractor placeholder language.',
    );
  }

  return failures;
}

function renderDomainContractsFileSection(filePath) {
  const text = readRepoFile(filePath);
  const sourceFile = createSourceFile(filePath, text);
  const schemasData = collectZodSchemas(sourceFile);
  const exports = collectExportEntries(sourceFile).map(
    (entry) => `${entry.name} : ${entry.type} — ${entry.signature}`,
  );
  const schemas = schemasData.map(renderSchemaEntry);
  const yamlLoads = collectYamlLoads(sourceFile);
  const callsTo = collectCallTargets(sourceFile);
  const logicFlow = buildLogicFlowEntries(sourceFile);
  const invariants = collectInvariantEntries(sourceFile, schemasData);

  return [
    `FILE: ${filePath}`,
    `LINES: ${countLines(text)}`,
    renderBulletSection('EXPORTS:', exports),
    renderBulletSection('SCHEMAS (Zod):', schemas),
    renderBulletSection('LOADS_FROM_YAML:', yamlLoads),
    renderBulletSection('CALLS_TO:', callsTo),
    renderBulletSection('LOGIC_FLOW:', logicFlow),
    renderBulletSection('INVARIANTS_ENFORCED:', invariants),
  ].join('\n');
}

function renderDomainContractsSection(manifest) {
  return [
    '## packages/domain-contracts/src/*.ts',
    '',
    manifest.domainContracts
      .map((filePath) => renderDomainContractsFileSection(filePath))
      .join('\n\n'),
  ].join('\n');
}

function findFunctionDeclaration(sourceFile, functionName) {
  return (
    sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === functionName,
    ) ?? null
  );
}

function findNamedVariableDeclaration(sourceFile, name) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return declaration;
      }
    }
  }

  return null;
}

function functionStatementSnippets(
  functionDeclaration,
  sourceFile,
  matcher,
  limit = 6,
) {
  if (!functionDeclaration?.body) {
    return [];
  }

  const snippets = [];

  function visit(node) {
    if (snippets.length >= limit) {
      return;
    }

    if (matcher(node)) {
      snippets.push(truncateSnippet(node.getText(sourceFile), 320));
    }

    ts.forEachChild(node, visit);
  }

  visit(functionDeclaration.body);

  return snippets;
}

function runCaseEvaluationBranches(functionDeclaration, sourceFile) {
  if (!functionDeclaration?.body) {
    return [];
  }

  return functionDeclaration.body.statements
    .filter(ts.isIfStatement)
    .map((statement) => {
      const condition = truncateSnippet(
        statement.expression.getText(sourceFile),
        220,
      );
      const effect = truncateSnippet(
        statement.thenStatement.getText(sourceFile),
        320,
      );
      return `if (${condition}) → ${effect}`;
    });
}

function renderExpectedImpacts(expectedImpacts) {
  if (!expectedImpacts || typeof expectedImpacts !== 'object') {
    return 'no expected impacts declared';
  }

  return Object.entries(expectedImpacts)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

function renderRuleEngineRulesApplied() {
  const compatibilityBlocks = parseRuleBlocks(
    ruleContractPaths.compatibility,
    'compatibility_rules',
  );
  const diagnosticBlocks = parseRuleBlocks(
    ruleContractPaths.diagnostics,
    'diagnostic_rules',
  );
  const improvementBlocks = parseRuleBlocks(
    ruleContractPaths.improvements,
    'improvement_rules',
  );

  const compatibilityEntries = compatibilityBlocks.map(
    (block) =>
      `${extractYamlScalar(block, 'id')}: condition=${collapseWhitespace(extractYamlNestedBlock(block, 'condition'))} → effect=${extractYamlScalar(block, 'finding')} [severity=${extractYamlScalar(block, 'severity')}]`,
  );

  const diagnosticEntries = diagnosticBlocks.map(
    (block) =>
      `${extractYamlScalar(block, 'id')}: condition=${collapseWhitespace(extractYamlNestedBlock(block, 'trigger'))} → effect=${extractYamlScalar(block, 'diagnosis')} [confidence=${extractYamlScalar(block, 'confidence')}; expected_effects=${extractYamlList(block, 'expected_effects').join(', ')}]`,
  );

  const improvementEntries = improvementBlocks.map(
    (block) =>
      `${extractYamlScalar(block, 'id')}: condition=linked_diagnosis=${extractYamlScalar(block, 'linked_diagnosis')} → effect=${extractYamlScalar(block, 'action')} [${renderExpectedImpacts(extractYamlMap(block, 'expected_impacts'))}]`,
  );

  return [...compatibilityEntries, ...diagnosticEntries, ...improvementEntries];
}

function renderRuleEngineScoringEntries(sourceFile) {
  const scoring = parseScoringModel();
  const runCaseEvaluation = findFunctionDeclaration(
    sourceFile,
    'runCaseEvaluation',
  );
  const computePriorityScore = findFunctionDeclaration(
    sourceFile,
    'computePriorityScore',
  );
  const toConfidenceLevel = findFunctionDeclaration(
    sourceFile,
    'toConfidenceLevel',
  );
  const reduceConfidence = findFunctionDeclaration(
    sourceFile,
    'reduceConfidence',
  );
  const rankingPolicySnippet = functionStatementSnippets(
    runCaseEvaluation,
    sourceFile,
    (node) =>
      ts.isVariableDeclaration(node) &&
      node.getText(sourceFile).includes('enrichedRecommendations'),
    1,
  )[0];

  return [
    `dimensions: ${scoring.dimensions
      .map(
        (config) =>
          `${config.name} (weight=${config.weight}${config.invert ? ', invert=true' : ''}, scale=${config.scale})`,
      )
      .join('; ')}`,
    `score calculation: ${truncateSnippet(computePriorityScore?.getText(sourceFile) ?? 'unavailable', 520)}`,
    `confidence adjustment: ${truncateSnippet(toConfidenceLevel?.getText(sourceFile) ?? 'unavailable', 440)}`,
    `confidence downgrade when evidence context stays low-confidence: ${truncateSnippet(functionStatementSnippets(runCaseEvaluation, sourceFile, (node) => ts.isConditionalExpression(node) && node.getText(sourceFile).includes('reduceConfidence'), 1)[0] ?? reduceConfidence?.getText(sourceFile) ?? 'unavailable', 420)}`,
    `ranking policy: ${truncateSnippet(rankingPolicySnippet ?? 'unavailable', 420)}`,
    `score cap rule: ${scoring.rule}`,
  ];
}

function renderRuleEngineUncertaintyEntries(sourceFile) {
  const sensitivity = parseSensitivityPolicy();
  const determineSensitivityLevel = findFunctionDeclaration(
    sourceFile,
    'determineSensitivityLevel',
  );
  const runCaseEvaluation = findFunctionDeclaration(
    sourceFile,
    'runCaseEvaluation',
  );

  return [
    `tracked factors: ${sensitivity.trackedFactors.join('; ')}`,
    `sensitivity policy rule: ${sensitivity.rule}`,
    `sensitivity calculation: ${truncateSnippet(determineSensitivityLevel?.getText(sourceFile) ?? 'unavailable', 500)}`,
    `uncertainty notes and next tests: ${truncateSnippet(functionStatementSnippets(runCaseEvaluation, sourceFile, (node) => (ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)) && node.getText(sourceFile).includes('confidence_and_uncertainty_summary'), 1)[0] ?? 'unavailable', 520)}`,
    `evidence-context gap handling: ${truncateSnippet(functionStatementSnippets(runCaseEvaluation, sourceFile, (node) => ts.isVariableDeclaration(node) && node.getText(sourceFile).includes('evidenceContextGapNote'), 2).join(' '), 420)}`,
  ];
}

function renderRuleEngineDefaultsEntries(sourceFile) {
  const runCaseEvaluation = findFunctionDeclaration(
    sourceFile,
    'runCaseEvaluation',
  );

  return [
    `defaults and missing-data capture: ${truncateSnippet(functionStatementSnippets(runCaseEvaluation, sourceFile, (node) => ts.isVariableDeclaration(node) && (node.getText(sourceFile).includes('missingData =') || node.getText(sourceFile).includes('defaultsUsed =')), 2).join(' '), 360)}`,
    `confidence inputs include defaults and missing data: ${truncateSnippet(functionStatementSnippets(runCaseEvaluation, sourceFile, (node) => ts.isVariableDeclaration(node) && node.getText(sourceFile).includes('baseConfidenceLevel'), 1)[0] ?? 'unavailable', 420)}`,
    `output audit section: ${truncateSnippet(functionStatementSnippets(runCaseEvaluation, sourceFile, (node) => ts.isPropertyAssignment(node) && node.getText(sourceFile).includes('assumptions_and_defaults_audit'), 1)[0] ?? 'unavailable', 360)}`,
  ];
}

function renderRuleEngineSection(manifest) {
  const filePath = manifest.ruleEngine[0];
  const text = readRepoFile(filePath);
  const sourceFile = createSourceFile(filePath, text);
  const runCaseEvaluation = findFunctionDeclaration(
    sourceFile,
    'runCaseEvaluation',
  );

  return [
    '## packages/rule-engine/src/index.ts',
    '',
    `FILE: ${filePath}`,
    `LINES: ${countLines(text)}`,
    renderBulletSection(
      'EXPORTED FUNCTIONS:',
      collectExportEntries(sourceFile).map(
        (entry) => `${entry.name} : ${entry.type} — ${entry.signature}`,
      ),
    ),
    renderBulletSection(
      'EVALUATION_FLOW:',
      buildLogicFlowEntries(sourceFile).concat(
        functionStatementSnippets(
          runCaseEvaluation,
          sourceFile,
          (node) =>
            ts.isVariableDeclaration(node) &&
            node.getText(sourceFile).includes('compatibilityMatches'),
          1,
        ),
      ),
    ),
    renderBulletSection(
      'RULES_APPLIED:',
      renderRuleEngineRulesApplied().concat(
        runCaseEvaluationBranches(runCaseEvaluation, sourceFile),
      ),
    ),
    renderBulletSection(
      'SCORING_IMPLEMENTATION:',
      renderRuleEngineScoringEntries(sourceFile),
    ),
    renderBulletSection(
      'UNCERTAINTY_FRAMING:',
      renderRuleEngineUncertaintyEntries(sourceFile),
    ),
    renderBulletSection(
      'DEFAULTS_TRACKING:',
      renderRuleEngineDefaultsEntries(sourceFile),
    ),
  ].join('\n');
}

function renderElectrochemModelsSection(manifest) {
  const filePath = manifest.electrochemModels[0];
  const text = readRepoFile(filePath);
  const sourceFile = createSourceFile(filePath, text);
  const exportedFunctions = collectExportedFunctionNames(sourceFile);

  return [
    '## packages/electrochem-models/src/index.ts',
    '',
    renderTypeScriptFileSection(filePath),
    renderBulletSection(
      'SUPPORTED_TECHNOLOGY_FAMILIES:',
      extractSetInitializer(sourceFile, 'supportedTechnologyFamilies'),
    ),
    renderBulletSection(
      'DERIVED_RULE_INPUT_KEYS:',
      extractStringArrayInitializer(sourceFile, 'ruleInputSignalKeys'),
    ),
    renderBulletSection(
      'SIMULATION_MODES:',
      collectSwitchCases(sourceFile, 'resolveSimulationMode'),
    ),
    renderBulletSection(
      'EXPORTED_MODEL_SURFACE:',
      exportedFunctions.map(
        (name) =>
          `${name}: ${truncateSnippet(findFunctionDeclaration(sourceFile, name)?.getText(sourceFile) ?? name, 420)}`,
      ),
    ),
    renderBulletSection(
      'MODEL_ASSUMPTIONS_AND_FACTORS:',
      [
        truncateSnippet(
          findFunctionDeclaration(sourceFile, 'technologyTargets')?.getText(
            sourceFile,
          ) ?? '',
          420,
        ),
        truncateSnippet(
          findFunctionDeclaration(sourceFile, 'architectureFactor')?.getText(
            sourceFile,
          ) ?? '',
          260,
        ),
        truncateSnippet(
          findFunctionDeclaration(sourceFile, 'observabilityFactor')?.getText(
            sourceFile,
          ) ?? '',
          260,
        ),
        truncateSnippet(
          findFunctionDeclaration(sourceFile, 'evidenceFactor')?.getText(
            sourceFile,
          ) ?? '',
          260,
        ),
      ].filter(Boolean),
    ),
  ].join('\n');
}

function renderResearchIntelligenceFileSection(filePath) {
  const text = readRepoFile(filePath);
  const sourceFile = createSourceFile(filePath, text);
  const extraSections = [
    renderBulletSection('DEFAULT_COLUMNS:', collectResearchColumns(text)),
    renderBulletSection(
      'METRIC_NORMALIZATION_RULES:',
      collectMetricRulesFromText(text),
    ),
    renderBulletSection(
      'EXTRACTION_TEST_NAMES:',
      collectStringLiteralCallArguments(sourceFile, ['describe', 'it', 'test']),
    ),
  ];

  return [renderTypeScriptFileSection(filePath), ...extraSections].join('\n');
}

function renderResearchIntelligenceSection(manifest) {
  return [
    '## packages/research-intelligence/src/**/*.ts',
    '',
    manifest.researchIntelligence
      .map((filePath) => renderResearchIntelligenceFileSection(filePath))
      .join('\n\n'),
  ].join('\n');
}

function renderDatabaseMigrationsSection(manifest) {
  return [
    '## packages/database/prisma/migrations/**/*.sql',
    '',
    manifest.databaseMigrations
      .map((filePath) => renderSqlFileSection(filePath))
      .join('\n\n'),
  ].join('\n');
}

function renderDatabaseSourceSection(manifest) {
  return renderTypeScriptGroupSection(
    'packages/database/src/**/*.ts',
    manifest.databaseSource,
  );
}

function renderDatabaseScriptsSection(manifest) {
  return renderTypeScriptGroupSection(
    'packages/database/scripts/**/*.{ts,d.ts}',
    manifest.databaseScripts,
  );
}

function renderRuntimeSupportPackagesSection(manifest) {
  const groups = [
    ['packages/auth/src/**/*.ts', manifest.authSource],
    ['packages/audit/src/**/*.ts', manifest.auditSource],
    ['packages/telemetry/src/**/*.ts', manifest.telemetrySource],
    ['packages/llm-adapter/src/**/*.ts', manifest.llmAdapterSource],
    ['packages/utils/src/**/*.ts', manifest.utilsSource],
  ];

  return [
    '## Runtime Support Packages',
    '',
    groups
      .map(([title, filePaths]) =>
        renderTypeScriptGroupSection(title, filePaths),
      )
      .join('\n\n'),
  ].join('\n');
}

function renderApiServerFileSection(filePath, prefixByFile) {
  const text = readRepoFile(filePath);
  const sourceFile = createSourceFile(filePath, text);
  const prefix = prefixByFile.get(filePath) ?? '';
  const sections = [renderTypeScriptFileSection(filePath)];

  if (filePath === 'apps/api-server/src/app.ts') {
    sections.push(
      renderBulletSection(
        'FASTIFY_PLUGIN_REGISTRATIONS:',
        collectFastifyRegistrations(filePath),
      ),
    );
  }

  sections.push(
    `ROUTE_PREFIX: ${prefix || '/'}`,
    renderBulletSection(
      'FASTIFY_ENDPOINTS:',
      collectFastifyRoutes(sourceFile, prefix),
    ),
  );

  return sections.join('\n');
}

function renderApiServerSection(manifest) {
  const prefixByFile = collectApiRoutePrefixByFile();

  return [
    '## apps/api-server/src/**/*.ts',
    '',
    manifest.apiServerSource
      .map((filePath) => renderApiServerFileSection(filePath, prefixByFile))
      .join('\n\n'),
  ].join('\n');
}

function renderResearchWorkerFileSection(filePath) {
  const text = readRepoFile(filePath);
  const sourceFile = createSourceFile(filePath, text);

  return [
    renderTypeScriptFileSection(filePath),
    renderBulletSection('WORKER_ENVIRONMENT:', collectEnvironmentReads(text)),
    renderBulletSection('WORKER_QUEUE_AND_HEALTH_FLOW:', [
      ...functionStatementSnippets(
        findFunctionDeclaration(sourceFile, 'runResearchWorkerCycle'),
        sourceFile,
        (node) => ts.isVariableDeclaration(node) || ts.isReturnStatement(node),
        8,
      ),
      ...functionStatementSnippets(
        findFunctionDeclaration(sourceFile, 'main'),
        sourceFile,
        (node) =>
          ts.isIfStatement(node) ||
          ts.isWhileStatement(node) ||
          ts.isTryStatement(node),
        8,
      ),
    ]),
  ].join('\n');
}

function renderResearchWorkerSection(manifest) {
  return [
    '## apps/research-worker/src/*.ts',
    '',
    manifest.researchWorkerSource
      .map((filePath) => renderResearchWorkerFileSection(filePath))
      .join('\n\n'),
  ].join('\n');
}

function renderWebUiFileSection(filePath) {
  const text = readRepoFile(filePath);
  const nextRoute = nextRouteFromAppPath(filePath);

  return [
    renderTypeScriptFileSection(filePath),
    `NEXT_ROUTE: ${nextRoute ?? 'not-a-page-route'}`,
    renderBulletSection('UI_AUTH_GATES:', collectRoleRequirements(text)),
    renderBulletSection(
      'API_CLIENT_FUNCTIONS:',
      collectApiClientFunctions(text),
    ),
    renderBulletSection('CLIENT_QUERY_STATE:', collectTanstackHooks(text)),
    renderBulletSection(
      'VISIBLE_SURFACE_MARKERS:',
      collectJsxSurfaceMarkers(text),
    ),
  ].join('\n');
}

function renderWebUiSection(manifest) {
  return [
    '## apps/web-ui/src/**/*.{ts,tsx}',
    '',
    manifest.webUiSource
      .map((filePath) => renderWebUiFileSection(filePath))
      .join('\n\n'),
  ].join('\n');
}

function renderTestFileSection(filePath) {
  const text = readRepoFile(filePath);
  const sourceFile = createSourceFile(filePath, text);

  return [
    renderTypeScriptFileSection(filePath),
    renderBulletSection('TEST_CASES:', collectTestInventory(sourceFile)),
    renderBulletSection('KEY_ASSERTIONS:', collectTestAssertions(text)),
  ].join('\n');
}

function renderTestsSection(manifest) {
  return [
    '## tests/**/*.{ts,tsx}',
    '',
    renderTestCoverageComparison(manifest),
    '',
    manifest.testsSource
      .map((filePath) => renderTestFileSection(filePath))
      .join('\n\n'),
  ].join('\n');
}

function renderToolingTypeScriptSection(manifest) {
  return renderTypeScriptGroupSection(
    'tracked TypeScript tooling/config surfaces',
    manifest.toolingTypeScript,
  );
}

function renderSpecsSection(manifest) {
  const specFilesByFolder = new Map();
  for (const filePath of manifest.specsSource) {
    const folder = filePath.split('/')[1] ?? 'specs';
    specFilesByFolder.set(folder, [
      ...(specFilesByFolder.get(folder) ?? []),
      filePath,
    ]);
  }

  return [
    '## specs/**/*.md',
    '',
    manifest.specsSource
      .map((filePath) => parseMarkdownSpec(filePath, specFilesByFolder))
      .join('\n\n'),
  ].join('\n');
}

function requiredManifestFailures(manifest) {
  return manifestGroups
    .filter((group) => manifest[group.key].length === 0)
    .map((group) => `${group.label} did not match any tracked file.`);
}

function buildManifestTable(manifest) {
  return manifestGroups
    .map(
      (group) =>
        `| ${group.label} | ${manifest[group.key].length} | ${manifest[group.key][0] ?? 'n/a'} |`,
    )
    .join('\n');
}

function buildDocument({ manifest, trackedFiles }) {
  const branch = getGitValue(['rev-parse', '--abbrev-ref', 'HEAD']);
  const commit = getGitValue(['rev-parse', 'HEAD']);

  return [
    '<!-- markdownlint-disable -->',
    '',
    '# METREV Full Repository Functional Description — Machine-Readable Export',
    '',
    `Generated at: ${new Date().toISOString()}`,
    `Generator version: ${generatorVersion}`,
    `Source branch: ${branch}`,
    `Source commit: ${commit}`,
    '',
    'This document is generated from tracked repository files for downstream LLM use without repository file access.',
    '',
    '## Manifest',
    '',
    `Tracked files scanned: ${trackedFiles.length}`,
    '',
    '| Scope | Count | First Match |',
    '| --- | ---: | --- |',
    buildManifestTable(manifest),
    '',
    renderDomainContractsSection(manifest),
    '',
    renderRuleEngineSection(manifest),
    '',
    renderElectrochemModelsSection(manifest),
    '',
    renderResearchIntelligenceSection(manifest),
    '',
    renderPrismaSchemaSection(manifest.prismaSchema[0]),
    '',
    renderDatabaseMigrationsSection(manifest),
    '',
    renderDatabaseSourceSection(manifest),
    '',
    renderDatabaseScriptsSection(manifest),
    '',
    renderRuntimeSupportPackagesSection(manifest),
    '',
    renderApiServerSection(manifest),
    '',
    renderResearchWorkerSection(manifest),
    '',
    renderWebUiSection(manifest),
    '',
    renderToolingTypeScriptSection(manifest),
    '',
    renderTestsSection(manifest),
    '',
    renderSpecsSection(manifest),
  ].join('\n');
}

function writeOutput(outputPath, documentText) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${documentText}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const trackedFiles = listTrackedFiles();
  const manifest = buildManifest(trackedFiles);
  const failures = [
    ...requiredManifestFailures(manifest),
    ...strictScopeFailures(trackedFiles, manifest),
  ];

  if (failures.length > 0) {
    throw new Error(
      ['Repository export manifest check failed:', ...failures].join('\n'),
    );
  }

  const documentText = buildDocument({ manifest, trackedFiles });
  const documentFailures = validateGeneratedDocument(documentText, manifest);

  if (documentFailures.length > 0) {
    throw new Error(
      ['Repository export document check failed:', ...documentFailures].join(
        '\n',
      ),
    );
  }

  if (args.stdout) {
    process.stdout.write(`${documentText}\n`);
  }

  if (args.checkOnly) {
    process.stdout.write(
      `Repository export manifest check passed for ${trackedFiles.length} tracked files.\n`,
    );
    return;
  }

  if (args.write) {
    writeOutput(defaultOutputPath, documentText);
    process.stdout.write(
      `Wrote full repository functional export to ${defaultOutputPath}.\n`,
    );
  }
}

main();
