// 抽取：HTTP 方法+路径、i18n 词条、请求客户端痕迹
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'web';
const outDir = process.argv[3] || 'extract';
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();

const endpoints = new Map(); // "METHOD /path" -> Set(chunk)
const i18n = new Map();      // id -> defaultMessage
const methodCallCounts = {};

const unescape = (s) =>
  s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
   .replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\'/g, "'");

for (const f of files) {
  const js = fs.readFileSync(path.join(dir, f), 'utf8');

  // 1) .get("/api/xxx") / .post(...) 等
  for (const m of js.matchAll(/\.(get|post|put|delete|patch|head|options)\(\s*["'`](\/api\/[A-Za-z0-9_\-/{}.:$]{0,120})["'`]/gi)) {
    const key = `${m[1].toUpperCase()} ${m[2]}`;
    if (!endpoints.has(key)) endpoints.set(key, new Set());
    endpoints.get(key).add(f);
    methodCallCounts[m[1]] = (methodCallCounts[m[1]] || 0) + 1;
  }
  // 2) 带 method:"POST" 的 request(url, opts)
  for (const m of js.matchAll(/["'`](\/api\/[A-Za-z0-9_\-/{}.:$]{0,120})["'`][^{}]{0,80}\{[^{}]{0,120}?method\s*:\s*["'`](get|post|put|delete|patch)["'`]/gi)) {
    const key = `${m[2].toUpperCase()} ${m[1]}`;
    if (!endpoints.has(key)) endpoints.set(key, new Set());
    endpoints.get(key).add(f);
  }
  // 3) i18n: id:"..." 与 defaultMessage:"..." 同现
  for (const m of js.matchAll(/defaultMessage\s*:\s*"((?:[^"\\]|\\.){0,300})"/g)) {
    const msg = unescape(m[1]);
    const idM = js.slice(Math.max(0, m.index - 200), m.index).match(/id\s*:\s*"([^"]{0,120})"\s*,?\s*$/);
    const key = idM ? idM[1] : '(no-id)';
    if (!i18n.has(key)) i18n.set(key, msg);
  }
}

const eps = [...endpoints.keys()].sort();
fs.writeFileSync(path.join(outDir, 'endpoints.txt'), eps.join('\n'));
fs.writeFileSync(
  path.join(outDir, 'endpoints.json'),
  JSON.stringify(Object.fromEntries([...endpoints].map(([k, v]) => [k, [...v]])), null, 2)
);

const i18nRows = [...i18n.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, msg]) => `${id}\t${msg.replace(/\t/g, ' ')}`);
fs.writeFileSync(path.join(outDir, 'i18n.tsv'), i18nRows.join('\n'));

console.log(JSON.stringify({
  chunks: files.length,
  endpoints: eps.length,
  byMethod: methodCallCounts,
  i18nEntries: i18n.size,
}, null, 2));
