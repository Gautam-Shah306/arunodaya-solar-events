import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Spec Contract Verification', () => {
  const specPath = path.resolve('docs/spec/ARUNODAYA-SPEC.md');
  const spec = fs.readFileSync(specPath, 'utf8');

  it('spec retains the section headings cited by project documents', () => {
    const requiredHeadings = [
      '3.3 Display rounding',
      '4.5 Reference logic',
      '5.2 Greeting',
      '8.2 Data handoff',
      '10.1 Snapshot contract',
      '15. Guardrails',
      '17. System design and architecture',
      '18. Source control and repository',
      '19. CI/CD and GitHub Pages deployment',
      '20. Implementation plan',
    ];

    for (const heading of requiredHeadings) {
      expect(spec.includes(heading), `Expected heading "${heading}" in spec`).toBe(true);
    }
  });

  it('spec states the chosen astronomy engine and the reference dataset path', () => {
    expect(spec.includes('astronomy-engine')).toBe(true);
    expect(spec.includes('packages/engine/tests/data/astro-reference-v1.json')).toBe(true);
  });

  it('spec contains no leftover placeholders or invented sections', () => {
    const forbiddenSubstrings = [
      'To be evaluated',
      'Prompt 3 benchmark',
      'Astronomy card',
      'Risks and mitigations',
      'Core dependencies',
      'Verification and quality gates',
      'x 2,814',
      '× 2,814',
      'in[0, 1)(',
      'asnot_started',
    ];

    for (const forbidden of forbiddenSubstrings) {
      expect(spec.includes(forbidden), `Did not expect substring "${forbidden}" in spec`).toBe(
        false,
      );
    }
  });
});
