import fs from 'node:fs';
import path from 'node:path';

/**
 * Parses Python reference image digest from docs/TOOLCHAIN.md.
 * Throws a clear error if missing or unrecorded.
 * @param {string} [toolchainPath]
 * @returns {string}
 */
export function readPythonImageFromToolchain(toolchainPath) {
  const resolvedPath = toolchainPath || path.resolve(process.cwd(), 'docs/TOOLCHAIN.md');
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Toolchain document not found: ${resolvedPath}`);
  }
  const content = fs.readFileSync(resolvedPath, 'utf8');
  const match = content.match(/Python reference image:\s*([^\s\r\n]+)/i);
  if (!match || !match[1]) {
    throw new Error('No python image digest recorded in docs/TOOLCHAIN.md');
  }
  return match[1].trim();
}

/**
 * Extracts forwarded flags from command-line arguments (flags after '--').
 * @param {string[]} argv
 * @returns {string[]}
 */
export function extractForwardedFlags(argv) {
  const dashIndex = argv.indexOf('--');
  if (dashIndex !== -1) {
    return argv.slice(dashIndex + 1);
  }
  return argv;
}

/**
 * Builds the Docker argument array for running the reference dataset generator.
 * Asserts that no element contains double quotes.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot] Path to repository root
 * @param {string} [options.toolchainPath] Optional custom path to docs/TOOLCHAIN.md
 * @param {string} [options.pythonImage] Optional explicit image override
 * @param {string[]} [options.forwardedFlags] Flags to forward to generate_reference.py
 * @param {string[]} [options.argv] Raw process.argv to parse flags from
 * @returns {string[]}
 */
export function buildReferenceDockerArgs(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  let pythonImage = options.pythonImage;
  if (!pythonImage) {
    pythonImage = readPythonImageFromToolchain(options.toolchainPath);
  }

  if (!pythonImage) {
    throw new Error('No python image digest recorded');
  }

  let forwarded = options.forwardedFlags || [];
  if (options.argv) {
    forwarded = extractForwardedFlags(options.argv);
  }

  const repoMount = `${path.resolve(repoRoot)}:/work`;
  const flagsStr = forwarded.length > 0 ? ` ${forwarded.join(' ')}` : '';
  const shCmd = `pip install --cache-dir /root/.cache/pip skyfield ephem && python tools/reference/generate_reference.py${flagsStr}`;

  const args = [
    'run',
    '--rm',
    '-v',
    repoMount,
    '-v',
    'arunodaya-pip-cache:/root/.cache/pip',
    '-v',
    'arunodaya-skyfield-data:/data',
    '-w',
    '/work',
    pythonImage,
    'sh',
    '-c',
    shCmd,
  ];

  for (const arg of args) {
    if (typeof arg === 'string' && arg.includes('"')) {
      throw new Error(
        `reference generator docker argument contains forbidden double quote: ${arg}`,
      );
    }
  }

  return args;
}
