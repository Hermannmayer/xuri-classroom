// 用户管理：status=0 显示为「待审核」（注册用户默认是 0）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/system/User.tsx');
let text = fs.readFileSync(file, 'utf8');

const pairs = [
  ["{row.status === 0 ? '停用' : '正常'}", "{row.status === 0 ? '待审核' : '正常'}"],
  ["<Tag color={row.status === 0 ? 'default' : 'success'}>", "<Tag color={row.status === 0 ? 'warning' : 'success'}>"],
  [
    "render: (v?: number) => (v === 0 ? <Tag>停用</Tag> : <Tag color=\"success\">正常</Tag>),",
    "render: (v?: number) => (v === 0 ? <Tag color=\"warning\">待审核</Tag> : <Tag color=\"success\">正常</Tag>),",
  ],
];

let changed = 0;
for (const [from, to] of pairs) {
  if (text.includes(from)) {
    text = text.split(from).join(to);
    changed += 1;
  }
}

if (changed === 0) {
  console.log('未找到状态渲染');
  process.exit(0);
}

fs.writeFileSync(file, text);
console.log(`已改 ${changed} 处状态文案`);
