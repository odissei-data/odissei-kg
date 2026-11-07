import { parse } from 'csv-parse/sync';

const target = 'https://doi.org/10.17026/DANS-XRZ-KESR';
const variableKey = 'variableInformation:odisseiVariable';
const nameKey = 'variableInformation:odisseiVariableName';

export function exclusionNames(csv: string): Set<string> {
  const rows: Record<string, string>[] = parse(csv, {
    bom: true,
    columns(headers: string[]) {
      if (headers.filter(header => header === 'variable').length !== 1) {
        throw new Error('LISS exclusion CSV must contain one variable column');
      }
      return headers;
    },
    skip_empty_lines: true,
  });
  const names = new Set<string>();
  for (const row of rows) {
    if (!row.variable || row.variable !== row.variable.trim() || names.has(row.variable)) {
      throw new Error(`Empty, whitespace-padded, or duplicate LISS variable name: ${row.variable}`);
    }
    names.add(row.variable);
  }
  if (names.size !== 6022) throw new Error(`Expected 6022 LISS exclusions, got ${names.size}`);
  return names;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function filterLissVariables(json: string, exclusions: Set<string>): string {
  const document: unknown = JSON.parse(json);
  if (!isObject(document) || !isObject(document['@context'])
      || document['@context'].variableInformation !== 'https://portal.odissei.nl/schema/variableInformation#'
      || !isObject(document['ore:describes'])
      || document['ore:describes']['@id'] !== target) {
    throw new Error('Unexpected LISS JSON-LD dataset or variable context');
  }
  const dataset = document['ore:describes'];
  const variables = dataset[variableKey];
  if (!Array.isArray(variables)) throw new Error('LISS variables must be an array');

  const matched = new Set<string>();
  const names = new Set<string>();
  dataset[variableKey] = variables.filter((variable: unknown) => {
    if (!isObject(variable) || typeof variable[nameKey] !== 'string' || '@id' in variable) {
      throw new Error('Expected an embedded LISS variable with a string name');
    }
    const name = variable[nameKey];
    if (names.has(name)) throw new Error(`Duplicate LISS variable name: ${name}`);
    names.add(name);
    if (!exclusions.has(name)) return true;
    matched.add(name);
    return false;
  });
  if (matched.size !== exclusions.size) {
    throw new Error(`Expected ${exclusions.size} LISS exclusions, matched ${matched.size}`);
  }
  console.info(`Filtered ${matched.size} LISS variables; ${variables.length - matched.size} remain`);
  return JSON.stringify(document);
}
