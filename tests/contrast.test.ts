import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const globalCss = readFileSync(join(root, 'src', 'styles', 'global.css'), 'utf8');
const tokens: Record<string, string> = Object.fromEntries(
  [...globalCss.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]),
);

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
};

// [text token, background token, minimum ratio]
const pairs: [string, string, number][] = [
  ['color-text', 'color-bg', 4.5],
  ['color-text', 'color-surface', 4.5],
  ['color-text-muted', 'color-bg', 4.5],
  ['color-text-muted', 'color-surface', 4.5],
  ['color-accent-text', 'color-bg', 4.5],
  ['color-accent-text', 'color-surface', 4.5],
  ['color-accent', 'color-bg', 3],
  ['color-on-dark', 'color-dark', 4.5],
  ['color-on-dark-muted', 'color-dark', 4.5],
  ['color-accent-on-dark', 'color-dark', 4.5],
];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

describe('V10: contrast', () => {
  for (const [fg, bg, min] of pairs) {
    test(`${fg} on ${bg} is at least ${min}:1`, () => {
      expect(tokens[fg]).toBeDefined();
      expect(tokens[bg]).toBeDefined();
      expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(min);
    });
  }

  test('the sampled coral accent is never used as a text color', () => {
    const styles = walk(join(root, 'src')).filter((file) => /\.(css|astro)$/.test(file));
    const offenders = styles.filter((file) => /(^|[\s;{])color:\s*var\(--color-accent\)/m.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
