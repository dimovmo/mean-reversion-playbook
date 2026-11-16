// Генератор чистых свечных графиков для глоссария/примеров (утверждённый стиль, ноябрь 2026).
// Запуск: node scripts/charts/render.mjs snr-1 [ещё имена…]
// Берёт scripts/charts/<имя>.json, пишет public/glossary/<имя>.png и <имя>-light.png
// (светлую версию сайт подставляет сам, см. lightOf в src/content.config.ts).
//
// Формат <имя>.json:
//   candles: [[open, high, low, close], …]   — слева направо
//   levels:  [{ price, from, to }]           — горизонтальная линия от свечи from до свечи to (без to — до правого края); muted: true — приглушённая серая (50% внутри FVG)
//   range:   [low, high]                     — необязательно; по умолчанию мин/макс ±4%
//   zones:    [{ from, to, low, high, label }] — прямоугольная зона (FVG и т.п.), подпись справа
//   ellipses: [{ from, to, low, high, label }] — овал вокруг области (HTV и т.п.), подпись сверху
//   marks:    [{ at, price, label }]           — точка на свече с выноской вверх (Test и т.п.)
//   arrows:   [{ from: [i, price], to: [i, price] }] — стрелка (Impulse/Correction)
//   callouts: [{ at: [i, price], dx, dy, label }]   — точка, линия на dx/dy px и плашка (как выноски TradingView)
//   from/to/at — индексы свечей (можно дробные), цены — в единицах графика
//   out:     "public/glossary"               — необязательно
//   space:   0                               — необязательно; пустые слоты справа (место под подписи)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

// Стиль: без сетки, осей и подписей; фон совпадает с фоном окна «Подробнее» (.gm-sl в global.css)
const THEMES = {
  '':       { bg: '#111111', up: '#34b36a', dn: '#ef5350', lvl: '#d1d4dc', mut: '#6e6e6e', tag: '#262626' },
  '-light': { bg: '#eeeeee', up: '#1f9d55', dn: '#f23645', lvl: '#444444', mut: '#b8b8b8', tag: '#dadada' },
};
const W = 2000, H = 1300, PAD = { l: 80, r: 160, t: 70, b: 70 };
const BODY = 0.62;   // ширина тела от шага свечи
const WICK = 2.5;    // тень
const LINE = 2;      // уровень: сплошная, 2px в файле ≈ 1px на странице (картинка показывается ~в 2 раза меньше)

