// 首页项目表格：管理视角显示「编辑/数据」，学员视角显示「去答题」
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/home/tables.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('canManage')) {
  console.log('已支持 canManage');
  process.exit(0);
}

// 1. props 加 canManage
text = text.replace(
  `export function ProjectTable({
  rows,
  loading,
}: {
  rows: ProjectView[];
  loading: boolean;
}) {`,
  `export function ProjectTable({
  rows,
  loading,
  canManage = true,
}: {
  rows: ProjectView[];
  loading: boolean;
  /** 有 project:create 的是管理视角（编辑/数据），否则是学员视角（去答题） */
  canManage?: boolean;
}) {`,
);

// 2. 操作列分支
text = text.replace(
  `          render: (_: unknown, row) => (
            <div style={{ display: 'flex', gap: 12 }}>
              <a onClick={() => navigate(\`/survey/\${row.id}/edit\`)}>编辑</a>
              <a onClick={() => navigate(\`/survey/\${row.id}/data\`)}>数据</a>
            </div>
          ),`,
  `          render: (_: unknown, row) =>
            canManage ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <a onClick={() => navigate(\`/survey/\${row.id}/edit\`)}>编辑</a>
                <a onClick={() => navigate(\`/survey/\${row.id}/data\`)}>数据</a>
              </div>
            ) : (
              <a onClick={() => navigate(\`/s/\${row.id}\`)}>去答题</a>
            ),`,
);

fs.writeFileSync(file, text);
console.log('已支持 canManage');
