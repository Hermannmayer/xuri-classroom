// 合成 spec/api.md 的端点总表：后端为准，前端标注使用情况
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);

const backend = read('scripts/out-api-backend.txt').map((l) => {
  const [method, path, handler, ret, params, perm] = l.split(' | ').map((s) => (s || '').trim());
  return { method, path, handler, ret: (ret || '').replace(/^->/, ''), params, perm };
});

const frontend = new Map(); // path -> [{name, method, umiLine, pageLine}]
for (const l of read('scripts/out-api-methods.txt')) {
  const [name, method, path, umiLine, pageLine] = l.split(' | ').map((s) => (s || '').trim());
  if (!frontend.has(path)) frontend.set(path, []);
  frontend.get(path).push({ name, method, umiLine, pageLine });
}

// 前端还有一批只出现在字符串字面量里的路径（动态拼接、上传、预览）
const literalPaths = new Set();
for (const l of read('extract/api-paths.txt')) literalPaths.add(l.trim());
for (const l of read('scripts/out-api-literals.txt')) {
  const m = l.match(/\/api\/[A-Za-z0-9_\-/{}.:$]+/);
  if (m) literalPaths.add(m[0]);
}

const MODULE = {
  public: '公共 / 登录注册 / 初始化',
  currentUser: '公共 / 登录注册 / 初始化',
  userOverview: '公共 / 登录注册 / 初始化',
  system: '系统管理',
  project: '项目',
  survey: '问卷',
  answer: '答卷',
  repo: '题库',
  exercise: '练习',
  template: '模板',
  file: '文件',
  report: '报表',
  ai: 'AI',
  oauth: 'OAuth',
  workflow: '流程（预留模块）',
};

const modOf = (p) => {
  const seg = p.split('/').filter(Boolean); // ['api','public','login']
  if (seg.length === 2) return '顶层 / 杂项';
  const key = seg[1];
  if (key === 'public') return '公共 / 登录注册 / 初始化';
  if (key === 'currentUser' || key === 'userOverview' || key === 'user') return '公共 / 登录注册 / 初始化';
  return MODULE[key] || '顶层 / 杂项';
};

const groups = new Map();
for (const b of backend) {
  const m = modOf(b.path);
  if (!groups.has(m)) groups.set(m, []);
  groups.get(m).push(b);
}

const order = Object.values(MODULE);
const keys = [...groups.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b));

let md = '';
let covered = 0;
const unused = [];

for (const g of keys) {
  const rows = groups.get(g).sort((a, b) => a.path.localeCompare(b.path));
  md += `\n### ${g}（${rows.length}）\n\n`;
  md += '| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |\n|---|---|---|---|---|---|\n';
  for (const r of rows) {
    // 前端路径可能带 {id} 占位，与后端 @PathVariable 对齐
    const fe = frontend.get(r.path);
    const asLiteral = literalPaths.has(r.path);
    if (fe || asLiteral) covered++; else unused.push(`${r.method} ${r.path}`);
    let feCell;
    if (fe) {
      feCell = fe
        .map((f) => `\`${f.name}\`${f.pageLine ? ` (${f.pageLine.split('.')[0]})` : ''}`)
        .join('<br>');
    } else if (asLiteral) {
      feCell = '（仅字面量出现）';
    } else {
      feCell = '—';
    }
    md += `| ${r.method} | \`${r.path}\` | ${r.handler.replace(/#/g, '.')} | \`${r.ret || 'void'}\` | ${r.params ? r.params.replace(/, /g, '<br>') : '—'} | ${feCell} |\n`;
  }
}

fs.writeFileSync('extract/api-table.md', md);
fs.writeFileSync('extract/api-unused.txt', unused.join('\n'));
console.log(JSON.stringify({
  backendEndpoints: backend.length,
  frontendCalledDistinct: frontend.size,
  matched: covered,
  backendOnly: unused.length,
  groups: keys.map((k) => `${k}:${groups.get(k).length}`),
}, null, 2));
