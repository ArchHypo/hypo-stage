import fs from 'fs';
import path from 'path';
import {
  ACTION_TYPES,
  HYPOTHESIS_STATUSES,
  LIKERT_SCALE,
  QUALITY_ATTRIBUTES,
  SOURCE_TYPES,
} from './archhypo';

// Read as text: Backstage lint rules forbid importing the parent plugin's sources.
const BACKEND_SCHEMAS = path.resolve(
  __dirname,
  '../../../hypo-stage-backend/src/schemas/hypothesis.ts',
);

function backendEnum(name: string): string[] {
  const source = fs.readFileSync(BACKEND_SCHEMAS, 'utf8');
  const match = source.match(new RegExp(`${name}\\s*=\\s*z\\.enum\\(\\[([^\\]]*)\\]`));
  if (!match) {
    throw new Error(`${name} not found in ${BACKEND_SCHEMAS}`);
  }
  return Array.from(match[1].matchAll(/'([^']+)'|"([^"]+)"/g), m => m[1] ?? m[2]);
}

describe('ArchHypo enums', () => {
  it('match the hypo-stage backend schemas', () => {
    expect([...LIKERT_SCALE]).toEqual(backendEnum('likertScaleSchema'));
    expect([...HYPOTHESIS_STATUSES]).toEqual(backendEnum('statusSchema'));
    expect([...ACTION_TYPES]).toEqual(backendEnum('actionTypeSchema'));
    expect([...SOURCE_TYPES]).toEqual(backendEnum('sourceTypeSchema'));
    expect([...QUALITY_ATTRIBUTES]).toEqual(backendEnum('qualityAttributeSchema'));
  });
});
