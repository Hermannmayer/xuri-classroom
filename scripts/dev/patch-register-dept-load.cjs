// 修类型与 depts 加载
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

// 1. 类型
{
  const file = path.join(root, 'client/src/api/types.ts');
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('deptId?: string')) {
    text = text.replace(
      '  registerInfo?: {',
      '  registerInfo?: {\n    deptId?: string;',
    );
    fs.writeFileSync(file, text);
    console.log('RegisterInfo 类型已加 deptId');
  }
}

// 2. Setting.tsx 加载部门
{
  const file = path.join(root, 'client/src/pages/system/Setting.tsx');
  let text = fs.readFileSync(file, 'utf8');

  if (!text.includes('const [depts, setDepts]')) {
    text = text.replace(
      "  const [roles, setRoles] = useState<Role[]>([]);",
      "  const [roles, setRoles] = useState<Role[]>([]);\n  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);",
    );
  }

  // 在 load 里顺便拉部门
  if (!text.includes("/api/system/dept/list")) {
    text = text.replace(
      "      get<{ list?: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 }).catch(",
      "      get<{ id: string; name: string }[]>('/api/system/dept/list').catch((): { id: string; name: string }[] => []),\n      get<{ list?: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 }).catch(",
    );
    text = text.replace(
      'const [sys, ai, roleRes] = await Promise.all([',
      'const [sys, ai, deptRes, roleRes] = await Promise.all([',
    );
    text = text.replace(
      'setRoles(roleRes?.list ?? []);',
      'setRoles(roleRes?.list ?? []);\n      setDepts(Array.isArray(deptRes) ? deptRes : []);',
    );
  }

  fs.writeFileSync(file, text);
  console.log('部门加载已加');
}
