// 侧栏 logo 与系统名改为读后端配置（system.avatar / system.name），不再写死 "XR"
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/layout/BasicLayout.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('bp-logo-img')) {
  console.log('已接入，跳过');
  process.exit(0);
}

const oldBlock = `            <span
              style={{
                width: 18,
                height: 18,
                border: '1px solid var(--bp-text)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                flex: '0 0 auto',
              }}
            >
              XR
            </span>`;

const newBlock = `            {system?.avatar ? (
              <img
                src={system.avatar}
                alt=""
                className="bp-logo-img"
                style={{ width: 20, height: 20, objectFit: 'contain', flex: '0 0 auto' }}
              />
            ) : (
              <span
                style={{
                  width: 18,
                  height: 18,
                  border: '1px solid var(--bp-text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  flex: '0 0 auto',
                }}
              >
                {(system?.name || '云课堂').slice(0, 1)}
              </span>
            )}`;

if (!text.includes(oldBlock)) {
  console.error('未找到 logo 块');
  process.exit(1);
}

text = text.replace(oldBlock, newBlock);
text = text.replace(/\{system\?\.name \|\| '旭日云课堂'\}/g, "{system?.name || '考试与学习平台'}");

// 动态 favicon
if (!text.includes('useFavicon')) {
  text = text.replace(
    'export default function BasicLayout() {',
    `/** 把系统 avatar 同步成浏览器 favicon，机构换 logo 后标签页也跟着换 */\r
function useFavicon(href?: string) {\r
  useEffect(() => {\r
    if (!href) return;\r
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");\r
    if (!link) {\r
      link = document.createElement('link');\r
      link.rel = 'icon';\r
      document.head.appendChild(link);\r
    }\r
    link.href = href;\r
  }, [href]);\r
}\r
\r
export default function BasicLayout() {`,
  );
}

fs.writeFileSync(file, text);
console.log('侧栏 logo 已改为读配置');
