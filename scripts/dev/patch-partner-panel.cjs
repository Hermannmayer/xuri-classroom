// 把设置页「协作管理员」占位替换成真实面板
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/survey/Setting.tsx');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const hintIdx = lines.findIndex((l) => l.includes('协作管理员功能稍后开放'));
if (hintIdx < 0) {
  console.log('未找到占位文案，可能已替换');
  process.exit(0);
}

// 向上找 <div
let start = hintIdx;
while (start > 0 && !lines[start].includes('<div')) start -= 1;
// 向下找 </div>
let end = hintIdx;
while (end < lines.length && !lines[end].includes('</div>')) end += 1;

const indent = (lines[start].match(/^\s*/) || [''])[0];
lines.splice(start, end - start + 1, `${indent}<PartnerPanel projectId={id} />`);

fs.writeFileSync(file, lines.join('\r\n'));
console.log(`已替换占位（${start + 1}-${end + 1} 行）`);
