// 首页：无 project:create 的用户不显示「快速开始」；项目列表操作按权限区分
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

// ---- Home.tsx 快速开始 ----
{
  const file = path.join(root, 'client/src/pages/Home.tsx');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  if (!lines.some((l) => l.includes('canCreate'))) {
    // 1. import can
    const importIdx = lines.findIndex((l) => l.includes("from '../auth/permissions'"));
    if (importIdx < 0) {
      const anchor = lines.findIndex((l) => l.includes("from '../api'"));
      lines.splice(anchor + 1, 0, "import { can } from '../auth/permissions';");
    }

    // 2. 组件内计算 canCreate
    const fnIdx = lines.findIndex((l) => l.startsWith('export default function Home'));
    lines.splice(fnIdx + 1, 0, "  const canCreate = can(user?.authorityList ?? [], 'project:create');");
  }

  // 3. 包住 Quick Start 的 <Col xs={24} xl={8}>
  const colIdx = lines.findIndex((l) => l.includes('<Col xs={24} xl={8}>') && lines.slice(0, l.length).length > 0);
  const quickIdx = lines.findIndex((l) => l.includes('QUICK START'));
  if (quickIdx > 0) {
    // 向上找 <Col
    let start = quickIdx;
    while (start > 0 && !lines[start].includes('<Col')) start -= 1;
    // 向下找 </Col>
    let end = quickIdx;
    while (end < lines.length && !lines[end].includes('</Col>')) end += 1;
    if (start < end) {
      lines[start] = lines[start].replace('<Col', '{canCreate && (<Col');
      lines[end] = lines[end].replace('</Col>', '</Col>)}');
    }
  }

  fs.writeFileSync(file, lines.join('\r\n'));
  console.log('快速开始已按权限包裹');
}
