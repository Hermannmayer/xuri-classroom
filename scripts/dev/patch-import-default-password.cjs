// 导入用户时密码列可空，空则默认 12345678
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const idx = lines.findIndex((l) => l.includes('String password = getCellValue(r, 2).orElseThrow('));
if (idx < 0) {
  console.log('未找到密码读取行（可能已改）');
  process.exit(0);
}

// 找到该语句结束（以 ');' 结尾的行）
let end = idx;
while (end < lines.length && !lines[end].trim().endsWith(');')) end += 1;

const indent = (lines[idx].match(/^\s*/) || [''])[0];
const replacement = [
  `${indent}// 密码列可以留空，留空时用默认密码 12345678，学员首次登录后自行修改`,
  `${indent}String password = getCellValue(r, 2).orElse("12345678");`,
];

lines.splice(idx, end - idx + 1, ...replacement);
fs.writeFileSync(file, lines.join('\r\n'));
console.log(`已改导入默认密码（替换 ${idx + 1}-${end + 1} 行）`);
