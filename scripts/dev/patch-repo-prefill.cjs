// 让「编辑题库」弹窗回填 category/tag/description
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/repo/List.tsx');
let text = fs.readFileSync(file, 'utf8');

const anchor = "renameForm.setFieldsValue({ name: row.name || '' });";
const replacement = [
  'renameForm.setFieldsValue({',
  "  name: row.name || '',",
  '  category: row.category,',
  "  tag: (row.tag || []).join(','),",
  '  description: row.description,',
  '});',
].join('\r\n    ');

if (!text.includes(anchor)) {
  console.error('未找到回填锚点');
  process.exit(1);
}

text = text.replace(anchor, replacement);
fs.writeFileSync(file, text);
console.log('已补全回填字段');
