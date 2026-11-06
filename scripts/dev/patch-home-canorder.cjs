// 把 canCreate 移到 useOutletContext 之后（user 才有定义）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/Home.tsx');
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const canLine = "  const canCreate = can(user?.authorityList ?? [], 'project:create');";
const canIdx = lines.findIndex((l) => l.includes('const canCreate = can('));
if (canIdx >= 0) lines.splice(canIdx, 1);

const userIdx = lines.findIndex((l) => l.includes('useOutletContext'));
if (userIdx < 0) {
  console.error('未找到 useOutletContext');
  process.exit(1);
}

lines.splice(userIdx + 1, 0, canLine);
fs.writeFileSync(file, lines.join('\r\n'));
console.log('canCreate 已移到 user 之后');
