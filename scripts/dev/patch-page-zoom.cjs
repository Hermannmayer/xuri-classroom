// 顶栏加页面缩放（老师年纪大，字看不清）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/layout/BasicLayout.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('sk-zoom')) {
  console.log('缩放已接入');
  process.exit(0);
}

// 1. antd import 加 Select
text = text.replace(
  "import { Avatar, Button, Dropdown, Layout, Menu, Spin } from 'antd';",
  "import { Avatar, Button, Dropdown, Layout, Menu, Select, Spin } from 'antd';",
);

// 2. state + effect（放在 useThemeMode 之后）
text = text.replace(
  'const { mode, toggle } = useThemeMode();',
  `const { mode, toggle } = useThemeMode();
  // 页面缩放：用 CSS zoom 整体放大，老师看不清时调到 125% / 150%
  const [zoom, setZoom] = useState<number>(() => Number(localStorage.getItem('sk-zoom')) || 1);
  useEffect(() => {
    document.documentElement.style.zoom = String(zoom);
    localStorage.setItem('sk-zoom', String(zoom));
  }, [zoom]);`,
);

// 3. 在主题切换按钮前插入缩放下拉
const anchor = `            <Button
              type="text"
              size="small"
              aria-label={mode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}`;

const extra = `            <Select
              size="small"
              value={zoom}
              onChange={setZoom}
              style={{ width: 84 }}
              title="页面缩放"
              options={[0.9, 1, 1.1, 1.25, 1.5, 1.75].map((v) => ({
                value: v,
                label: \`\${Math.round(v * 100)}%\`,
              }))}
            />
${anchor}`;

if (!text.includes(anchor)) {
  console.error('未找到主题按钮锚点');
  process.exit(1);
}

text = text.replace(anchor, extra);
fs.writeFileSync(file, text);
console.log('已加页面缩放');
