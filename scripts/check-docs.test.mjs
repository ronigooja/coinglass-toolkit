import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDocs } from './check-docs.mjs';

function fixture(t) {
  const root = mkdtempSync(join(dirname(fileURLToPath(import.meta.url)), '.docs-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, content) => {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  };
  write('README.md', '## Document map\n\n| File | Type |\n|---|---|\n| `docs/ok.md` | Doc |\n');
  write('docs/ok.md', '[home](../README.md#map) [web](https://example.org) [anchor](#here)');
  write('extension/modules/example/README.md', '[doc](../../../docs/ok.md)');
  return { root, write };
}

test('passes for existing documentation', (t) => {
  const { root } = fixture(t);
  assert.deepEqual(checkDocs(root), []);
});

test('reports missing relative links', (t) => {
  const { root, write } = fixture(t);
  write('docs/ok.md', '[missing](missing.md#section)');
  assert.match(checkDocs(root).join('\n'), /docs\/ok.md: missing link target missing.md#section/);
});

test('reports modules without a README', (t) => {
  const { root, write } = fixture(t);
  write('extension/modules/other/index.js', '');
  assert.match(checkDocs(root).join('\n'), /Missing module README: extension\/modules\/other\/README.md/);
});

test('reports missing plain document map paths', (t) => {
  const { root, write } = fixture(t);
  write('README.md', '## Document map\n\n| File | Type |\n|---|---|\n| `docs/missing.md` | Doc |\n');
  assert.match(checkDocs(root).join('\n'), /Document map: missing file docs\/missing.md/);
});
