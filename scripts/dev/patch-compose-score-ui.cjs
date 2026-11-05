// 在组卷弹窗底部「总分」旁加一个目标总分输入，回车后按比例分配
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/project/ComposeModal.tsx');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const idx = lines.findIndex((l) => l.includes('{totals.score}</b>'));
if (idx < 0) {
  console.error('未找到总分渲染');
  process.exit(1);
}

// idx 这一行是「总分 <b ...>{totals.score}</b>」，下一行应是 </span>
let closeIdx = idx + 1;
while (closeIdx < lines.length && !lines[closeIdx].includes('</span>')) closeIdx += 1;

const indent = '          ';
const extra = [
  `${indent}<InputNumber`,
  `${indent}  size="small"`,
  `${indent}  min={1}`,
  `${indent}  placeholder="目标总分"`,
  `${indent}  style={{ width: 110 }}`,
  `${indent}  onPressEnter={(e) => applyTotalScore(Number((e.target as HTMLInputElement).value))}`,
  `${indent}/>`,
];

lines.splice(closeIdx + 1, 0, ...extra);
fs.writeFileSync(file, lines.join('\r\n'));
console.log(`已在第 ${closeIdx + 1} 行后插入目标总分输入`);
