import { readdir, readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../frontend/src/api/generated/', import.meta.url);
for (const name of await readdir(directory, { recursive: true })) {
  if (!name.endsWith('.ts')) continue;
  const path = new URL(name, directory);
  const source = await readFile(path, 'utf8');
  const normalized = source.replace(/\s+$/, '\n');
  if (source !== normalized) await writeFile(path, normalized);
}
