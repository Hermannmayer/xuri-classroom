// 拆包 v2：每个模块输出为可直接 require 的 CommonJS 文件
// 产物：modules/<chunk>/<id>.cjs  →  module.exports = function (e, t, r) { ...原始函数体... }
import fs from 'node:fs';
import path from 'node:path';

const webDir = process.argv[2] || 'web';
const outDir = process.argv[3] || 'modules2';
fs.mkdirSync(outDir, { recursive: true });

function matchBrace(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === q) break;
        i++;
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

const files = fs.readdirSync(webDir).filter((f) => f.endsWith('.js')).sort();
const index = new Map(); // id -> {chunk, params, size}
let total = 0;

for (const f of files) {
  const src = fs.readFileSync(path.join(webDir, f), 'utf8');
  const chunkDir = path.join(outDir, f.replace(/\.js$/, ''));
  const re = /(?:^|[,{])\s*(\d{1,6})\s*:\s*(?:function\s*)?\(\s*([^()]{0,120}?)\s*\)\s*(?:=>\s*)?\{/g;
  let m;
  let count = 0;
  while ((m = re.exec(src))) {
    const id = m[1];
    if (index.has(id)) continue; // webpack 模块 id 全局唯一，跨 chunk 重复的是同一模块
    const params = m[2].split(',').map((s) => s.trim()).filter(Boolean);
    const bodyStart = src.indexOf('{', m.index + m[0].length - 1);
    const end = matchBrace(src, bodyStart);
    if (end < 0) continue;
    const body = src.slice(bodyStart + 1, end);
    if (body.length < 40) continue;

    fs.mkdirSync(chunkDir, { recursive: true });
    const wrapped =
      `// webpack module ${id}  (from ${f})\n` +
      `module.exports = function (${params.join(', ')}) {\n${body}\n};\n`;
    fs.writeFileSync(path.join(chunkDir, `${id}.cjs`), wrapped);
    index.set(id, { chunk: f, params, size: body.length });
    count++;
  }
  total += count;
  if (count) console.log(`${f}: ${count}`);
}

fs.writeFileSync(
  path.join(outDir, '_index.json'),
  JSON.stringify(Object.fromEntries([...index].map(([k, v]) => [k, v])), null, 2)
);
console.log(`\n合计 ${index.size} 个唯一模块 → ${outDir}`);
