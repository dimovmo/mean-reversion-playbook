import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const playbook = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/playbook' }),
  schema: z.object({ title: z.string() }),
});

const examples = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/examples' }),
  schema: z.object({
    pair: z.string(),
    market: z.enum(['Форекс', 'Индексы', 'Металлы', 'Нефть', 'Крипта']),
    direction: z.enum(['Long', 'Short']),
    grade: z.enum(['A+', 'A', 'B']),
    tf: z.string().default('4h'),
    date: z.coerce.date(),
    rr: z.number(),
    result: z.enum(['Профит', 'Стоп']),
    target: z.string(),
    // пути относительно /public, например /examples/eurusd-context.webp
    images: z.object({ context: z.string(), entry: z.string(), outcome: z.string() }),
  }),
});

export const collections = { playbook, examples };
