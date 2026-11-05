// 系统设置「登录与验证码」加：新用户注册默认部门
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/system/Setting.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('registerDeptId')) {
  console.log('已加过默认部门');
  process.exit(0);
}

// 1. TAB_FIELDS
text = text.replace(
  "access: ['captchaEnabled', 'registerEnabled'],",
  "access: ['captchaEnabled', 'registerEnabled', 'registerRoles', 'registerDeptId'],",
);

// 2. 加载
text = text.replace(
  'registerEnabled: Boolean(sys?.registerInfo?.registerEnabled),',
  `registerEnabled: Boolean(sys?.registerInfo?.registerEnabled),
        registerRoles: sys?.registerInfo?.roles,
        registerDeptId: sys?.registerInfo?.deptId,`,
);

// 3. 保存
text = text.replace(
  'registerInfo: { registerEnabled: Boolean(v.registerEnabled) },',
  'registerInfo: { registerEnabled: Boolean(v.registerEnabled), roles: v.registerRoles, deptId: v.registerDeptId },',
);

fs.writeFileSync(file, text);
console.log('已加默认部门与角色字段读写');
