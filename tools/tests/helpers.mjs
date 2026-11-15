import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Creates a temporary directory structure from a map of relative paths to contents,
 * executes the given callback with the temporary root path, and cleans up afterwards.
 * @template T
 * @param {Record<string, string | Buffer>} tree Map of relative file paths to content
 * @param {(root: string) => Promise<T> | T} fn Callback to run
 * @returns {Promise<T>} Result of the callback
 */
export async function makeTree(tree, fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arunodaya-inv-test-'));

  try {
    for (const [relPath, content] of Object.entries(tree)) {
      const fullPath = path.join(tmpDir, relPath);
      const parentDir = path.dirname(fullPath);
      fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    return await fn(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
