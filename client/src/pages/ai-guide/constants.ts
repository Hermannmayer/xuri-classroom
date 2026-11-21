/**
 * AI 说明里用到的入口地址（2026-11 导航收敛后）。
 *
 * 说明不再是一个独立页面：原来 /ai 的「AI 与智能体」导览已并进「系统设置 → AI」页签底部
 * （见 ./AiGuide.tsx 的 AiCapabilityGuide），/ai 只保留一条重定向（client/src/router.tsx）。
 * 这里集中放能力卡片底部的「去…」地址：路径写错的表现是「点了跳到 404 或别的页」，

 */
export const AI_ENTRY_PATHS = {

  projectList: '/teaching?tab=exam',

  projectListShared: '/project',

  repoList: '/repo/index',

  noticeAdmin: '/system/notice',
} as const;
