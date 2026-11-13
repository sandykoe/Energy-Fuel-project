import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

const baseUrl = process.argv[2] || 'https://energy-fuel-project.sandykoe101.workers.dev/';
const files = ['index.html', 'workspace.js', 'integrated-optimizer.js', 'data/scenario-dataset.json'];

for (const file of files) {
  const expected = await readFile(new URL(`../dist/${file}`, import.meta.url));
  const url = new URL(file === 'index.html' ? './' : file, baseUrl);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: 'no-store' });
      assert.equal(response.status, 200, `${file}: HTTP ${response.status}`);
      const actual = Buffer.from(await response.arrayBuffer());
      assert.ok(actual.equals(expected), `${file}: deployed content differs from this build`);
      console.log(`Verified ${file} (${actual.length} bytes)`);
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`${file}: ${error.message}; retrying`);
      await setTimeout(2_000);
    }
  }
}
console.log(`Deployment verified: ${baseUrl}`);
