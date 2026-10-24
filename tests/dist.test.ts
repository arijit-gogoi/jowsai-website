/**
 * Checks the built site in dist/ against SPEC §V.
 * Run `bun run build` first: without dist/ this file fails instead of skipping.
 */
import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import config from '../astro.config.mjs';
import { contact } from '../src/config';
import { orderGallery, scanRaw, sortDesigns } from '../src/lib/raw';

const root = join(import.meta.dir, '..');
const dist = join(root, 'dist');
const raw = join(root, 'raw');
// URLs in dist/ carry `base` (the GitHub Pages project path); the files under dist/ do not.
const base = (config.base ?? '').replace(/\/$/, '');

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
/** dist/ file that serves a root-absolute URL, e.g. `/jowsai-website/designs/ivory/#x` → designs/ivory/index.html. */
const fileFor = (url: string) => {
  const path = decodeURIComponent(url.slice(base.length).replace(/[?#].*$/, ''));
  return join(dist, path, path.endsWith('/') ? 'index.html' : '');
};

type Attrs = Record<string, string>;
const attrsOf = (tag: string): Attrs =>
  Object.fromEntries([...tag.matchAll(/\s([\w:-]+)(?:="([^"]*)")?/g)].map((m) => [m[1]!, m[2] ?? '']));
const tags = (html: string, name: string): Attrs[] =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => attrsOf(m[0]));

/** Inner HTML of the first <section> whose class list starts with `className`. */
const section = (html: string, className: string) => {
  const match = new RegExp(`<section\\b[^>]*\\bclass="${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</section>`).exec(html);
  if (!match) throw new Error(`no <section class="${className}">`);
  return match[1]!;
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return ENTITIES[entity.toLowerCase()] ?? match;
  });

/** Text a visitor reads: no scripts, styles or attributes; tags become spaces; smart quotes fold to straight ones. */
const visibleText = (html: string) =>
  decode(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/** Frontmatter and body of a raw/ Markdown file. */
const readMd = (file: string) => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(read(file));
  if (!match) throw new Error(`no frontmatter in ${file}`);
  return { data: Bun.YAML.parse(match[1]!) as Record<string, any>, body: match[2]! };
};
/** Paragraph and heading texts of a Markdown body, `---` lines dropped. */
const mdBlocks = (body: string) =>
  body
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block && block !== '---')
    .map((block) => block.replace(/^#+\s+/, '').replace(/\s+/g, ' '));

const stem = (file: string) => basename(file).replace(/\.[^.]+$/, '');
const designs = scanRaw(raw).map(({ slug, images }) => {
  const { data } = readMd(join(raw, slug, 'design.md'));
  const gallery = orderGallery(slug, data.name, images, data.images);
  return { slug, images, gallery, name: data.name as string, subtitle: data.subtitle as string | undefined, order: data.order as number | undefined, tags: (data.tags ?? []) as string[] };
});

describe('V1: images', () => {
  for (const { slug, images } of designs) {
    test(`every visible image in raw/${slug}/ is on /designs/${slug}/`, () => {
      const html = page(`designs/${slug}`);
      const missing = images.filter((file) => !html.includes(`${base}/_astro/${stem(file)}.`));
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

  test('the hero image loads eagerly with high priority; every other image is lazy', () => {
    const heroImages = tags(section(page(''), 'hero'), 'img');
    expect(heroImages).toHaveLength(1);
    expect(heroImages[0]).toMatchObject({ loading: 'eager', fetchpriority: 'high' });
    const all = pages.flatMap((file) => tags(read(file), 'img'));
    expect(all.filter((img) => img.fetchpriority === 'high')).toHaveLength(1);
    expect(all.filter((img) => img.fetchpriority !== 'high' && img.loading !== 'lazy').map((img) => img.src)).toEqual([]);
  });
});

describe('V6: home copy', () => {
  const home = readMd(join(raw, 'home.md'));
  const hero = home.data.hero as Record<string, string>;
  const fixedLines = ['JOWSAI', 'Eri Silk, Woven in Assam.', 'A quiet expression of heritage, shaped by nature and crafted by hand.'];

  test('the hero shows the three fixed lines verbatim, the title as the page <h1>', () => {
    expect([hero.title, hero.tagline, hero.lede]).toEqual(fixedLines);
    const heroText = visibleText(section(page(''), 'hero'));
    for (const line of fixedLines) expect(heroText).toContain(line);
    expect(tags(page(''), 'h1')).toHaveLength(1);
    expect(/<h1\b[^>]*>([^<]*)<\/h1>/.exec(page(''))?.[1]).toBe('JOWSAI');
  });

  test('the story renders every raw/home.md block in order and never repeats the hero lines', () => {
    const storyText = visibleText(section(page(''), 'story'));
    let from = 0;
    for (const block of mdBlocks(home.body)) {
      const at = storyText.indexOf(block, from);
      expect({ block, found: at >= 0 }).toEqual({ block, found: true });
      from = at + block.length;
    }
    expect(storyText).not.toContain(fixedLines[1]!);
    expect(storyText).not.toContain(fixedLines[2]!);
  });
});

describe('V8: scripts', () => {
  test('the home page ships no <script>', () => {
    expect(page('')).not.toMatch(/<script\b/i);
  });

  for (const { slug } of designs) {
    test(`/designs/${slug}/ ships only the lightbox script`, () => {
      const scripts = [...page(`designs/${slug}`).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
      expect(scripts).toHaveLength(1);
      const [, attributes, body] = scripts[0]!;
      const src = attrsOf(` ${attributes}`).src;
      const code = src ? read(fileFor(src)) : body!;
      expect(code).toContain('data-lightbox');
    });
  }
});

describe('V9: lightbox', () => {
  for (const { slug } of designs) {
    test(`/designs/${slug}/ has a closed <dialog> with labelled controls and no empty <img>`, () => {
      const dialog = /<dialog\b[^>]*data-lightbox[^>]*>([\s\S]*?)<\/dialog>/.exec(page(`designs/${slug}`));
      expect(dialog).not.toBeNull();
      expect(dialog![0]).not.toMatch(/<dialog\b[^>]*\bopen\b/);
      expect(tags(dialog![1]!, 'img')).toEqual([]);
      const buttons = tags(dialog![1]!, 'button');
      expect(buttons.map((button) => button['aria-label'])).toEqual(['Close', 'Previous photo', 'Next photo']);
    });
  }

  test('motion (transition, animation, smooth scroll) only inside prefers-reduced-motion: no-preference', () => {
    const files = walk(join(root, 'src')).filter((file) => /\.(css|astro)$/.test(file));
    const offenders = files.filter((file) => {
      let css = read(file);
      // Drop every `@media (prefers-reduced-motion: no-preference) { ... }` block, braces balanced.
      for (let at = css.indexOf('prefers-reduced-motion: no-preference'); at >= 0; at = css.indexOf('prefers-reduced-motion: no-preference')) {
        const start = css.lastIndexOf('@media', at);
        let depth = 0;
        let end = css.indexOf('{', at);
        for (; end < css.length; end++) {
          if (css[end] === '{') depth++;
          else if (css[end] === '}' && --depth === 0) break;
        }
        css = css.slice(0, start) + css.slice(end + 1);
      }
      return /\b(transition|animation)\s*:|scroll-behavior:\s*smooth/.test(css);
    });
    expect(offenders).toEqual([]);
  });
});

describe('I.route: home', () => {
  test('the #designs grid links every design in grid order with its cover, name and subtitle', () => {
    const grid = section(page(''), 'designs');
    const expected = sortDesigns(designs);
    expect(page('')).toMatch(/<section\b[^>]*\bid="designs"/);
    expect(tags(grid, 'a').map((a) => a.href)).toEqual(expected.map((design) => `${base}/designs/${design.slug}/`));
    expect(tags(grid, 'img').map((img) => /\/_astro\/([^/]+?)\.[^./]+\.[a-z]+$/.exec(img.src ?? '')?.[1])).toEqual(
      expected.map((design) => stem(design.gallery[0]!.file)),
    );
    const text = visibleText(grid);
    for (const design of expected) {
      expect(text).toContain(design.name);
      if (design.subtitle) expect(text).toContain(design.subtitle);
    }
  });
});

/** `/_astro/img2.9wuLxGZl_ZJ13RT.jpg` → `img2` */
const assetStem = (url = '') => /\/_astro\/([^/]+?)\.[^./]+\.[a-z0-9]+$/i.exec(url)?.[1];

describe('V4: alt text', () => {
  test('every <img> on every page has a non-empty alt', () => {
    const bad = pages.flatMap((file) =>
      tags(read(file), 'img')
        .filter((img) => !decode(img.alt ?? '').trim())
        .map((img) => `${relative(dist, file)}: ${img.src}`),
    );
    expect(bad).toEqual([]);
  });
});

for (const design of designs) {
  describe(`I.route: /designs/${design.slug}/`, () => {
    const html = page(`designs/${design.slug}`);
    const gallery = /<ul\b[^>]*\bclass="gallery\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? '';

    test('V2: gallery follows the images list, then filename order', () => {
      expect(tags(gallery, 'a').map((a) => assetStem(a.href))).toEqual(design.gallery.map((item) => stem(item.file)));
      expect(tags(gallery, 'img').map((img) => assetStem(img.src))).toEqual(design.gallery.map((item) => stem(item.file)));
    });

    test('V4: gallery alts are the listed alt or "<name> — photo <n>"', () => {
      expect(tags(gallery, 'img').map((img) => decode(img.alt ?? ''))).toEqual(design.gallery.map((item) => item.alt));
    });

    test('V9: every gallery thumbnail links to an emitted large image', () => {
      const hrefs = tags(gallery, 'a').map((a) => a.href ?? '');
      expect(hrefs).toHaveLength(design.gallery.length);
      expect(hrefs.filter((href) => !href.startsWith(`${base}/_astro/`) || !existsSync(fileFor(href)))).toEqual([]);
    });

    test('title block (name, subtitle, tags), story in order, back link to /#designs', () => {
      const head = /<header\b[^>]*\bclass="design__head\b[^"]*"[^>]*>([\s\S]*?)<\/header>/.exec(html)?.[1] ?? '';
      const h1 = decode(/<h1\b[^>]*>([^<]*)<\/h1>/.exec(head)?.[1] ?? '').replace(/ /g, ' ');
      expect(h1).toBe(design.name);
      const headText = visibleText(head);
      if (design.subtitle) expect(headText).toContain(design.subtitle);
      for (const tag of design.tags) expect(headText).toContain(tag);

      const storyText = visibleText(section(html, 'design__story'));
      let from = 0;
      for (const block of mdBlocks(readMd(join(raw, design.slug, 'design.md')).body)) {
        const at = storyText.indexOf(block, from);
        expect({ block, found: at >= 0 }).toEqual({ block, found: true });
        from = at + block.length;
      }
      expect(tags(html, 'a').some((a) => a.href === `${base}/#designs` && a.class?.includes('back'))).toBe(true);
    });
  });
}

describe('V7: ivory claims', () => {
  const claims = /\b(bodo|dyes?|dyed|blend(ed)?|natural colou?rs?)\b|100\s*%/i;

  test('the ivory page text makes no fibre-blend, Bodo or dye claim', () => {
    expect(visibleText(page('designs/ivory')).match(claims)?.[0] ?? null).toBeNull();
  });

  test('the same check does flag the red-motif page, so it reads real page text', () => {
    expect(visibleText(page('designs/red-motif')).match(claims)?.[0]).toBeDefined();
  });
});

describe('V13: content sources', () => {
  test('no .docx file and no text from docx variants B/C in dist/', () => {
    expect(distFiles.filter((file) => /\.docx$/i.test(file))).toEqual([]);
    const variantHeadings = ['From Cocoon to Craft', 'A Textile That Ages Beautifully', 'Made Slowly. Made Meaningfully.'];
    expect(pages.filter((file) => variantHeadings.some((heading) => read(file).includes(heading)))).toEqual([]);
  });
});

describe('V14: base path', () => {
  /** Root-absolute URLs in href, src, srcset (one per candidate) and CSS url(). */
  const urlsIn = (text: string) =>
    [
      ...[...text.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]!),
      ...[...text.matchAll(/\s(?:image)?srcset="([^"]*)"/g)].flatMap((m) => m[1]!.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]!)),
      ...[...text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]!),
    ].filter((url) => url.startsWith('/') && !url.startsWith('//'));
  const urls = distFiles
    .filter((file) => /\.(html|css)$/.test(file))
    .flatMap((file) => urlsIn(read(file)).map((url) => ({ file: relative(dist, file), url })));

  test('every root-absolute URL in dist/ HTML and CSS starts with the base', () => {
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter(({ url }) => !url.startsWith(`${base}/`))).toEqual([]);
  });

  test('every root-absolute URL in dist/ HTML and CSS resolves to an emitted file', () => {
    expect(urls.filter(({ url }) => !url.startsWith(`${base}/`) || !existsSync(fileFor(url)))).toEqual([]);
  });
});
