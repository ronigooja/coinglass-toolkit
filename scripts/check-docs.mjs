import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function filesUnder(directory, name) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path, name);
    return entry.isFile() && entry.name === name ? [path] : [];
  });
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

export function checkDocs(root) {
  const errors = [];
  const readme = join(root, 'README.md');
  const docs = join(root, 'docs');
  const modules = join(root, 'extension/modules');
  const markdown = [readme, ...(existsSync(docs) ? readdirSync(docs).filter((f) => f.endsWith('.md')).map((f) => join(docs, f)) : []), ...filesUnder(join(root, 'extension'), 'README.md')];

  for (const file of markdown) {
    if (!isFile(file)) {
      errors.push(`Missing documentation file: ${relative(root, file)}`);
      continue;
    }
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+['"].*?['"])?\s*\)/g)) {
      const target = match[1] ?? match[2];
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) continue;
      const path = target.split('#')[0].split('?')[0];
      if (!isFile(resolve(dirname(file), decodeURIComponent(path)))) errors.push(`${relative(root, file)}: missing link target ${target}`);
    }
  }

  if (existsSync(modules)) {
    for (const entry of readdirSync(modules, { withFileTypes: true })) {
      if (entry.isDirectory() && !isFile(join(modules, entry.name, 'README.md'))) errors.push(`Missing module README: extension/modules/${entry.name}/README.md`);
    }
  }

  if (isFile(readme)) {
    const section = readFileSync(readme, 'utf8').split(/^## Document map\s*$/m)[1]?.split(/^##\s/m)[0] ?? '';
    for (const line of section.split('\n')) {
      const cell = line.match(/^\s*\|\s*([^|]+)\s*\|/)?.[1].trim();
      if (!cell || /^:?-+/.test(cell) || cell === 'File') continue;
      const path = cell.match(/^\[([^\]]+)\]\([^)]+\)$/)?.[1] ?? cell.replace(/^`|`$/g, '');
      if (!isFile(resolve(root, path))) errors.push(`Document map: missing file ${path}`);
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkDocs(process.cwd());
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Documentation checks passed.');
  }
}
