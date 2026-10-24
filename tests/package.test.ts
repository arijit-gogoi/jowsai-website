import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
      })
    : [];

describe('package', () => {
  test('V8: no UI framework or Tailwind dependency', () => {
    const banned =
      /^(react|react-dom|preact|vue|svelte|solid-js|lit|alpinejs|tailwindcss|@tailwindcss\/.+|@astrojs\/(react|preact|vue|svelte|solid-js|lit|alpinejs|tailwind))$/;
    expect(deps.filter((name) => banned.test(name))).toEqual([]);
  });

  test('I.cmd: dev, build, preview, check and test scripts', () => {
    expect(pkg.scripts).toMatchObject({
      dev: 'astro dev',
      build: 'astro build',
      preview: 'astro preview',
      check: 'astro check',
      test: 'bun test',
    });
  });

  test('bun is the package manager', () => {
    expect(existsSync(join(root, 'bun.lock'))).toBe(true);
    expect(existsSync(join(root, 'package-lock.json'))).toBe(false);
  });
});

describe('content sources', () => {
  test('V13: build sources and config never read .docx files', () => {
    const sources = walk(join(root, 'src')).filter((file) => !file.endsWith('.test.ts'));
    const files = [...sources, join(root, 'astro.config.mjs')];
    expect(files.filter((file) => /\.docx\b/i.test(readFileSync(file, 'utf8')))).toEqual([]);
  });
});
