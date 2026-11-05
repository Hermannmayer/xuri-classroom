// 1) 去掉多余的 registerRoles（真正字段是 roles）；2) 保存带 deptId；3) 加默认部门下拉
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/system/Setting.tsx');
let text = fs.readFileSync(file, 'utf8');

// 去掉 registerRoles 相关（避免和 roles 重复）
text = text.replace("        registerRoles: sys?.registerInfo?.roles,\n", '');
text = text.replace("  access: ['captchaEnabled', 'registerEnabled', 'registerRoles', 'registerDeptId'],", "  access: ['captchaEnabled', 'registerEnabled', 'roles', 'registerDeptId'],");

// 保存带 deptId
text = text.replace(
  'registerInfo: { registerEnabled: Boolean(v.registerEnabled), roles },',
  'registerInfo: { registerEnabled: Boolean(v.registerEnabled), roles, deptId: v.registerDeptId },',
);

// 部门下拉：插在注册角色 Form.Item 之后
const anchor = text.includes('name="roles"') ? 'name="roles"' : null;
if (!anchor) {
  console.error('未找到 roles 字段');
  process.exit(1);
}

const lines = text.split(/\r?\n/);
const roleIdx = lines.findIndex((l) => l.includes('name="roles"'));
// 找到该 Form.Item 结束
let end = roleIdx;
while (end < lines.length && !lines[end].includes('</Form.Item>')) end += 1;

const indent = (lines[roleIdx].match(/^\s*/) || [''])[0];
const extra = [
  `${indent}<Form.Item name="registerDeptId" label="新用户默认部门" extra="注册用户会自动进入这个部门；不选则进根部门">`,
  `${indent}  <Select`,
  `${indent}    allowClear`,
  `${indent}    placeholder="默认根部门"`,
  `${indent}    options={depts.map((d) => ({ value: d.id, label: d.name }))}`,
  `${indent}  />`,
  `${indent}</Form.Item>`,
];

lines.splice(end + 1, 0, ...extra);
fs.writeFileSync(file, lines.join('\r\n'));
console.log('已加默认部门下拉');
