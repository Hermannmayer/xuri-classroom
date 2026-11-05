// 一次性取证脚本：在 pretty/*.js 里按关键词抓上下文，输出到 scripts/model-dsl-hits.txt
// 用法: node scripts/model-grep-dsl.js <keyword> [before] [after]
const fs = require('fs');
const path = require('path');

const prettyDir = path.join(__dirname, '..', 'pretty');
const out = path.join(__dirname, 'model-dsl-hits.txt');

const keyword = process.argv[2];
const before = Number(process.argv[3] || 300);
const after = Number(process.argv[4] || 700);
if (!keyword) {
  console.error('usage: node model-grep-dsl.js <keyword> [before] [after]');
  process.exit(1);
}

let buf = [];
for (const name of fs.readdirSync(prettyDir).sort()) {
  if (!name.endsWith('.js')) continue;
  const text = fs.readFileSync(path.join(prettyDir, name), 'utf8');
  let idx = 0;
  let n = 0;
  while ((idx = text.indexOf(keyword, idx)) !== -1) {
    n++;
    const s = Math.max(0, idx - before);
    buf.push(`\n===== ${name} #${n} @${idx} =====\n` + text.slice(s, idx + after));
    idx += keyword.length;
    if (n > 40) break;
  }
}
fs.writeFileSync(out, buf.join('\n'), 'utf8');
console.log('hits written:', out, 'blocks:', buf.length);