function svg({ candles, levels = [], range, zones = [], ellipses = [], marks = [], arrows = [], callouts = [], space = 0 }, t) {
  const lows = candles.map((c) => c[2]), highs = candles.map((c) => c[1]);
  let [lo, hi] = range ?? [Math.min(...lows), Math.max(...highs)];
  if (!range) { const p = (hi - lo) * 0.04; lo -= p; hi += p; }
  const n = candles.length + space, step = (W - PAD.l - PAD.r) / n, bw = step * BODY;
  const y = (p) => PAD.t + ((hi - p) / (hi - lo)) * (H - PAD.t - PAD.b);
  const x = (i) => PAD.l + step * (i + 0.5);
  const f = (v) => v.toFixed(1);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="100%" height="100%" fill="${t.bg}"/>`];
  // подпись разметки: плашка в цвет уровня, без лишнего
  const tag = (cx, cy, text) => {
    const w = text.length * 13 + 32, h = 44;
    return `<rect x="${f(cx - w / 2)}" y="${f(cy - h / 2)}" width="${w}" height="${h}" rx="8" fill="${t.tag}"/>` +
      `<text x="${f(cx)}" y="${f(cy + 9)}" fill="${t.lvl}" font-family="Helvetica, Arial, sans-serif" font-size="26" text-anchor="middle">${text}</text>`;
  };
  for (const { from, to, low, high, label } of zones) {
    const x1 = x(from) - bw / 2, x2 = x(to) + bw / 2, ym = (y(high) + y(low)) / 2;
    out.push(`<rect x="${f(x1)}" y="${f(y(high))}" width="${f(x2 - x1)}" height="${f(y(low) - y(high))}" fill="${t.lvl}" opacity="0.14"/>`);
    if (label) out.push(`<line x1="${f(x2)}" x2="${f(x2 + 60)}" y1="${f(ym)}" y2="${f(ym)}" stroke="${t.lvl}" stroke-width="${LINE}"/>`, tag(x2 + 60 + label.length * 7.5 + 16, ym, label));
  }
  for (const { from, to, low, high, label } of ellipses) {
    const cx = (x(from) + x(to)) / 2, cy = (y(high) + y(low)) / 2, rx = (x(to) - x(from)) / 2, ry = (y(low) - y(high)) / 2;
    out.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${t.lvl}" fill-opacity="0.08" stroke="${t.lvl}" stroke-width="${LINE}"/>`);
    if (label) out.push(`<line x1="${f(cx)}" x2="${f(cx)}" y1="${f(cy - ry)}" y2="${f(cy - ry - 70)}" stroke="${t.lvl}" stroke-width="${LINE}"/>`, tag(cx, cy - ry - 92, label));
  }
  for (const { price, from = 0, to, muted } of levels)
    out.push(`<line x1="${f(x(from) - bw / 2)}" x2="${to == null ? W - 40 : f(x(to) + bw / 2)}" y1="${f(y(price))}" y2="${f(y(price))}" stroke="${muted ? t.mut : t.lvl}" stroke-width="${LINE}"/>`);
  candles.forEach(([o, h, l, c], i) => {
    const col = c >= o ? t.up : t.dn, cx = f(x(i)), top = y(Math.max(o, c)), bot = y(Math.min(o, c));
    out.push(`<line x1="${cx}" x2="${cx}" y1="${f(y(h))}" y2="${f(y(l))}" stroke="${col}" stroke-width="${WICK}"/>`);
    out.push(`<rect x="${f(x(i) - bw / 2)}" y="${f(top)}" width="${f(bw)}" height="${f(Math.max(bot - top, 2.5))}" fill="${col}"/>`);
  });
  for (const { at, price, label } of marks) {
    const cx = x(at), py = y(price);
    out.push(`<line x1="${f(cx)}" x2="${f(cx)}" y1="${f(py)}" y2="${f(py - 220)}" stroke="${t.lvl}" stroke-width="${LINE}"/>`,
      `<circle cx="${f(cx)}" cy="${f(py)}" r="5" fill="${t.lvl}"/>`, tag(cx, py - 242, label));
  }
  // стрелки: [[i, price], [i, price]] — открытый наконечник в конце (как в TradingView)
  for (const { from: [i1, p1], to: [i2, p2] } of arrows) {
    const ax = x(i1), ay = y(p1), bx = x(i2), by = y(p2), a = Math.atan2(by - ay, bx - ax), L = 28;
    const hd = (s) => `${f(bx - L * Math.cos(a + s))},${f(by - L * Math.sin(a + s))}`;
    out.push(`<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="${t.lvl}" stroke-width="${LINE * 1.5}"/>`,
      `<polyline points="${hd(0.45)} ${f(bx)},${f(by)} ${hd(-0.45)}" fill="none" stroke="${t.lvl}" stroke-width="${LINE * 1.5}"/>`);
  }
  // выноски: точка в [i, price], линия на dx/dy px, плашка за концом линии
  for (const { at: [i, p], dx = 0, dy = 0, label } of callouts) {
    const px = x(i), py = y(p), ex = px + dx, ey = py + dy, w = label.length * 13 + 32;
    const cx = dx ? ex + Math.sign(dx) * w / 2 : ex, cy = dy ? ey + Math.sign(dy) * 22 : ey;
    out.push(`<line x1="${f(px)}" y1="${f(py)}" x2="${f(ex)}" y2="${f(ey)}" stroke="${t.lvl}" stroke-width="${LINE}"/>`,
      `<circle cx="${f(px)}" cy="${f(py)}" r="5" fill="${t.lvl}"/>`, tag(cx, cy, label));
  }
  return out.concat('</svg>').join('\n');
}

const names = process.argv.slice(2);
if (!names.length) { console.error('node scripts/charts/render.mjs <имя> [имя…]'); process.exit(1); }
for (const name of names) {
  const spec = JSON.parse(readFileSync(join(ROOT, 'scripts/charts', `${name}.json`), 'utf8'));
  for (const [suf, t] of Object.entries(THEMES)) {
    const file = join(ROOT, spec.out ?? 'public/glossary', `${name}${suf}.png`);
    const src = svg(spec, t);
    await sharp(Buffer.from(src)).png().toFile(file);
    // SVG-копия для ручной правки в Figma (перетащить файл на холст — всё редактируемыми слоями)
    mkdirSync(join(ROOT, 'scripts/charts/svg'), { recursive: true });
    writeFileSync(join(ROOT, 'scripts/charts/svg', `${name}${suf}.svg`), src);
    console.log('→', file.replace(ROOT + '/', ''));
  }
}
