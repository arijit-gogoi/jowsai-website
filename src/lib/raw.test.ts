import { afterAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { byFilename, orderGallery, scanRaw, sortDesigns } from './raw';

const fixtures: string[] = [];

/** Builds a throwaway raw/ folder: `{ folder: [file names] }`, '.' = raw/ itself. */
function makeRaw(tree: Record<string, string[]>): string {
  const dir = mkdtempSync(join(tmpdir(), 'jowsai-raw-'));
  fixtures.push(dir);
  for (const [folder, files] of Object.entries(tree)) {
    const target = folder === '.' ? dir : join(dir, folder);
    mkdirSync(target, { recursive: true });
    for (const file of files) writeFileSync(join(target, file), '');
  }
  return dir;
}

afterAll(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true });
});

describe('scanRaw', () => {
  test('V1: lists visible images per design folder, skipping _ files, _ folders and non-images', () => {
    const dir = makeRaw({
      'red-motif': ['design.md', 'img2.jpg', '_sq1.jpg', 'notes.txt', 'img1.JPG'],
      ivory: ['design.md', 'w1.jpg'],
      _archive: ['design.md', 'old.jpg'],
      _draft: ['x.jpg'],
    });
    expect(scanRaw(dir)).toEqual([
      { slug: 'ivory', images: ['w1.jpg'] },
      { slug: 'red-motif', images: ['img1.JPG', 'img2.jpg'] },
    ]);
  });

  test('V1: image extensions match case-insensitively', () => {
    const dir = makeRaw({ mixed: ['design.md', 'a.JPEG', 'b.Png', 'c.webp', 'd.AVIF', 'e.gif', 'f.jpg.txt'] });
    expect(scanRaw(dir)[0]?.images).toEqual(['a.JPEG', 'b.Png', 'c.webp', 'd.AVIF']);
  });

  test('V2: filename order is numeric-aware and case-insensitive', () => {
    const dir = makeRaw({ ivory: ['design.md', 'img10.jpg', 'W4.JPG', 'img2.jpg', 'w3.jpg'] });
    expect(scanRaw(dir)[0]?.images).toEqual(['img2.jpg', 'img10.jpg', 'w3.jpg', 'W4.JPG']);
  });

  test('V3: a design folder without design.md fails, naming the folder and file', () => {
    const dir = makeRaw({ 'new-design': ['photo.jpg'] });
    expect(() => scanRaw(dir)).toThrow('raw/new-design/: missing design.md');
  });

  test('V3: a design folder with no visible images fails, naming the folder', () => {
    const dir = makeRaw({ empty: ['design.md', '_hidden.jpg', 'notes.txt'] });
    expect(() => scanRaw(dir)).toThrow('raw/empty/: no visible images');
  });

  test('V13: files in raw/ itself (home.md, .docx, loose images) are not design content', () => {
    const dir = makeRaw({ '.': ['home.md', 'landing-page-ideas.docx', 'loose.jpg'], ivory: ['design.md', 'w1.jpg'] });
    expect(scanRaw(dir)).toEqual([{ slug: 'ivory', images: ['w1.jpg'] }]);
  });
});

describe('orderGallery', () => {
  test('V2: listed images come first in list order, then unlisted ones by filename', () => {
    const gallery = orderGallery('red-motif', 'Red', ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img10.jpg'], [
      { file: 'img3.jpg', alt: 'Three' },
      { file: 'img1.jpg', alt: 'One' },
    ]);
    expect(gallery.map((image) => image.file)).toEqual(['img3.jpg', 'img1.jpg', 'img2.jpg', 'img10.jpg']);
  });

  test('V2: without an images list, filename order applies', () => {
    const gallery = orderGallery('ivory', 'Ivory', ['w1.jpg', 'w2.jpg', 'w10.jpg']);
    expect(gallery.map((image) => image.file)).toEqual(['w1.jpg', 'w2.jpg', 'w10.jpg']);
  });

  test('V3: a listed file that is not a visible image fails, naming the folder and file', () => {
    expect(() => orderGallery('ivory', 'Ivory', ['w1.jpg'], [{ file: 'w9.jpg', alt: 'Missing' }])).toThrow(
      'raw/ivory/design.md: images lists "w9.jpg"',
    );
    expect(() => orderGallery('ivory', 'Ivory', ['w1.jpg'], [{ file: '_sq2.jpg', alt: 'Hidden' }])).toThrow('"_sq2.jpg"');
  });

  test('V3: a file listed twice fails', () => {
    expect(() =>
      orderGallery('ivory', 'Ivory', ['w1.jpg'], [
        { file: 'w1.jpg', alt: 'One' },
        { file: 'w1.jpg', alt: 'Again' },
      ]),
    ).toThrow('raw/ivory/design.md: images lists "w1.jpg" twice');
  });

  test('V4: listed images keep their alt; unlisted ones get "<name> — photo <n>"', () => {
    const gallery = orderGallery('ivory', 'Eri Silk Stole — Ivory', ['w1.jpg', 'w2.jpg', 'w3.jpg'], [
      { file: 'w2.jpg', alt: 'Hanging on a rod' },
    ]);
    expect(gallery).toEqual([
      { file: 'w2.jpg', alt: 'Hanging on a rod' },
      { file: 'w1.jpg', alt: 'Eri Silk Stole — Ivory — photo 2' },
      { file: 'w3.jpg', alt: 'Eri Silk Stole — Ivory — photo 3' },
    ]);
  });

  test('V4: a blank listed alt falls back to the generated one', () => {
    expect(orderGallery('ivory', 'Ivory', ['w1.jpg'], [{ file: 'w1.jpg', alt: '   ' }])).toEqual([
      { file: 'w1.jpg', alt: 'Ivory — photo 1' },
    ]);
  });
});

describe('sortDesigns', () => {
  test('I.file: grid order is `order` ascending, then slug', () => {
    const designs = [{ slug: 'b' }, { slug: 'red-motif', order: 2 }, { slug: 'a' }, { slug: 'ivory', order: 1 }];
    expect(sortDesigns(designs).map((design) => design.slug)).toEqual(['ivory', 'red-motif', 'a', 'b']);
  });

  test('byFilename sorts numbers by value', () => {
    expect(['img10.jpg', 'img2.jpg', 'img1.jpg'].sort(byFilename)).toEqual(['img1.jpg', 'img2.jpg', 'img10.jpg']);
  });
});
