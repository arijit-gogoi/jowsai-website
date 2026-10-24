import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.string().trim().min(1);

/** raw/<slug>/design.md; `_` folders are skipped, the folder name is the slug. */
const designs = defineCollection({
  loader: glob({
    pattern: '[!_]*/design.md',
    base: './raw',
    generateId: ({ entry }) => entry.split('/')[0] ?? entry,
  }),
  schema: z.object({
    name: text,
    subtitle: text.optional(),
    order: z.number().optional(),
    images: z.array(z.object({ file: text, alt: text })).optional(),
    tags: z.array(text).optional(),
  }),
});

/** raw/home.md: hero frontmatter + story body. */
const home = defineCollection({
  loader: glob({ pattern: 'home.md', base: './raw', generateId: () => 'home' }),
  schema: z.object({
    hero: z.object({
      image: text,
      alt: text,
      title: text,
      tagline: text,
      lede: text,
    }),
  }),
});

export const collections = { designs, home };
