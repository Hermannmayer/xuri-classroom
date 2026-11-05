// 用户管理：表单加「用户组」下拉 + 顶部左侧按组筛选
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/system/User.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('name="deptId"')) {
  console.log('已加用户组字段');
  process.exit(0);
}

// 1. 类型加 deptId
text = text.replace('  deptName?: string;', '  deptId?: string;\n  deptName?: string;');

// 2. state：部门列表 + 选中部门
text = text.replace(
  '  const [roles, setRoles] = useState<Role[]>([]);',
  `  const [roles, setRoles] = useState<Role[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [deptFilter, setDeptFilter] = useState<string | undefined>(undefined);`,
);

// 3. 加载部门
text = text.replace(
  "    get<{ list: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 })",
  `    get<{ id: string; name: string }[]>('/api/system/dept/list')
      .then((list) => setDepts(Array.isArray(list) ? list : []))
      .catch(() => undefined);
    get<{ list: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 })`,
);

// 4. 查询带 deptId
text = text.replace(
  "      const res = await getWithPagination<SysUser>('/api/system/user/list', {\n        current: page,\n        pageSize,\n        name: keyword,\n      });",
  `      const res = await getWithPagination<SysUser>('/api/system/user/list', {
        current: page,
        pageSize,
        name: keyword,
        deptId: deptFilter,
      });`,
);

// 5. load 依赖
text = text.replace('  }, [page, pageSize, keyword]);', '  }, [page, pageSize, keyword, deptFilter]);');

// 6. 编辑回填 deptId
text = text.replace(
  '      name: row.name,',
  '      name: row.name,\n      deptId: row.deptId,',
);

// 7. 表单字段：放在「角色」之前
text = text.replace(
  '          <Form.Item name="roles" label="角色"',
  `          <Form.Item name="deptId" label="用户组 / 班级" extra="决定能看到哪些题库和考试">
            <Select
              allowClear
              placeholder="不选则不属于任何组"
              options={depts.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="roles" label="角色"`,
);

// 8. 表格加「用户组」列（在手机号之前）
text = text.replace(
  "            { title: '手机', dataIndex: 'phone', width: 140, render: (v) => v || '—' },",
  "            { title: '用户组', dataIndex: 'deptName', width: 140, render: (v) => v || '—' },\n            { title: '手机', dataIndex: 'phone', width: 140, render: (v) => v || '—' },",
);

fs.writeFileSync(file, text);
console.log('用户组字段与筛选已加');
