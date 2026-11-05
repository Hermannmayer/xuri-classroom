// 一次性取证：从 H2 数据文件里刮出 JSON 片段（含问卷 DSL），验证真实存储的字段名
// 用法: node model-strings-h2.js <db.mv.db> <keyword> [context]
const fs = require('fs');

const [, , dbPath, keyword, ctxArg] = process.argv;
if (!dbPath || !keyword) {
  console.error('usage: node model-strings-h2.js <db.mv.db> <keyword> [context]');
  process.exit(1);
}
const ctx = Number(ctxArg || 120);
const buf = fs.readFileSync(dbPath);
const text = buf.toString('latin1');

const hits = [];
let idx = 0;
while ((idx = text.indexOf(keyword, idx)) !== -1) {
  hits.push(idx);
  idx += keyword.length;
  if (hits.length >= 200) break;
}
console.log(`file=${dbPath} bytes=${buf.length} keyword=${keyword} hits=${hits.length}`);
for (const h of hits.slice(0, 20)) {
  console.log('--- @' + h + ' ---');
  console.log(text.slice(Math.max(0, h - ctx), h + ctx).replace(/[^\x20-\x7e]/g, '.'));
}
