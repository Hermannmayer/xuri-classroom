// 用户组页「上级分组」改成下拉选择
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/system/Group.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('name="parentId" label="上级分组" extra="留空表示顶层">\n            <Input')) {
  // 已是输入框，改成 Select
  text = text.replace(
    '<Form.Item name="parentId" label="上级分组" extra="留空表示顶层">\n            <Input placeholder="上级分组 id（从列表点「加子组」会自动带上）" />\n          </Form.Item>',
    `<Form.Item name="parentId" label="上级分组" extra="留空表示顶层">
            <Select
              allowClear
              placeholder="顶层（不选）"
              options={flatDepts(tree)
                .filter((d) => d.id !== editing?.id)
                .map((d) => ({ value: d.id, label: `${'　'.repeat(d.depth)}${d.name}` }))}
            />
          </Form.Item>`,
  );
  fs.writeFileSync(file, text);
  console.log('上级分组已改为下拉');
} else {
  console.log('未匹配到输入框（可能已改）');
}
