import { lazy, Suspense } from 'react';
import type { JSX } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import BasicLayout from './layout/BasicLayout';
import RequirePerm from './components/RequirePerm';
import Placeholder from './pages/Placeholder';
import { PERMISSION_CODES } from './auth/permission-codes';

/**
 * 页面全部按路由懒加载。
 *
 * 之前 32 个页面是静态 import，整个后台（含权限目录、系统管理、出卷编辑器）都打进一个 2MB 的
 * 入口 chunk：学员打开 /s/:id 答题也要先下完管理端代码，弱网/旧手机上首屏要好几秒。
 * 改成 lazy 之后，首屏只加载 BasicLayout 与当前路由对应的一页。
 */
const Login = lazy(() => import('./pages/user/Login'));
const Register = lazy(() => import('./pages/user/Register'));
const Home = lazy(() => import('./pages/Home'));
// AI 与智能体引导页：能力清单 + 模型开通 + MCP 三步接入（task-16）
// AI 说明页已并入「系统设置 → AI」：这里只保留旧链接的入口组件
const NoticeCenter = lazy(() => import('./pages/notice/NoticeCenter'));
// 公告管理台：系统管理里的写入口（铃铛进的 /notice 是只读中心）
const NoticeAdmin = lazy(() => import('./pages/notice/NoticeAdmin'));
const ProjectEntry = lazy(() => import('./pages/project/Entry'));
const TaskCenter = lazy(() => import('./pages/tasks/TaskCenter'));
const TeachingHome = lazy(() => import('./pages/teaching/TeachingHome'));
const SurveyList = lazy(() => import('./pages/survey/SurveyList'));
const ProjectTrash = lazy(() => import('./pages/project/Trash'));
const SurveyEditor = lazy(() => import('./pages/survey/Editor'));
const SurveyPrint = lazy(() => import('./pages/survey/Print'));
const SurveySetting = lazy(() => import('./pages/survey/Setting'));
const SurveyOverview = lazy(() => import('./pages/survey/Overview'));
const SurveyData = lazy(() => import('./pages/survey/Data'));
const SurveyReport = lazy(() => import('./pages/survey/Report'));
// 用户 / 角色权限 / 用户组合并成一页三 Tab：系统管理从 5 项降到 4 项
const SystemAccess = lazy(() => import('./pages/system/Access'));
const SystemSetting = lazy(() => import('./pages/system/Setting'));
const SystemAudit = lazy(() => import('./pages/system/Audit'));
const AccountSettings = lazy(() => import('./pages/account/Settings'));
const RepoList = lazy(() => import('./pages/repo/List'));
const RepoQuestions = lazy(() => import('./pages/repo/Questions'));
const RepoReport = lazy(() => import('./pages/repo/Report'));
const RepoBook = lazy(() => import('./pages/repo/Book'));
const RepoPracticeHome = lazy(() => import('./pages/repo/PracticeHome'));
const BookPractice = lazy(() => import('./pages/repo/BookPractice'));
const ExerciseList = lazy(() => import('./pages/exercise/List'));
const Practice = lazy(() => import('./pages/exercise/Practice'));
const PublicAnswer = lazy(() => import('./pages/answer/PublicAnswer'));
const PublicQuery = lazy(() => import('./pages/answer/PublicQuery'));
const ExamResult = lazy(() => import('./pages/answer/ExamResult'));

/** 懒加载页面的统一占位：不要用空白，否则弱网下看起来像白屏 */
const PageLoading = () => (
  <div style={{ padding: 64, textAlign: 'center', color: 'var(--bp-text-soft)', fontSize: 13 }}>
    页面加载中…
  </div>
);

/** 顶层路由（布局与公开页）包一层 Suspense；布局内的子路由由它一并覆盖 */
const withSuspense = (element: JSX.Element) => <Suspense fallback={<PageLoading />}>{element}</Suspense>;

/** 页面级权限守卫：角色权限在 auth/permissions.ts 里统一判定 */
const guard = (perm: string | string[], element: JSX.Element) => (
  <RequirePerm perm={perm}>{element}</RequirePerm>
);

/**
 * 路由与 spec/architecture.md 的 40 条表对齐，按调查结论做了裁剪：
 * - 模板广场 / 题库模板：模板只在客户端 localStorage 参与「从模板新建」，无独立页面价值
 * - 系统管理的角色/部门/职务/数据字典：单人自用场景用不到，数据仍在库里
 * - 流程编排：flow 模块没打进 api jar，/api/workflow/* 实际不可用
 */
