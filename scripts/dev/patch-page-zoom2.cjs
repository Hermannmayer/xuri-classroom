// 顶栏页面缩放：state + effect + Select（按行插入，锚点缩进不稳定）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/layout/BasicLayout.tsx');
let text = fs.readFileSync(file, 'utf8');

if (!text.includes('sk-zoom')) {
  // 1. import Select
  text = text.replace(
    "import { Avatar, Button, Dropdown, Layout, Menu, Spin } from 'antd';",
    "import { Avatar, Button, Dropdown, Layout, Menu, Select, Spin } from 'antd';",
  );

  // 2. state + effect
  text = text.replace(
    '  const { mode, toggle } = useThemeMode();',
    `  const { mode, toggle } = useThemeMode();
  // 页面缩放：整体放大，方便年长老师看清
  const [zoom, setZoom] = useState<number>(() => Number(localStorage.getItem('sk-zoom')) || 1);
  useEffect(() => {
    document.documentElement.style.zoom = String(zoom);
    localStorage.setItem('sk-zoom', String(zoom));
  }, [zoom]);`,
  );

  fs.writeFileSync(file, text);
  console.log('state/effect 已加');
}

// 3. 按行插入 Select（在主题切换按钮之前）
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
if (!lines.some((l) => l.includes('title="页面缩放"'))) {
  const ariaIdx = lines.findIndex((l) => l.includes("aria-label={mode === 'dark'"));
  if (ariaIdx >= 0) {
    let start = ariaIdx;
    while (start > 0 && !lines[start].includes('<Button')) start -= 1;
    const indent = (lines[start].match(/^\s*/) || [''])[0];
    const block = [
      `${indent}<Select`,
      `${indent}  size="small"`,
      `${indent}  value={zoom}`,
      `${indent}  onChange={setZoom}`,
      `${indent}  style={{ width: 84 }}`,
      `${indent}  title="页面缩放"`,
      `${indent}  options={[0.9, 1, 1.1, 1.25, 1.5, 1.75].map((v) => ({ value: v, label: \`\${Math.round(v * 100)}%\` }))}`,
      `${indent}/>`,
    ];
    lines.splice(start, 0, ...block);
    fs.writeFileSync(file, lines.join('\r\n'));
    console.log('缩放下拉已插入');
  } else {
    console.log('未找到主题按钮');
  }
} else {
  console.log('缩放下拉已存在');
}
