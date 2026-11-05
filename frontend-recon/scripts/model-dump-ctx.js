// 一次性取证：在 pretty/ 里抓关键词周边窗口，按 160 字符折行输出（minified 单行文件也能读）
// 用法: node model-dump-ctx.js <file> <keyword|@offset> [before] [after] [maxHits]
const fs = require('fs');
const path = require('path');

const [, , file, needle, beforeArg, afterArg, maxArg] = process.argv;
if (!file || !needle) {
  console.error('usage: node model-dump-ctx.js <file> <keyword|@offset> [before] [after] [maxHits]');
  process.exit(1);
}
const before = Number(beforeArg || 800);
const after = Number(afterArg || 2000);
const maxHits = Number(maxArg || 3);
const text = fs.readFileSync(path.join(__dirname, '..', 'pretty', file), 'utf8');

const wrap = (s) => s.replace(/(.{160})/g, '$1\n');

if (needle.startsWith('@')) {
  const idx = Number(needle.slice(1));
  process.stdout.write(wrap(text.slice(Math.max(0, idx - before), idx + after)));
} else {
  let idx = 0;
  let hit = 0;
  while ((idx = text.indexOf(needle, idx)) !== -1 && hit < maxHits) {
    hit++;
    process.stdout.write(`\n===== hit #${hit} @${idx} =====\n`);
    process.stdout.write(wrap(text.slice(Math.max(0, idx - before), idx + after)));
    idx += needle.length;
  }
  if (!hit) {
    console.error('not found:', needle);
    process.exit(2);
  }
}
