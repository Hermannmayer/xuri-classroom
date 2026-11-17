/**
 * AI 说明里用到的入口地址（2026-11 导航收敛后）。
 *
 * 说明不再是一个独立页面：原来 /ai 的「AI 与智能体」导览已并进「系统设置 → AI」页签底部
 * （见 ./AiGuide.tsx 的 AiCapabilityGuide），/ai 只保留一条重定向（client/src/router.tsx）。
 * 这里集中放能力卡片底部的「去…」地址：路径写错的表现是「点了跳到 404 或别的页」，
 * 而这类链接分散在每张卡片里最容易漏改，所以统一收在这里。
 */
export const AI_ENTRY_PATHS = {
  /** 老师 / 管理员：「教学」页的考试 Tab（Tab 键与 TeachingHome 的 ?tab= 一致） */
  projectList: '/teaching?tab=exam',
  /** 只有 project:list 的协作者与学员视角没有「教学」菜单，退回试卷列表 */
  projectListShared: '/project',
  /** 题库中心 → 题库列表：题库体检从这里点进具体题库 */
  repoList: '/repo/index',
  /** 系统管理 → 公告管理：「写通知」的落点 */
  noticeAdmin: '/system/notice',
} as const;
