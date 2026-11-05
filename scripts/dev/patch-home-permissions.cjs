// 1) can() 不再按域前缀放行（学员的 repo:list 不能放行 repo:create）
// 2) 首页快速开始与项目操作按权限渲染
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

// ---- 1. permissions.ts ----
{
  const file = path.join(root, 'client/src/auth/permissions.ts');
  let text = fs.readFileSync(file, 'utf8');
  const oldFn = `export function can(authorities: string[], permission: string): boolean {
  if (isAdmin(authorities)) return true;
  const domain = \`\${permission.split(':')[0]}:\`;
  return authorities.some((a) => a === permission || a.startsWith(domain));
}`;
  const newFn = `export function can(authorities: string[], permission: string): boolean {
  if (isAdmin(authorities)) return true;
  // 只认精确权限或该域的显式通配符（repo:*）；不能用前缀匹配，
  // 否则学员的 repo:list 会误放行 repo:create / repo:delete
  const domain = permission.split(':')[0];
  return authorities.includes(permission) || authorities.includes(\`\${domain}:*\`);
}`;
  if (text.includes(oldFn)) {
    text = text.replace(oldFn, newFn);
    fs.writeFileSync(file, text);
    console.log('can() 已改为精确匹配 + 域通配符');
  } else {
    console.log('can() 未匹配（格式可能已变）');
  }
}

});