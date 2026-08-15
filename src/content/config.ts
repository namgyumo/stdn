import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    image: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    status: z.enum(['active', 'done', 'wip', 'idea']).default('active'),
    stack: z.array(z.string()).default([]),
    repo: z.string().url().optional(),
    demo: z.string().url().optional(),
    startedAt: z.coerce.date(),
    finishedAt: z.coerce.date().optional(),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    order: z.number().default(0),
  }),
});

const problems = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/problems' }),
  schema: z.object({
    number: z.number(),
    title: z.string(),
    tier: z.enum(['B3', 'B2', 'B1', 'S5', 'S4', 'S3', 'S2', 'S1', 'G5', 'G4', 'G3']),
    tierNum: z.number(), // solved.ac 기준: 브론즈 III=3 … 실버 V=6 … 골드 III=13
    tags: z.array(z.string()).default([]),
    timeLimitMs: z.number().default(1000),
    statement: z.string(),
    inputDesc: z.string(),
    outputDesc: z.string(),
    constraints: z.array(z.string()).default([]),
    examples: z
      .array(z.object({ in: z.string(), out: z.string() }))
      .default([]),
    cases: z
      .array(z.object({ in: z.string(), out: z.string() }))
      .default([]),
    starters: z.record(z.string()).default({}),
    editorial: z.string().optional(),
  }),
});

export const collections = { blog, projects, problems };
