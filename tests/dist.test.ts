/**
 * Checks the built site in dist/ against SPEC §V.
 * Run `bun run build` first: without dist/ this file fails instead of skipping.
 */
import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { contact } from '../src/config';
import { scanRaw } from '../src/lib/raw';

const root = join(import.meta.dir, '..');
const dist = join(root, 'dist');
const raw = join(root, 'raw');

if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('dist/ not found: run `bun run build` before `bun test`.');
}

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const distFiles = walk(dist);
const pages = distFiles.filter((file) => file.endsWith('.html'));
const read = (file: string) => readFileSync(file, 'utf8');
/** `route` like '' or 'designs/ivory'. */
const page = (route: string) => read(join(dist, route, 'index.html'));

type Attrs = Record<string, string>;
const attrsOf = (tag: string): Attrs =>
  Object.fromEntries([...tag.matchAll(/\s([\w:-]+)(?:="([^"]*)")?/g)].map((m) => [m[1]!, m[2] ?? '']));
const tags = (html: string, name: string): Attrs[] =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => attrsOf(m[0]));

const stem = (file: string) => basename(file).replace(/\.[^.]+$/, '');
const designs = scanRaw(raw);

describe('V1: images', () => {
  for (const { slug, images } of designs) {
    test(`every visible image in raw/${slug}/ is on /designs/${slug}/`, () => {
      const html = page(`designs/${slug}`);
      const missing = images.filter((file) => !html.includes(`/_astro/${stem(file)}.`));
      expect(missing).toEqual([]);
    });
  }

  test('hidden images (_ file or _ folder) are never emitted to dist/', () => {
    const hidden = walk(raw)
      .map((file) => relative(raw, file).split(sep))
      .filter((parts) => parts.length > 1 && /\.(jpe?g|png|webp|avif)$/i.test(parts.at(-1)!))
      .filter((parts) => parts.some((part) => part.startsWith('_')))
      .map((parts) => stem(parts.at(-1)!));
    expect(hidden.length).toBeGreaterThan(0);
    const leaked = distFiles.filter((file) => hidden.some((name) => basename(file).startsWith(`${name}.`)));
    expect(leaked).toEqual([]);
  });
});

describe('V5: contact links', () => {
  test('no empty, "#", TODO or example hrefs on any page', () => {
    const bad = pages.flatMap((file) =>
      tags(read(file), 'a')
        .filter((a) => !a.href || a.href === '#' || /todo|example/i.test(a.href))
        .map((a) => `${relative(dist, file)}: ${a.href}`),
    );
    expect(bad).toEqual([]);
  });

  test('a contact link appears only when its src/config.ts value is set', () => {
    const prefixes = { whatsapp: 'https://wa.me/', email: 'mailto:', instagram: 'https://www.instagram.com/' };
    for (const [key, prefix] of Object.entries(prefixes) as [keyof typeof contact, string][]) {
      const rendered = pages.some((file) => tags(read(file), 'a').some((a) => a.href?.startsWith(prefix)));
      expect({ key, rendered }).toEqual({ key, rendered: contact[key] !== '' });
    }
  });

  test('enquiry block only with WhatsApp or email; footer contact list only with any value', () => {
    const withCta = Boolean(contact.whatsapp || contact.email);
    const withFooterList = Object.values(contact).some(Boolean);
    for (const { slug } of designs) expect(page(`designs/${slug}`).includes('id="enquire-title"')).toBe(withCta);
    for (const file of pages) expect(read(file).includes('site-footer__contact')).toBe(withFooterList);
  });
});

describe('V11: image dimensions', () => {
  test('every <img> has numeric width and height', () => {
    const bad = pages.flatMap((file) =>
      tags(read(file), 'img')
        .filter((img) => !/^\d+$/.test(img.width ?? '') || !/^\d+$/.test(img.height ?? ''))
        .map((img) => `${relative(dist, file)}: ${img.src}`),
    );
    expect(bad).toEqual([]);
  });
});

describe('V13: content sources', () => {
  test('no .docx file and no text from docx variants B/C in dist/', () => {
    expect(distFiles.filter((file) => /\.docx$/i.test(file))).toEqual([]);
    const variantHeadings = ['From Cocoon to Craft', 'A Textile That Ages Beautifully', 'Made Slowly. Made Meaningfully.'];
    expect(pages.filter((file) => variantHeadings.some((heading) => read(file).includes(heading)))).toEqual([]);
  });
});
