// 更全的端点提取：任何 "(\/api\/xxx" 调用点，连同紧邻的调用名（get/post/getWithPagination/...）
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'web';
const outDir = process.argv[3] || 'extract';
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
const rows = new Map(); // path -> { callers:Set, methods:Set, chunks:Set }

for (const f of files) {
  const js = fs.readFileSync(path.join(dir, f), 'utf8');
  const re = /(?:([A-Za-z_$][\w$.]{0,40})\s*\)?\s*\.?)?\s*\(\s*["'`](\/api\/[A-Za-z0-9_\-/{}.:$]{0,120})["'`]/g;
  let m;
  while ((m = re.exec(js))) {
    const caller = (m[1] || '').split('.').pop();
    const p = m[2];
    if (!rows.has(p)) rows.set(p, { callers: new Set(), chunks: new Set() });
    if (caller) rows.get(p).callers.add(caller);
    rows.get(p).chunks.add(f);
  }
  // 显式 method 选项
  for (const mm of js.matchAll(/["'`](\/api\/[A-Za-z0-9_\-/{}.:$]{0,120})["'`][\s\S]{0,120}?method\s*:\s*["'`](get|post|put|delete|patch)["'`]/gi)) {
    if (!rows.has(mm[1])) rows.set(mm[1], { callers: new Set(), chunks: new Set() });
    rows.get(mm[1]).callers.add(mm[2].toUpperCase() + ':opt');
  }
}

const METHOD_OF = { get: 'GET', post: 'POST', put: 'PUT', delete: 'DELETE', patch: 'PATCH', getWithPagination: 'GET' };

const out = {};
for (const [p, v] of [...rows].sort()) {
  const methods = new Set();
  for (const c of v.callers) {
    if (c.endsWith(':opt')) methods.add(c.replace(':opt', ''));
    else if (METHOD_OF[c]) methods.add(METHOD_OF[c]);
  }
  out[p] = { methods: [...methods].sort(), callers: [...v.callers].sort(), chunks: [...v.chunks].sort() };
}

fs.writeFileSync(path.join(outDir, 'endpoints-full.json'), JSON.stringify(out, null, 2));
fs.writeFileSync(
  path.join(outDir, 'endpoints-full.tsv'),
  Object.entries(out)
    .map(([p, v]) => [p, v.methods.join('/') || '?', v.callers.join('+'), v.chunks.join(',')].join('\t'))
    .join('\n')
);
console.log(JSON.stringify({ total: Object.keys(out).length, noMethod: Object.values(out).filter((v) => !v.methods.length).length }, null, 2));
