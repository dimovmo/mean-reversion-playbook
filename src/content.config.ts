import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { existsSync } from 'node:fs';

const playbook = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/playbook' }),
  schema: z.object({ title: z.string() }),
});

// один SL/TP строкой или до трёх списком: tp: ["FTA: 4h FVG", "1h Swing Low"]
// значения с двоеточием — в кавычках, иначе YAML прочитает их как объект
const levels = z
  .union([z.string(), z.array(z.string()).min(1).max(3)])
  .transform((x) => (typeof x === 'string' ? [x] : x));

// скрин строкой или с подписью — общий формат для примеров и глоссария
// если рядом в public/ лежит <имя>-light.<ext> (snr-1.png → snr-1-light.png), он показывается в светлой теме
const lightOf = (src: string) => {
  const l = src.replace(/(\.[^./]+)$/, '-light$1');
  return l !== src && existsSync(`public${l}`) ? l : undefined;
};
const image = z
  .union([z.string(), z.object({ src: z.string(), label: z.string().optional() })])
  .transform((x) => (typeof x === 'string' ? { src: x, label: undefined } : x))
  .transform((x) => ({ ...x, light: lightOf(x.src) }));

const examples = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/examples' }),
  schema: z.object({
    pair: z.string(),
    market: z.enum(['Форекс', 'Индексы', 'Металлы', 'Нефть', 'Криптовалюта']),
    direction: z.enum(['Long', 'Short']),
    date: z.coerce.date(),
    rr: z.number(),
    result: z.enum(['Профит', 'Стоп']),
    thesis: z.string().optional(),
    sl: levels.default([]),
    tp: levels,
    entry: z.string().optional(),
    // Pros этой сделки — факторы, повышающие её качество, свободным текстом: [LRL, RSI > 75, Deep premium]
    ev: z.array(z.string()).default([]),
    // скрины по порядку показа; путь относительно /public.
    // можно просто строкой или с подписью: { src: /examples/ger40-4h.png, label: 4h }
    images: z.array(image).min(1),
  }),
});

// Термин = файл src/content/glossary/<id>.md; id — имя файла как есть (якорь /glossary#<id>).
// d — краткое определение для подсказки <Term>, тело файла — текст окна «Подробнее» (markdown, можно пустым).
const glossary = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/glossary',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    term: z.string(),
    en: z.string().optional(),
    d: z.string(),
    aliases: z.array(z.string()).default([]),
    // скрины окна «Подробнее» — как в примерах: файлы в public/glossary/, { src: /glossary/snr-1.png, label: Пробитие }
    images: z.array(image).default([]),
  }),
});

export const collections = { playbook, examples, glossary };
