// 前端品牌改为读后端配置：侧栏 logo / 登录页品牌 / favicon
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

// 1. 侧栏 logo：XR → system.avatar 或系统名首字
{
  const file = path.join(root, 'client/src/layout/BasicLayout.tsx');
  let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const idx = lines.findIndex((l) => l.trim() === 'XR');
  if (idx >= 0) {
    const indent = (lines[idx].match(/^\s*/) || [''])[0];
    lines.splice(idx, 1, `${indent}{(system?.name || '云课堂').slice(0, 1)}`);
    fs.writeFileSync(file, lines.join('\r\n'));
    console.log('侧栏 logo 改为系统名首字');
  } else {
    console.log('侧栏 logo 已是动态（或未找到 XR）');
  }
}

// 2. 登录页品牌：XURI CLASS / DWG NO. XR-0013 改为系统名与中性副标题
{
  const file = path.join(root, 'client/src/pages/user/Login.tsx');
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  text = text.replace('<span>XURI CLASS</span>', '<span>{system?.name || \'考试与学习平台\'}</span>');
  text = text.replace('<span>DWG NO. XR-0013</span>', "<span>{(system?.description || 'EXAM & PRACTICE').toUpperCase()}</span>");
  text = text.replace(/\{system\?\.name \|\| t\('pages\.login\.defaultSystemName', '考试系统'\)\}/g, "{system?.name || '考试与学习平台'}");
  if (text !== before) {
    fs.writeFileSync(file, text);
    console.log('登录页品牌改为读配置');
  } else {
    console.log('登录页无可替换内容（可能已改）');
  }
}

// 3. favicon：在 main.tsx 里按系统 avatar 动态设置
{
  const file = path.join(root, 'client/src/main.tsx');
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('data-brand-favicon')) {
    text = text.replace(
      'createRoot(',
      `// 用系统配置的 logo 当 favicon（机构换 logo 后标签页跟着换）\n// data-brand-favicon: 标记已接入\nfetch('/api/system')\n  .then((res) => res.json())\n  .then((body) => {\n    const avatar = body?.data?.avatar;\n    if (!avatar) return;\n    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");\n    if (!link) {\n      link = document.createElement('link');\n      link.rel = 'icon';\n      document.head.appendChild(link);\n    }\n    link.href = avatar;\n  })\n  .catch(() => undefined);\n\ncreateRoot(`,
    );
    fs.writeFileSync(file, text);
    console.log('main.tsx 已加 favicon 同步');
  } else {
    console.log('favicon 已接入');
  }
}
