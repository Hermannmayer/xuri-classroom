// 部门接口返回扁平列表，前端按 parentId 组装成树，Table 才能折叠
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/system/Group.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('function buildTree')) {
  console.log('已组树');
  process.exit(0);
}

// 1. 插入 buildTree
text = text.replace(
  'function flattenDepts(',
  `/** 后端 /api/system/dept/list 返回扁平列表，这里按 parentId 组装成树 */\nfunction buildTree(list: Dept[]): Dept[] {\n  const map = new Map<string, Dept & { children: Dept[] }>();\n  list.forEach((d) => map.set(d.id, { ...d, children: [] }));\n  const roots: Dept[] = [];\n  map.forEach((node) => {\n    const parent = node.parentId ? map.get(node.parentId) : undefined;\n    if (parent && parent.id !== node.id) {\n      parent.children.push(node);\n    } else {\n      roots.push(node);\n    }\n  });\n  return roots;\n}\n\nfunction flattenDepts(`,
);

// 2. load 里组树
text = text.replace(
  '      setTree(await get<Dept[]>(\'/api/system/dept/list\'));',
  '      const list = await get<Dept[]>(\'/api/system/dept/list\');\n      setTree(buildTree(Array.isArray(list) ? list : []));',
);

fs.writeFileSync(file, text);
console.log('已组树');
