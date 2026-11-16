import zlib from 'node:zlib';

/**
 * 63 known table tags defined in W3C WOFF2 Section 5.1
 */
const KNOWN_TABLE_TAGS = [
  'cmap',
  'head',
  'hhea',
  'hmtx',
  'maxp',
  'name',
  'OS/2',
  'post',
  'cvt ',
  'fpgm',
  'glyf',
  'loca',
  'prep',
  'CFF ',
  'VORG',
  'EBDT',
  'EBLC',
  'gasp',
  'hdmx',
  'kern',
  'LTSH',
  'PCLT',
  'VDMX',
  'vhea',
  'vmtx',
  'BASE',
  'GDEF',
  'GPOS',
  'GSUB',
  'JSTF',
  'MATH',
  'CBDT',
  'CBLC',
  'COLR',
  'CPAL',
  'SVG ',
  'sbix',
  'acnt',
  'avar',
  'bdat',
  'bloc',
  'bhed',
  'bsln',
  'ccar',
  'cvar',
  'dsig',
  'fvar',
  'gvar',
  'hsty',
  'just',
  'lcar',
  'mort',
  'morx',
  'opbd',
  'prop',
  'trak',
  'Zapf',
  'Silf',
  'Glat',
  'Gloc',
  'Feat',
  'Sill',
  'SILL',
];

/**
 * Decodes a UIntBase128 variable-length integer from a buffer at a given offset.
 * @param {Buffer} buffer
 * @param {number} offset
 * @returns {{ value: number, offset: number } | { error: string }}
 */
function readUIntBase128(buffer, offset) {
  let accum = 0;
  for (let i = 0; i < 5; i++) {
    if (offset >= buffer.length) {
      return { error: 'Buffer overrun reading UIntBase128' };
    }
    const code = buffer[offset++];
    if (code === undefined) {
      return { error: 'Buffer overrun reading UIntBase128' };
    }
    if (i === 0 && code === 0x80) {
      return { error: 'Leading zero in UIntBase128' };
    }
    accum = (accum << 7) | (code & 0x7f);
    if ((code & 0x80) === 0) {
      return { value: accum, offset };
    }
  }
  return { error: 'UIntBase128 exceeds 5 bytes' };
}

/**
 * Parses WOFF2 header and table directory, Brotli-decompresses table data,
 * and extracts table tags and GSUB feature list tags.
 *
 * @param {Buffer | Uint8Array} input
 * @returns {{ tables: string[], gsubFeatures: string[] | null } | { error: string }}
 */
export function readWoff2(input) {
  try {
    if (!input || typeof input !== 'object') {
      return { error: 'Invalid input: expected Buffer or Uint8Array' };
    }
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

    if (buffer.length < 48) {
      return { error: 'Buffer too small for WOFF2 header' };
    }

    const signature = buffer.toString('latin1', 0, 4);
    if (signature !== 'wOF2') {
      return { error: `Invalid WOFF2 signature: ${signature}` };
    }

    const numTables = buffer.readUInt16BE(12);
    const totalCompressedSize = buffer.readUInt32BE(20);

    let offset = 48;
    const tableEntries = [];

    for (let i = 0; i < numTables; i++) {
      if (offset >= buffer.length) {
        return { error: 'Buffer overrun reading table directory' };
      }
      const flags = buffer[offset++];
      if (flags === undefined) {
        return { error: 'Buffer overrun reading table flags' };
      }
      const tagIndex = flags & 0x3f;
      let tag = '';
      if (tagIndex === 63) {
        if (offset + 4 > buffer.length) {
          return { error: 'Buffer overrun reading custom table tag' };
        }
        tag = buffer.toString('latin1', offset, offset + 4);
        offset += 4;
      } else {
        tag = KNOWN_TABLE_TAGS[tagIndex] ?? `tag${tagIndex}`;
      }

      const origLenRes = readUIntBase128(buffer, offset);
      if ('error' in origLenRes) return origLenRes;
      const origLength = origLenRes.value;
      offset = origLenRes.offset;

      let transformLength = null;
      let isTransformed = false;

      // Table transformation rules per WOFF2 specification
      if (tag === 'glyf' || tag === 'loca') {
        const transformVersion = (flags >> 6) & 0x03;
        if (transformVersion === 0) {
          isTransformed = true;
        }
      } else if (tag === 'hmtx') {
        const transformVersion = (flags >> 6) & 0x03;
        if (transformVersion !== 0) {
          isTransformed = true;
        }
      } else if ((flags & 0xc0) !== 0) {
        isTransformed = true;
      }

      if (isTransformed) {
        const transLenRes = readUIntBase128(buffer, offset);
        if ('error' in transLenRes) return transLenRes;
        transformLength = transLenRes.value;
        offset = transLenRes.offset;
      }

      const dataLength = isTransformed && transformLength !== null ? transformLength : origLength;
      tableEntries.push({ tag, origLength, transformLength, dataLength });
    }

    if (offset + totalCompressedSize > buffer.length) {
      return { error: 'Compressed table stream exceeds buffer length' };
    }

    const compressedData = buffer.subarray(offset, offset + totalCompressedSize);
    let decompressed;
    try {
      decompressed = zlib.brotliDecompressSync(compressedData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Brotli decompression failed: ${msg}` };
    }

    const tables = tableEntries.map((e) => e.tag);
    const gsubIndex = tableEntries.findIndex((e) => e.tag === 'GSUB');
    if (gsubIndex === -1) {
      return { tables, gsubFeatures: null };
    }

    let gsubOffset = 0;
    for (let i = 0; i < gsubIndex; i++) {
      const entry = tableEntries[i];
      if (entry) {
        gsubOffset += entry.dataLength;
      }
    }
    const gsubEntry = tableEntries[gsubIndex];
    if (!gsubEntry) {
      return { tables, gsubFeatures: null };
    }
    const gsubData = decompressed.subarray(gsubOffset, gsubOffset + gsubEntry.origLength);

    if (gsubData.length < 8) {
      return { tables, gsubFeatures: null };
    }

    const featureListOffset = gsubData.readUInt16BE(6);
    if (featureListOffset + 2 > gsubData.length) {
      return { tables, gsubFeatures: null };
    }

    const featureCount = gsubData.readUInt16BE(featureListOffset);
    const gsubFeatures = [];
    for (let i = 0; i < featureCount; i++) {
      const recordOffset = featureListOffset + 2 + i * 6;
      if (recordOffset + 4 <= gsubData.length) {
        gsubFeatures.push(gsubData.toString('latin1', recordOffset, recordOffset + 4));
      }
    }

    return { tables, gsubFeatures };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Unexpected error parsing WOFF2: ${msg}` };
  }
}
