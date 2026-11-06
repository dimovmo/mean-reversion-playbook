# Mean Reversion — сайт плейбука

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # статический сайт в dist/
```

Деплой: Cloudflare Pages или Vercel, build command `npm run build`, output `dist`.

## Как добавить пример
1. Положите три скрина в `public/examples/` (WebP, одинаковая обрезка).
2. Скопируйте любой файл из `src/content/examples/`, поменяйте frontmatter и пути к картинкам.
3. Напишите разбор под frontmatter.
