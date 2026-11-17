/**
 * 「AI 与智能体」引导页的路径与菜单文案（task-16）。
 *
 * 单独放一个零依赖模块：路由（client/src/router.tsx）与左侧 AI 侧栏 / 布局菜单
 * 都从这里取，避免两处各写一份字符串——改路径时漏掉一边就会变成「菜单能点、页面 404」。
 */
export const AI_GUIDE_PATH = '/ai';
export const AI_GUIDE_LABEL = 'AI 助手';

/** 页面内的章节锚点：目录与各节标题共用，避免手写两遍 id 写岔 */
export const AI_GUIDE_SECTIONS = [
  { id: 'capabilities', label: 'AI 能做什么' },
  { id: 'get-started', label: '三步开通' },
  { id: 'faq', label: '常见问题' },
  { id: 'mcp', label: 'MCP 接入' },
  { id: 'mcp-tools', label: '工具清单' },
  { id: 'mcp-verify', label: '验证与安全' },
] as const;
