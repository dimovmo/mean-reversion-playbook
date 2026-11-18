// Добавляет префикс BASE_PATH (например /mean-reversion-playbook) к внутренним ссылкам в dist.
// Нужен только для GitHub Pages без своего домена; со своим доменом шаг можно убрать.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.env.BASE_PATH || '').replace(/\/$/, '');
if (!base) process.exit(0);

const dist = 'dist';
const top = readdirSync(dist).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
// "/examples…", '/_astro…', (/glossary…), =/playbook (meta refresh)
const re = new RegExp(`(["'(=\`])/(${top.join('|')})(?=[/"'#?)\`]|$)`, 'g');

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
let n = 0;
for (const f of walk(dist).filter((f) => /\.(html|css|js|json|xml)$/.test(f))) {
  const s = readFileSync(f, 'utf8');
  const t = s.replace(re, `$1${base}/$2`);
  if (t !== s) { writeFileSync(f, t); n++; }
}
console.log(`base-path: ${base} → ${n} files`);
