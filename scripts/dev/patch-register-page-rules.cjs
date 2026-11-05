// 注册页：去掉身份选择（固定学员）、密码规则改 8 位
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/user/Register.tsx');
let text = fs.readFileSync(file, 'utf8');

// 1. 密码规则文案与校验
text = text.replace(
  'extra="8–16 位，需同时包含大写字母、小写字母和数字"',
  'extra="至少 8 位，建议字母和数字组合"',
);
text = text.replace(
  "pattern: /^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{8,16}$/,",
  'pattern: /^.{8,32}$/,',
);
text = text.replace(
  "message: '密码需 8–16 位，且包含大写、小写字母和数字',",
  "message: '密码至少 8 位',",
);

// 2. 去掉身份选择（注册固定学员）
const roleBlock = `            {roles.length > 1 && (
              <Form.Item name="role" label="注册身份" extra="不同身份能看到的菜单不同">
                <Select
                  placeholder="默认由系统分配"
                  options={roles.map((r) => ({ value: r.id, label: r.name || r.code || r.id }))}
                />
              </Form.Item>
            )}
`;
text = text.replace(roleBlock, '');
text = text.replace(
  '        role: values.role,',
  '        // 注册固定为学员，老师/管理员只能由管理员在后台分配',
);

// 3. 清理不再使用的角色加载
text = text.replace(
  `  const [roles, setRoles] = useState<Role[]>([]);\n`,
  '',
);
text = text.replace(
  `  const roleIds = system?.registerInfo?.roles ?? [];\n`,
  '',
);
text = text.replace(
  `      get<{ list?: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 }).catch(() => undefined),\n`,
  '',
);
text = text.replace(
  `      .then(([sys, roleRes]) => {\n        setSystem(sys);\n        const all = roleRes?.list ?? [];\n        // 只允许选后端配置里允许注册的角色\n        setRoles(roleIds.length > 0 ? all.filter((r) => roleIds.includes(r.id)) : all);\n      })`,
  `      .then(([sys]) => {\n        setSystem(sys);\n      })`,
);

fs.writeFileSync(file, text);
console.log('注册页已调整');
