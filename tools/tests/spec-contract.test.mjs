import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Splits markdown content by level-2 headings (## Heading).
 * @param {string} content
 * @returns {Map<string, string>}
 */
export function extractL2Sections(content) {
  const sections = new Map();
  const chunks = content.split(/\n(?=##\s+)/);
  for (const chunk of chunks) {
    const match = chunk.match(/^##\s+([^\n]+)/);
    if (match) {
      sections.set(match[1].trim(), chunk);
    }
  }
  return sections;
}

/**
 * Finds a section whose heading matches prefix or substring.
 * @param {Map<string, string>} sections
 * @param {string} query
 * @returns {string}
 */
export function getSectionBody(sections, query) {
  for (const [title, body] of sections.entries()) {
    if (title.startsWith(query) || title.includes(query)) {
      return body;
    }
  }
  throw new Error(`Section not found: ${query}`);
}

describe('Spec Contract Verification', () => {
  const specPath = path.resolve('docs/spec/ARUNODAYA-SPEC.md');
  const spec = fs.readFileSync(specPath, 'utf8');
  const sections = extractL2Sections(spec);

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

  it('spec guardrails section contains only do-not bullets', () => {
    const guardrails = getSectionBody(sections, '15. Guardrails');
    const bulletLines = guardrails
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- '));

    expect(bulletLines.length).toBeGreaterThan(0);
    for (const line of bulletLines) {
      expect(
        line.startsWith('- Do **not**'),
        `Expected bullet to start with "Do **not**": ${line}`,
      ).toBe(true);
    }
  });

  it('spec decision register records the astronomy engine as decided', () => {
    const decisions = getSectionBody(sections, '14. Decision register');
    expect(decisions).toMatch(
      /-\s+\*\*Astronomy engine:\*\*\s+Astronomy Engine\s+\(astronomy-engine/,
    );
  });

  it('spec stack table names the astronomy engine', () => {
    const stack = getSectionBody(sections, '10. Engineering stack');
    expect(stack).toMatch(/\|\s*Astronomy\s*\|\s*\*\*Astronomy Engine\*\*\s*\(astronomy-engine/);
  });

  it('spec testing section names the golden dataset path', () => {
    const testing = getSectionBody(sections, '12. Testing and validation');
    expect(testing).toContain('packages/engine/tests/data/astro-reference-v1.json');
  });

  it('spec definitions section carries the accuracy elevation and supported range bullets', () => {
    const astro = getSectionBody(sections, '3. Astronomical values and rounding');
    expect(astro).toContain('**Accuracy (Decided):**');
    expect(astro).toContain('astronomy-engine 2.1.19');
    expect(astro).toContain('**Elevation (Proposed):**');
    expect(astro).toContain('**Supported range and accuracy tiers (Proposed):**');
  });

  it('spec data handoff section defines snapshot status', () => {
    const widgets = getSectionBody(sections, '8. Android widgets');
    expect(widgets).toContain('`not_started`');
    expect(widgets).toContain('`ready`');
    expect(widgets).toContain('`expiring`');
    expect(widgets).toContain('`expired`');
  });

  it('spec theme section points to the themes package and document', () => {
    const design = getSectionBody(sections, '9. Design system');
    expect(design).toContain('packages/themes');
    expect(design).toContain('docs/THEMES.md');
  });

  it('spec contains no hex colour values other than pure dark anchor tokens', () => {
    const stripped = spec.replace(/#(?:000000|2A2A2A)\b/gi, '');
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });

  it('spec: 9.2 lists the eight themes and pure-dark pure black canvas', () => {
    const section9 = getSectionBody(sections, '9. Design system');
    expect(section9).toContain('### 9.2 Themes');
    const themes = [
      'light',
      'dark',
      'pure-dark',
      'darker',
      'navy',
      'burgundy',
      'porcelain',
      'sandstone',
    ];
    for (const t of themes) {
      expect(section9.toLowerCase()).toContain(t);
    }
    expect(section9).toContain('#000000');
    expect(section9).toContain('#2A2A2A');
    expect(section9).not.toContain('Aubergine');
    expect(section9).not.toContain('Midnight Teal');
  });

  it('spec: 9.4 documents the 46 contrast checks including border-canvas', () => {
    const section9 = getSectionBody(sections, '9. Design system');
    expect(section9).toContain('46 contrast checks');
    expect(section9).toContain('border-canvas');
  });

  it('spec: 10.3 references Playfair Display and not Gelasio', () => {
    const section10 = getSectionBody(sections, '10. Engineering stack');
    expect(section10).toContain('### 10.3 Fonts');
    expect(section10).toContain('Playfair Display');
    expect(section10).toContain('lnum');
    // Ensure Gelasio is only referenced as removed/superseded
    expect(section10).not.toMatch(/\busing Gelasio\b/i);
  });

  it('spec theme sections reference the themes package and the contrast document', () => {
    const design = getSectionBody(sections, '9. Design system');
    expect(design).toContain('packages/themes');
    expect(design).toContain('docs/THEMES.md');
  });

  it('spec states no implementation prompt count', () => {
    const section20 = getSectionBody(sections, '20. Implementation plan');
    expect(section20).not.toMatch(/\b\d+-prompt\b/i);
    expect(section20).toContain(
      'The phased implementation plan and delivery tracker live in docs/PLAN.md.',
    );
  });

  it('spec contains no invented section titles', () => {
    const forbidden = [
      'CIEDE2000',
      'Colour palette',
      'Theme selection',
      'Architecture and technical stack',
      'four workspace directories',
      'To be evaluated',
      'Astronomy card',
    ];
    for (const phrase of forbidden) {
      expect(spec).not.toContain(phrase);
    }
  });
});
