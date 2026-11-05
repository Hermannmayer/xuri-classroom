// 从美化后的 umi.js 里按缩进还原路由树
import fs from 'node:fs';

const file = process.argv[2] || 'pretty/umi.ded23be0.js';
const out = process.argv[3] || 'extract/routes.md';
const lines = fs.readFileSync(file, 'utf8').split('\n');

// 定位包含 /survey/:id/edit 的 routes 数组起点
const anchor = lines.findIndex((l) => l.includes('path: "/survey/:id/edit"'));
if (anchor < 0) throw new Error('未找到路由配置锚点');
let start = anchor;
while (start > 0 && !/routes:\s*\[/.test(lines[start])) start--;

const stack = []; // {indent, node}
const roots = [];
let depth = 0;

for (let i = start; i < lines.length; i++) {
  const line = lines[i];
  const indent = line.match(/^\s*/)[0].length;
  const t = line.trim();

  if (t === ']' && indent <= stack.at(-1)?.indent) { stack.pop(); if (!stack.length) break; }
  if (/^\},\s*$/.test(t) && stack.length && indent < stack.at(-1).indent) { stack.pop(); }

  const pathM = t.match(/^path:\s*"([^"]+)"/);
  const nameM = t.match(/^name:\s*"([^"]+)"/);
  const iconM = t.match(/^icon:\s*"([^"]+)"/);
  const layoutM = t.match(/^layout:\s*(!?\w+)/);

  if (pathM || nameM || iconM || layoutM) {
    // 同一对象内的属性归并到最近的 path 节点
    let node = stack.at(-1);
    if (pathM) {
      node = { path: pathM[1], indent, children: [] };
      const parent = [...stack].reverse().find((n) => n.indent < indent);
      if (parent) parent.children.push(node);
      else roots.push(node);
      stack.push(node);
    } else if (node) {
      if (nameM) node.name = nameM[1];
      if (iconM) node.icon = iconM[1];
      if (layoutM) node.layout = layoutM[1];
    }
  }
}

const render = (nodes, d = 0) =>
  nodes.flatMap((n) => [
    `${'  '.repeat(d)}- \`${n.path}\`${n.name ? `  name=\`${n.name}\`` : ''}${n.icon ? `  icon=\`${n.icon}\`` : ''}${n.layout ? `  layout=${n.layout}` : ''}`,
    ...render(n.children || [], d + 1),
  ]);
// 去重：同名同路径只留一次
const seen = new Set();
const unique = (nodes) => nodes.filter((n) => {
  const k = n.path;
  if (seen.has(k)) return false;
  seen.add(k); return true;
}).map((n) => ({ ...n, children: unique(n.children || []) }));
const md = ['# 路由树（从构建产物还原）', '', ...render(unique(roots))].join('\n');
fs.writeFileSync(out, md);
console.log(md.split('\n').length + ' 行 -> ' + out);
