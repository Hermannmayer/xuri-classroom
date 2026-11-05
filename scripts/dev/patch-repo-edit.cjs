// 在「编辑题库」Modal 里补 category/tag/description 三个字段（一次性脚本）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/repo/List.tsx');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const modalIdx = lines.findIndex((l) => l.includes('title="编辑题库"'));
if (modalIdx < 0) {
  console.error('未找到编辑题库弹窗');
  process.exit(1);
}

let inputIdx = -1;
for (let i = modalIdx; i < lines.length; i++) {
  if (lines[i].includes('<Input maxLength={120} />')) {
    inputIdx = i;
    break;
  }
}

let closeIdx = -1;
for (let i = inputIdx; i < lines.length; i++) {
  if (lines[i].trim() === '</Form.Item>') {
    closeIdx = i;
    break;
  }
}

if (inputIdx < 0 || closeIdx < 0) {
  console.error('未找到名称输入框或闭合标签');
  process.exit(1);
}

const i = '          ';
const extra = [
  `${i}<Form.Item name="category" label="分类" extra="例如：保育员 / 养老护理员 / 育婴员">`,
  `${i}  <Input maxLength={60} placeholder="按专业或课程分类" />`,
  `${i}</Form.Item>`,
  `${i}<Form.Item name="tag" label="标签" extra="多个标签用英文逗号分隔">`,
  `${i}  <Input maxLength={200} placeholder="例如：三级,重点,2025" />`,
  `${i}</Form.Item>`,
  `${i}<Form.Item name="description" label="描述">`,
  `${i}  <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="选填" />`,
  `${i}</Form.Item>`,
];

lines.splice(closeIdx + 1, 0, ...extra);
fs.writeFileSync(file, lines.join('\r\n'));
console.log(`已在第 ${closeIdx + 1} 行后插入 3 个字段`);
