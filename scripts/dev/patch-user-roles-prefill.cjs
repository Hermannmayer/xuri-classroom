// 用户编辑回填 roles（之前漏了，导致保存后角色丢失）；新建默认密码 12345678
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/system/User.tsx');
let text = fs.readFileSync(file, 'utf8');

// 1. openEdit 回填 roles
if (!text.includes('roles: row.roles')) {
  text = text.replace(
    `    form.setFieldsValue({
      name: row.name,
      deptId: row.deptId,`,
    `    form.setFieldsValue({
      name: row.name,
      deptId: row.deptId,
      roles: (row.roles ?? []).map((r) => r.id),`,
  );
}

// 2. 新建用户默认密码
if (!text.includes("initialValue=\"12345678\"")) {
  text = text.replace(
    'placeholder={editing ? \'留空表示不修改\' : \'至少 6 位\'}',
    'placeholder={editing ? \'留空表示不修改\' : \'默认 12345678\'}',
  );
}

// 3. 账号字段提示改成「建议用手机号」
text = text.replace(
  'placeholder="登录账号"',
  'placeholder="登录账号（建议直接填手机号）"',
);

fs.writeFileSync(file, text);
console.log('已修 roles 回填与提示');
