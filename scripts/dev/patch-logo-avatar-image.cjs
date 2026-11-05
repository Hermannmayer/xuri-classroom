// 侧栏 logo 与右上角头像支持图片
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/layout/BasicLayout.tsx');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// 1. 侧栏 logo：把「首字 span」换成「有 avatar 用图片，否则首字」
const logoIdx = lines.findIndex((l) => l.includes("(system?.name || '云课堂').slice(0, 1)"));
if (logoIdx < 0) {
  console.log('未找到 logo 首字');
} else {
  // 向上找到 <span 开始，向下找到 </span>
  let start = logoIdx;
  while (start > 0 && !lines[start].includes('<span')) start -= 1;
  let end = logoIdx;
  while (end < lines.length && !lines[end].includes('</span>')) end += 1;

  const indent = (lines[start].match(/^\s*/) || [''])[0];
  const replacement = [
    `${indent}{system?.avatar ? (`,
    `${indent}  <img`,
    `${indent}    src={system.avatar}`,
    `${indent}    alt=""`,
    `${indent}    style={{ width: 20, height: 20, objectFit: 'contain', flex: '0 0 auto' }}`,
    `${indent}  />`,
    `${indent}) : (`,
    `${indent}  <span`,
    `${indent}    style={{`,
    `${indent}      width: 18,`,
    `${indent}      height: 18,`,
    `${indent}      border: '1px solid var(--bp-text)',`,
    `${indent}      display: 'inline-flex',`,
    `${indent}      alignItems: 'center',`,
    `${indent}      justifyContent: 'center',`,
    `${indent}      fontSize: 9,`,
    `${indent}      flex: '0 0 auto',`,
    `${indent}    }}`,
    `${indent}  >`,
    `${indent}    {(system?.name || '云课堂').slice(0, 1)}`,
    `${indent}  </span>`,
    `${indent})}`,
  ];
  lines.splice(start, end - start + 1, ...replacement);
  console.log(`侧栏 logo 已支持图片（替换 ${start + 1}-${end + 1} 行）`);
}

// 2. 右上角头像：Avatar 支持 src
const avatarIdx = lines.findIndex((l) => l.includes("(user?.name || user?.userId || '?').slice(0, 1)"));
if (avatarIdx >= 0) {
  let start = avatarIdx;
  while (start > 0 && !lines[start].includes('<Avatar')) start -= 1;
  let end = avatarIdx;
  while (end < lines.length && !lines[end].includes('</Avatar>')) end += 1;

  const indent = (lines[start].match(/^\s*/) || [''])[0];
  lines.splice(
    start,
    end - start + 1,
    `${indent}<Avatar style={{ background: 'var(--bp-blue-weak)', border: '1px solid var(--bp-line)' }} src={user?.avatar || undefined}>`,
    `${indent}  {(user?.name || user?.userId || '?').slice(0, 1).toUpperCase()}`,
    `${indent}</Avatar>`,
  );
  console.log('右上角头像已支持图片');
}

fs.writeFileSync(file, lines.join('\r\n'));
