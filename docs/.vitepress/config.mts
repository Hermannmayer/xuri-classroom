import { defineConfig } from 'vitepress'

const base = process.env.DOCS_BASE || '/'
const repo = 'https://github.com/Hermannmayer/xuri-classroom'

export default defineConfig({
  lang: 'zh-CN',
  title: '旭日云课堂 · 开发文档',
  description: '考试与学习平台的代码地图、模块索引、修改指南与决策记录',
  base,
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: [
    'README.md',
    'ops/**',
    'archive/**',
    'ai/**',
    'permissions.md',
    'permissions-ia.md',
    'scope.md',
    'development.md',
    'ui-style.md',
    'architecture/refactor-catalog.md',
  ],
  head: [['meta', { name: 'theme-color', content: '#1e3a5f' }]],
  markdown: { lineNumbers: true },
  themeConfig: {
    nav: [
      { text: '部署', link: '/deploy/' },
      { text: '开始', link: '/start/dev-setup' },
      { text: '架构', link: '/architecture/overview' },
      { text: '模块', link: '/modules/project' },
      { text: '流程', link: '/flows/exam-publish-answer' },
      { text: '参考', link: '/reference/permissions' },
      { text: '文档状态', link: '/status' },
    ],
    sidebar: [
      {
        text: '部署',
        items: [
          { text: '部署总览', link: '/deploy/' },
          { text: 'Windows 便携包', link: '/deploy/windows' },
          { text: 'Linux 服务器', link: '/deploy/linux' },
          { text: 'Docker', link: '/deploy/docker' },
          { text: '版本与升级', link: '/deploy/versioning' },
          { text: '部署常见问题', link: '/deploy/faq' },
        ],
      },
      {
        text: '开始',
        items: [
          { text: '本地开发环境', link: '/start/dev-setup' },
          { text: '检查与测试', link: '/start/testing' },
          { text: '文档维护流程', link: '/start/docs-workflow' },
        ],
      },
      {
        text: '架构',
        items: [
          { text: '架构总览', link: '/architecture/overview' },
          { text: '前端结构', link: '/architecture/frontend' },
          { text: '后端结构', link: '/architecture/backend' },
          { text: '数据模型', link: '/architecture/data-model' },
          { text: '功能范围', link: '/architecture/scope' },
        ],
      },
      {
        text: '模块',
        items: [
          { text: '考试与问卷', link: '/modules/project' },
          { text: '编辑器与题型', link: '/modules/survey' },
          { text: '答卷、评分与报表', link: '/modules/answer' },
          { text: '练习与错题本', link: '/modules/exercise' },
          { text: '题库与题目', link: '/modules/repo' },
          { text: '班级与学情', link: '/modules/teaching' },
          { text: '权限与角色', link: '/modules/permissions' },
          { text: '文件与附件', link: '/modules/files' },
          { text: '首页与统计', link: '/modules/dashboard' },
          { text: '登录与账号', link: '/modules/auth' },
        ],
      },
      {
        text: '流程',
        items: [
          { text: '登录与会话', link: '/flows/login-auth' },
          { text: '建卷 → 发布 → 答题 → 报表', link: '/flows/exam-publish-answer' },
          { text: '从题库组卷', link: '/flows/repo-compose' },
          { text: '建班 → 加学员 → 分配老师', link: '/flows/class-grant' },
          { text: '新增/修改权限点', link: '/flows/permission-change' },
        ],
      },
      {
        text: '参考',
        items: [
          { text: '路由表（生成）', link: '/reference/routes' },
          { text: '接口表（生成）', link: '/reference/api' },
          { text: '权限目录（生成）', link: '/reference/permissions' },
          { text: '数据库结构（生成）', link: '/reference/db-schema' },
          { text: '环境变量', link: '/reference/env' },
        ],
      },
      {
        text: '决策记录',
        items: [
          { text: 'ADR-0001 权限模型', link: '/decisions/ADR-0001-rbac' },
          { text: 'ADR-0002 管理员权限全集', link: '/decisions/ADR-0002-admin-catalog' },
          { text: 'ADR-0003 老师考试与题库边界', link: '/decisions/ADR-0003-teacher-exam-vs-repo' },
        ],
      },
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    editLink: {
      pattern: repo + '/edit/main/docs/:path',
      text: '在 GitHub 编辑此页',
    },
    lastUpdated: { text: '最后更新' },
    footer: {
      message: '文档与代码同仓库维护；以当前 commit 为准。',
      copyright: '旭日云课堂',
    },
  },
})
