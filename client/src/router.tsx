import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import BasicLayout from './layout/BasicLayout';
import RequirePerm from './components/RequirePerm';
import Placeholder from './pages/Placeholder';

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
const ProjectList = lazy(() => import('./pages/project/List'));
const TaskCenter = lazy(() => import('./pages/tasks/TaskCenter'));
const TeachingWorkbench = lazy(() => import('./pages/teaching/Workbench'));
const TeachingClasses = lazy(() => import('./pages/teaching/Classes'));
const ProjectTrash = lazy(() => import('./pages/project/Trash'));
const SurveyEditor = lazy(() => import('./pages/survey/Editor'));
const SurveySetting = lazy(() => import('./pages/survey/Setting'));
const SurveyOverview = lazy(() => import('./pages/survey/Overview'));
const SurveyData = lazy(() => import('./pages/survey/Data'));
const SurveyReport = lazy(() => import('./pages/survey/Report'));
const SystemUser = lazy(() => import('./pages/system/User'));
const SystemGroupEntry = lazy(() => import('./pages/system/GroupEntry'));
const SystemSetting = lazy(() => import('./pages/system/Setting'));
const SystemPermissions = lazy(() => import('./pages/system/Permissions'));
const SystemAudit = lazy(() => import('./pages/system/Audit'));
const AccountSettings = lazy(() => import('./pages/account/Settings'));
const RepoList = lazy(() => import('./pages/repo/List'));
const RepoQuestions = lazy(() => import('./pages/repo/Questions'));
const RepoBook = lazy(() => import('./pages/repo/Book'));
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
      // 教学视角 = 门户权限 + 报表权限：TeachingApi（/api/teaching/*）要 project:report，
      // 只配 portal:teacher 的角色进来会 403；学员预设也带 project:report，所以不能只判 report。
      { path: 'teaching', element: guard('portal:teacher', guard('project:report', <TeachingWorkbench />)) },
      { path: 'teaching/classes', element: guard('class:list', <TeachingClasses />) },
      // 「我的任务」是学员入口：没有 project:answer 的教职工不再能直接打开答题列表
      { path: 'tasks', element: guard('project:answer', <TaskCenter />) },
      { path: 'project', element: guard('project:list', <ProjectList />) },
      { path: 'project/trash', element: guard('project:list', <ProjectTrash />) },
      { path: 'project/:id', element: <Placeholder title="项目详情" /> },
      { path: 'exercise', element: guard('exercise:list', <ExerciseList />) },
      { path: 'exercise/practice/:repoId', element: guard('exercise:list', <Practice />) },
      { path: 'exercise/:repoId', element: <Placeholder title="练习详情" /> },
      { path: 'repo/index', element: guard('repo:list', <RepoList />) },
      // 练习册/错题本后端要 repo:book，路由守卫与接口保持一致；
      // 只有 repo:list 的角色（如老师）本来也不该从菜单进来。
      { path: 'repo/book', element: guard('repo:book', <RepoBook />) },
      { path: 'repo/book/practice', element: guard('repo:book', <BookPractice />) },
      // 题目页：管理端 repo:detail，学员 repo:questions:read；不能再只靠 repo:list（那只是列表入口）
      {
        path: 'repo/:repoId/questions/:mode',
        element: guard(['repo:detail', 'repo:questions:read', 'template:list'], <RepoQuestions />),
      },
      { path: 'account/settings', element: <AccountSettings /> },
      { path: 'survey/:id', element: guard('project:detail', <SurveyOverview />) },
      { path: 'survey/:id/edit', element: guard('project:update', <SurveyEditor />) },
      // 发布设置已并入概述页：旧链接保留，但设置本身要 project:update，不能裸奔
      { path: 'survey/:id/setting', element: guard('project:update', <SurveySetting />) },
      { path: 'survey/:id/data', element: guard('answer:list', <SurveyData />) },
      // 报表接口要 project:report（ReportApi），守卫不能只看 answer:list
      { path: 'survey/:id/report', element: guard('project:report', <SurveyReport />) },
      { path: 'survey/:id/poster', element: <Placeholder title="分享海报" /> },
      { path: 'system/user', element: guard('system:user:list', <SystemUser />) },
      // 用户组设置已并入班级管理：有 class:list 的账号进来会重定向，避免两棵树
      { path: 'system/group', element: guard('system:dept:list', <SystemGroupEntry />) },
      { path: 'system/setting', element: guard('system:role:list', <SystemSetting />) },
      // 权限目录与角色矩阵：按任务要求用 system:user:update 守卫
      { path: 'system/permissions', element: guard('system:role:list', <SystemPermissions />) },
      { path: 'system/audit', element: guard('system:log:list', <SystemAudit />) },
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