export const router = createBrowserRouter([
  { path: '/user/login', element: withSuspense(<Login />) },
  { path: '/user/register', element: withSuspense(<Register />) },
  {
    path: '/',
    element: withSuspense(<BasicLayout />),
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      // AI 说明已并入「系统设置 → AI」页；旧的 /ai 链接保留成重定向，别让书签和文档链接 404
      { path: 'ai', element: <Navigate to="/system/setting?tab=ai" replace /> },
      // 公告中心（只读）：全角色可见（学员预设也带 notice:list），顶栏铃铛指向这里。
      // 写入口在系统管理 → 公告管理（/system/notice），两个页面共用同一套接口与权限。
      { path: 'notice', element: guard(PERMISSION_CODES.noticeList, <NoticeCenter />) },
      // 教学 = 考试/问卷 + 班级（原「班级管理」独立菜单已并入）。
      // 守卫用「任一命中」：只带班不带课的班主任（class:list）也要能进来，否则合并之后他反而没入口了。
      { path: 'teaching', element: guard([PERMISSION_CODES.projectList, PERMISSION_CODES.classList], <TeachingHome />) },
      // 问卷独立成一级菜单：静态段 'survey/list' 排在 '/survey/:id' 之前，不会被当成项目 id
      { path: 'survey/list', element: guard(PERMISSION_CODES.projectList, <SurveyList />) },
      // 左侧菜单的两个子项：试卷 / 班级。旧链接 /teaching/classes（含 ?classId=）照样能用，
      // 页面按路径里的 :tab 决定显示哪个 Tab，query 里的 classId 不受影响。
      {
        path: 'teaching/:tab',
        element: guard([PERMISSION_CODES.projectList, PERMISSION_CODES.classList], <TeachingHome />),
      },
      // 「我的任务」是学员入口：没有 project:answer 的教职工不再能直接打开答题列表
      { path: 'tasks', element: guard(PERMISSION_CODES.projectAnswer, <TaskCenter />) },
      // /project 只保留给学员/只读协作者；老师与管理员由 Entry 重定向到 /teaching?tab=exam
      { path: 'project', element: guard(PERMISSION_CODES.projectList, <ProjectEntry />) },
      { path: 'project/trash', element: guard(PERMISSION_CODES.projectList, <ProjectTrash />) },
      { path: 'project/:id', element: <Placeholder title="项目详情" /> },
      { path: 'exercise', element: guard(PERMISSION_CODES.exerciseList, <ExerciseList />) },
      { path: 'exercise/practice/:repoId', element: guard(PERMISSION_CODES.exerciseList, <Practice />) },
      { path: 'exercise/:repoId', element: <Placeholder title="练习详情" /> },
      { path: 'repo/index', element: guard(PERMISSION_CODES.repoList, <RepoList />) },
    {
      path: 'repo/:repoId/report',
      element: guard(PERMISSION_CODES.repoReport, <RepoReport />),
    },
      // 练习册/错题本后端要 repo:book，路由守卫与接口保持一致；
      // 只有 repo:list 的角色（如老师）本来也不该从菜单进来。
      { path: 'repo/book', element: guard(PERMISSION_CODES.repoBook, <RepoBook />) },
      { path: 'repo/:repoId/practice', element: guard(PERMISSION_CODES.repoPractice, <RepoPracticeHome />) },
      { path: 'repo/book/practice', element: guard(PERMISSION_CODES.repoBook, <BookPractice />) },
      // 题目页：管理端 repo:detail，学员 repo:questions:read；不能再只靠 repo:list（那只是列表入口）
      {
        path: 'repo/:repoId/questions/:mode',
        element: guard([PERMISSION_CODES.repoDetail, PERMISSION_CODES.repoQuestionsRead, PERMISSION_CODES.templateList], <RepoQuestions />),
      },
      { path: 'account/settings', element: <AccountSettings /> },
      { path: 'survey/:id', element: guard(PERMISSION_CODES.projectDetail, <SurveyOverview />) },
      { path: 'survey/:id/edit', element: guard(PERMISSION_CODES.projectUpdate, <SurveyEditor />) },
      { path: 'survey/:id/print', element: guard(PERMISSION_CODES.projectDetail, <SurveyPrint />) },
      // 发布设置已并入概述页：旧链接保留，但设置本身要 project:update，不能裸奔
      { path: 'survey/:id/setting', element: guard(PERMISSION_CODES.projectUpdate, <SurveySetting />) },
      { path: 'survey/:id/data', element: guard(PERMISSION_CODES.answerList, <SurveyData />) },
      // 报表接口要 project:report（ReportApi），守卫不能只看 answer:list
      { path: 'survey/:id/report', element: guard(PERMISSION_CODES.projectReport, <SurveyReport />) },
      { path: 'survey/:id/poster', element: <Placeholder title="分享海报" /> },
      // 用户 / 角色权限 / 用户组三合一（Tab 内再按各自权限逐个判）
      {
        path: 'system/access',
        element: guard(
          [PERMISSION_CODES.systemUserList, PERMISSION_CODES.systemRoleList, PERMISSION_CODES.systemDeptList],
          <SystemAccess />,
        ),
      },
      // 旧链接：分别指向合并后页面里对应的 Tab
      { path: 'system/user', element: <Navigate to="/system/access?tab=user" replace /> },
      { path: 'system/group', element: <Navigate to="/system/access?tab=group" replace /> },
      { path: 'system/permissions', element: <Navigate to="/system/access?tab=role" replace /> },
      { path: 'system/setting', element: guard(PERMISSION_CODES.systemRoleList, <SystemSetting />) },
      // 公告管理：管理员发全站、老师发自己带的班；范围判定在后端，这里只管入口
      {
        path: 'system/notice',
        element: guard([PERMISSION_CODES.noticeManageSystem, PERMISSION_CODES.noticeManageClass], <NoticeAdmin />),
      },
      { path: 'system/audit', element: guard(PERMISSION_CODES.systemLogList, <SystemAudit />) },
    ],
  },
  // 公开答题侧不需要登录与侧栏
  { path: '/s/:id', element: withSuspense(<PublicAnswer />) },
  { path: '/s/:id/:answerId', element: withSuspense(<PublicAnswer />) },
  { path: '/s/:id/exam-result/:answerId', element: withSuspense(<ExamResult />) },
  { path: '/s/:id/result/:resultId', element: withSuspense(<PublicQuery />) },
  { path: '/setup', element: <Placeholder title="初始化向导" public /> },
  { path: '*', element: <Placeholder title="页面不存在" /> },
]);
