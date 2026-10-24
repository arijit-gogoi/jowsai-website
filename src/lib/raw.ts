/**
 * Reads the layout of the `raw/` content folder: which design folders exist,
 * which images each one shows and in which order. Pure TypeScript on node:fs,
 * so `bun test` runs it directly; src/lib/content.ts adds frontmatter and
 * image metadata on the Astro side.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface DesignFolder {
  slug: string;
  /** Visible image file names in filename order. */
  images: string[];
}

export interface GalleryImage {
  file: string;
  alt: string;
}

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|avif)$/i;

/** Files and folders starting with `_` are hidden from the site. */
export const isHidden = (name: string): boolean => name.startsWith('_');

export const isVisibleImage = (name: string): boolean => !isHidden(name) && IMAGE_EXTENSION.test(name);

/** Numeric-aware, case-insensitive: img2 < img10 < w3 < W4. */
export const byFilename = (a: string, b: string): number =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

/**
 * Lists every visible design folder in `rawDir` with its visible images.
 * Throws when a folder has no design.md or no visible image.
 */
export function scanRaw(rawDir: string): DesignFolder[] {
  if (!existsSync(rawDir)) throw new Error(`raw/ folder not found at ${rawDir}`);
  return readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !isHidden(entry.name))
    .map((entry) => entry.name)
    .sort(byFilename)
    .map((slug) => {
      const files = readdirSync(join(rawDir, slug), { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);
      if (!files.includes('design.md')) {
        throw new Error(`raw/${slug}/: missing design.md. Add one, or rename the folder to _${slug} to hide it.`);
      }
      const images = files.filter(isVisibleImage).sort(byFilename);
      if (images.length === 0) {
        throw new Error(
          `raw/${slug}/: no visible images. Add a .jpg, .jpeg, .png, .webp or .avif file whose name does not start with "_".`,
        );
      }
      return { slug, images };
    });
}

/**
 * Gallery order: images listed in design.md first, in list order, then the
 * remaining visible images by filename. The first image is the grid cover.
 * Listed images keep their alt; the rest get "<name> — photo <n>".
 */
export function orderGallery(
  slug: string,
  name: string,
  visible: string[],
  listed: { file: string; alt: string }[] = [],
): GalleryImage[] {
  const listedFiles = new Set<string>();
  for (const { file } of listed) {
    if (!visible.includes(file)) {
      throw new Error(`raw/${slug}/design.md: images lists "${file}", which is not a visible image in raw/${slug}/.`);
    }
    if (listedFiles.has(file)) throw new Error(`raw/${slug}/design.md: images lists "${file}" twice.`);
    listedFiles.add(file);
  }
  const unlisted = visible.filter((file) => !listedFiles.has(file)).sort(byFilename);
  return [...listed, ...unlisted.map((file) => ({ file, alt: '' }))].map((image, index) => ({
    file: image.file,
    alt: image.alt.trim() || `${name} — photo ${index + 1}`,
  }));
}

/** Grid order: `order` ascending (designs without one go last), then slug. */
export function sortDesigns<T extends { slug: string; order?: number | undefined }>(designs: T[]): T[] {
  return [...designs].sort(
    (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || byFilename(a.slug, b.slug),
  );
}
