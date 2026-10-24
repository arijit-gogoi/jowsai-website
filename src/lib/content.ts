/**
 * Astro side of the raw/ content: joins the folder scan from ./raw with the
 * design.md / home.md collections and image metadata from import.meta.glob.
 */
import type { ImageMetadata } from 'astro';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { join } from 'node:path';
import { orderGallery, scanRaw, sortDesigns } from './raw';

// Every visible image inside a design folder, extension in any letter case.
// `_` files and `_` folders stay out of the glob, so they never reach dist/.
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  [
    '/raw/*/*.{[jJ][pP][gG],[jJ][pP][eE][gG],[pP][nN][gG],[wW][eE][bB][pP],[aA][vV][iI][fF]}',
    '!/raw/**/_*',
    '!/raw/_*/**',
  ],
  { eager: true },
);

const RAW_DIR = join(process.cwd(), 'raw');

/** `path` is relative to raw/, e.g. `red-motif/img2.jpg`. */
function imageAt(path: string, source: string): ImageMetadata {
  const image = imageModules[`/raw/${path}`]?.default;
  if (!image) throw new Error(`${source}: "${path}" is not a visible image inside a raw/ design folder.`);
  return image;
}

export interface GalleryItem {
  file: string;
  alt: string;
  image: ImageMetadata;
}

export interface Design {
  slug: string;
  order: number | undefined;
  name: string;
  subtitle: string | undefined;
  tags: string[];
  /** Display order; the first item is the grid cover. */
  gallery: GalleryItem[];
  entry: CollectionEntry<'designs'>;
}

/** All designs in grid order. Throws (failing the build) on any raw/ layout error. */
export async function getDesigns(): Promise<Design[]> {
  const entries = new Map((await getCollection('designs')).map((entry) => [entry.id, entry]));
  const designs = scanRaw(RAW_DIR).map(({ slug, images }): Design => {
    const entry = entries.get(slug);
    if (!entry) throw new Error(`raw/${slug}/design.md: not loaded by the designs collection.`);
    const { name, subtitle, order, tags = [], images: listed } = entry.data;
    const gallery = orderGallery(slug, name, images, listed).map((item) => ({
      ...item,
      image: imageAt(`${slug}/${item.file}`, `raw/${slug}/`),
    }));
    return { slug, order, name, subtitle, tags, gallery, entry };
  });
  return sortDesigns(designs);
}

export async function getHome() {
  const entry = await getEntry('home', 'home');
  if (!entry) throw new Error('raw/home.md: missing.');
  const { hero } = entry.data;
  return { entry, hero: { ...hero, image: imageAt(hero.image, 'raw/home.md hero.image') } };
}
