import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SPRITES, type SpriteName } from './lib/sprites';

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** Flags demo content so it is easy to find and delete later. */
    sample: z.boolean().default(false),
  }),
});

const spriteNames = Object.keys(SPRITES) as [SpriteName, ...SpriteName[]];

/** One project = one Markdown file: the front matter feeds the reel, the chart and the page header; the body is the story. */
const work = defineCollection({
  loader: glob({ base: './src/content/work', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    /** Mission number: 1 is first on the reel and the chart. */
    order: z.number(),
    /** Which animated pixel plate to draw (see src/scripts/plates.ts). */
    kind: z.enum(['hive', 'ledger', 'orbit', 'route', 'cochange']),
    seed: z.number().default(7),
    sprite: z.enum(spriteNames),
    area: z.string(),
    status: z.string(),
    question: z.string(),
    answer: z.string(),
    /** Three short labelled lines shown beside the plate on the home reel. */
    beats: z.array(z.tuple([z.string(), z.string()])),
    threads: z.array(z.enum(['graphs', 'decisions', 'shows-work'])).default([]),
    /** Position on the Work chart, in percent [x, y]. */
    pos: z.tuple([z.number(), z.number()]),
    /** Caption under the interactive figure. */
    caption: z.string(),
  }),
});

export const collections = { writing, work };
