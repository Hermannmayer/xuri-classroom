// 抓每个 API 调用点前后的上下文，推断 HTTP method 与参数
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'web';
const out = process.argv[3] || 'extract/callsites.txt';

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
const lines = [];

for (const f of files) {
  const js = fs.readFileSync(path.join(dir, f), 'utf8');
  const re = /["'`](\/api\/[A-Za-z0-9_\-/{}.:$]{0,120})["'`]/g;
  let m;
  while ((m = re.exec(js))) {
    const start = Math.max(0, m.index - 120);
    const ctx = js.slice(start, m.index + m[0].length + 260).replace(/\s+/g, ' ');
    lines.push(`### ${f} :: ${m[1]}\n${ctx}\n`);
  }
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n'));
console.log(`callsites: ${lines.length} -> ${out}`);
