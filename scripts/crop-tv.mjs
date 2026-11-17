// Обрезает скрины TradingView до самого графика: убирает подпись с датой сверху,
// лого снизу и серую рамку. Повторный запуск безопасен — уже обрезанные файлы пропускаются.
// node scripts/crop-tv.mjs public/examples/**/*.png
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x, y) => { const i = (y * w + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const bg = px(2, 2).join();
  // идём от края внутрь, пока цвет фона, потом пропускаем рамку (пиксели светлее графика)
  const edge = (x, y, dx, dy) => {
    while (px(x, y).join() === bg) { x += dx; y += dy; if (x < 0 || y < 0 || x >= w || y >= h) return null; }
    const inner = (p) => Math.max(...p) < 12 || (Math.abs(p[0] - p[1]) > 8);
    let n = 0; while (!inner(px(x, y)) && n++ < 6) { x += dx; y += dy; }
    return dx ? x : y;
  };
  const sx = Math.round(w * 0.97), sy = Math.round(h * 0.5);
  const L = edge(0, sy, 1, 0), R = edge(w - 1, sy, -1, 0), T = edge(sx, 0, 0, 1), B = edge(sx, h - 1, 0, -1);
  if ([L, R, T, B].includes(null) || L > 80 || T > 160 || w - R > 80 || h - B > 300 || T < 10) { console.log('skip', f); continue; }
  const buf = await sharp(f).extract({ left: L, top: T, width: R - L + 1, height: B - T + 1 }).png().toBuffer();
  writeFileSync(f, buf);
  console.log('crop', f, { L, T, R: w - R, B: h - B });
}
