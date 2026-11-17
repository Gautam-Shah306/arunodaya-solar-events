import fs from 'node:fs';
import path from 'node:path';

/**
 * Extracts the actionlint Docker image digest from TOOLCHAIN.md content.
 * @param {string} toolchainContent
 * @returns {string} The full image digest (e.g. sha256:b1934ee5...)
 */
export function extractActionlintDigest(toolchainContent) {
  // Matches sha256 followed by 64 hexadecimal characters in actionlint section
  const match = toolchainContent.match(/rhysd\/actionlint(?:[:\w.-]*)?@(sha256:[a-f0-9]{64})/);
  if (!match || !match[1]) {
    // Alternatively look for a bare digest under actionlint header
    const fallbackMatch = toolchainContent.match(/(?:actionlint[\s\S]*?)(sha256:[a-f0-9]{64})/i);
    if (!fallbackMatch || !fallbackMatch[1]) {
      throw new Error('No actionlint image digest recorded in docs/TOOLCHAIN.md');
    }
    return fallbackMatch[1];
  }
  return match[1];
}

/**
 * Builds the fixed Docker argument array for running actionlint.
 * @param {{ repoPath?: string, toolchainContent?: string, toolchainPath?: string }} [options]
 * @returns {string[]} Array of command-line arguments for Docker spawn
 */
export function buildActionlintArgs(options = {}) {
  const repoPath = options.repoPath ?? path.resolve('.');
  let content = options.toolchainContent;

  if (content === undefined) {
    const toolchainPath = options.toolchainPath ?? path.join(repoPath, 'docs', 'TOOLCHAIN.md');
    if (!fs.existsSync(toolchainPath)) {
      throw new Error(`Toolchain documentation not found at: ${toolchainPath}`);
    }
    content = fs.readFileSync(toolchainPath, 'utf8');
  }

  const digest = extractActionlintDigest(content);
  const mountArg = `${repoPath}:/work`;
  const imageRef = `rhysd/actionlint@${digest}`;

  return ['run', '--rm', '-v', mountArg, '-w', '/work', imageRef];
}
