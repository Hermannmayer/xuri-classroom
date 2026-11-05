// 品牌页加 favicon 输入（后端 SystemSetting.favicon 已加）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/system/Setting.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('name="favicon"')) {
  console.log('favicon 已接入');
  process.exit(0);
}

// 1. TAB_FIELDS
text = text.replace(
  "basic: ['name', 'description', 'avatar', 'copyright', 'recordNum'],",
  "basic: ['name', 'description', 'avatar', 'copyright', 'recordNum', 'favicon'],",
);

// 2. 加载
text = text.replace(
  'recordNum: sys?.setting?.recordNum,',
  'recordNum: sys?.setting?.recordNum,\n          favicon: sys?.setting?.favicon,',
);

// 3. 保存
text = text.replace(
  'setting: { copyright: v.copyright, recordNum: v.recordNum },',
  'setting: { copyright: v.copyright, recordNum: v.recordNum, favicon: v.favicon },',
);

// 4. 表单字段（在备案号 Form.Item 之后）
const anchor = `                    <Form.Item name="recordNum" label="备案号">
                      <Input placeholder="例如 京ICP备00000000号" allowClear />
                    </Form.Item>`;

const extra = `${anchor}
                    <Form.Item name="favicon" label="Favicon" extra="浏览器标签页图标 URL，留空则用 Logo">
                      <Input placeholder="https://…/favicon.ico" allowClear />
                    </Form.Item>`;

if (!text.includes(anchor)) {
  console.error('未找到备案号字段');
  process.exit(1);
}
text = text.replace(anchor, extra);

fs.writeFileSync(file, text);
console.log('已加 favicon 字段');
