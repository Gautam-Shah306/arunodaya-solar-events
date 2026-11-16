import { describe, expect, it } from 'vitest';
import { checkInvBom } from '../../lib/invariants/rule-bom.mjs';
import { makeTree } from '../helpers.mjs';

describe('INV-BOM', () => {
  it('INV-BOM flags a UTF-8 byte order mark in a text file', async () => {
    // UTF-8 BOM: 0xEF, 0xBB, 0xBF
    const bomBuffer = Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0x62, 0x63, 0x0a]);
    await makeTree(
      {
        'src/with-bom.ts': bomBuffer,
      },
      (tmpRoot) => {
        const findings = checkInvBom(tmpRoot, ['src/with-bom.ts']);
        expect(findings).toHaveLength(1);
        expect(findings[0]?.rule).toBe('INV-BOM');
        expect(findings[0]?.path).toBe('src/with-bom.ts');
        expect(findings[0]?.message).toContain('UTF-8 byte order mark');
      },
    );
  });

  it('INV-BOM flags a UTF-16 byte order mark', async () => {
    // UTF-16 LE BOM: 0xFF, 0xFE
    const leBomBuffer = Buffer.from([0xff, 0xfe, 0x61, 0x00, 0x62, 0x00, 0x0a, 0x00]);
    // UTF-16 BE BOM: 0xFE, 0xFF
    const beBomBuffer = Buffer.from([0xfe, 0xff, 0x00, 0x61, 0x00, 0x62, 0x00, 0x0a]);

    await makeTree(
      {
        'src/le-bom.json': leBomBuffer,
        'src/be-bom.md': beBomBuffer,
      },
      (tmpRoot) => {
        const findings = checkInvBom(tmpRoot, ['src/le-bom.json', 'src/be-bom.md']);
        expect(findings).toHaveLength(2);
        expect(findings[0]?.rule).toBe('INV-BOM');
        expect(findings[0]?.message).toContain('UTF-16 byte order mark');
        expect(findings[1]?.rule).toBe('INV-BOM');
        expect(findings[1]?.message).toContain('UTF-16 byte order mark');
      },
    );
  });

  it('INV-BOM ignores files without a byte order mark', async () => {
    await makeTree(
      {
        'src/clean.ts': 'export const a = 1;\n',
        'docs/clean.md': '# Title\n',
        'data.json': '{"key": "value"}\n',
      },
      (tmpRoot) => {
        const findings = checkInvBom(tmpRoot, ['src/clean.ts', 'docs/clean.md', 'data.json']);
        expect(findings).toHaveLength(0);
      },
    );
  });

  it('INV-BOM ignores binary file types', async () => {
    // Even if binary file begins with bytes 0xEF 0xBB 0xBF or 0xFF 0xFE
    const pseudoBomBinary = Buffer.from([0xef, 0xbb, 0xbf, 0x00, 0x01, 0x02]);
    await makeTree(
      {
        'assets/image.png': pseudoBomBinary,
        'fonts/font.woff2': pseudoBomBinary,
      },
      (tmpRoot) => {
        const findings = checkInvBom(tmpRoot, ['assets/image.png', 'fonts/font.woff2']);
        expect(findings).toHaveLength(0);
      },
    );
  });
});
