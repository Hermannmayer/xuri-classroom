// 汇总所有 chunk 里的 API 路径与字面量，按 chunk 归档
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'web';
const outDir = process.argv[3] || 'extract';
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const allApi = new Map(); // path -> Set(chunk)
const perChunk = {};

for (const f of files) {
  const js = fs.readFileSync(path.join(dir, f), 'utf8');
  const paths = [...js.matchAll(/["'`](\/api\/[A-Za-z0-9_\-/{}.:$]{0,120})["'`]/g)].map((m) => m[1]);
  const uniq = [...new Set(paths)];
  perChunk[f] = uniq;
  for (const p of uniq) {
    if (!allApi.has(p)) allApi.set(p, new Set());
    allApi.get(p).add(f);
  }
}

const sorted = [...allApi.keys()].sort();
fs.writeFileSync(
  path.join(outDir, 'api-index.json'),
  JSON.stringify(Object.fromEntries(sorted.map((p) => [p, [...allApi.get(p)]])), null, 2)
);
fs.writeFileSync(path.join(outDir, 'api-paths.txt'), sorted.join('\n'));
fs.writeFileSync(path.join(outDir, 'chunks.json'), JSON.stringify(perChunk, null, 2));

console.log(JSON.stringify({
  chunks: files.length,
  uniqueApiPaths: sorted.length,
  byChunk: Object.fromEntries(Object.entries(perChunk).map(([k, v]) => [k, v.length]).filter(([, v]) => v > 0)),
}, null, 2));
