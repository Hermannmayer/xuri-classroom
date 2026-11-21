import { lazy, Suspense } from 'react';
import type { JSX } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import BasicLayout from './layout/BasicLayout';
import RequirePerm from './components/RequirePerm';
import Placeholder from './pages/Placeholder';
import { PERMISSION_CODES } from './auth/permission-codes';

/** 页面全部按路由懒加载 */
const Login = lazy(() => import('./pages/user/Login'));
const Register = lazy(() => import('./pages/user/Register'));
const Home = lazy(() => import('./pages/Home'));
// AI 与智能体引导页：能力清单 + 模型开通 + MCP 三步接入（task-16） AI 说明页已并入「系统设置 → AI」：这里只保留旧链接的入口组件
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







export const router = createBrowserRouter([
  { path: '/user/login', element: withSuspense(<Login />) },
  { path: '/user/register', element: withSuspense(<Register />) },
  {
    path: '/',
    element: withSuspense(<BasicLayout />),
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },

      { path: 'ai', element: <Navigate to="/system/setting?tab=ai" replace /> },


      { path: 'notice', element: guard(PERMISSION_CODES.noticeList, <NoticeCenter />) },


      { path: 'teaching', element: guard([PERMISSION_CODES.projectList, PERMISSION_CODES.classList], <TeachingHome />) },

      { path: 'survey/list', element: guard(PERMISSION_CODES.projectList, <SurveyList />) },


      {
        path: 'teaching/:tab',
        element: guard([PERMISSION_CODES.projectList, PERMISSION_CODES.classList], <TeachingHome />),
      },

      {
        path: 'teaching/:tab/:classId',
        element: guard([PERMISSION_CODES.projectList, PERMISSION_CODES.classList], <TeachingHome />),
      },

      { path: 'tasks', element: guard(PERMISSION_CODES.projectAnswer, <TaskCenter />) },

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


      { path: 'repo/book', element: guard(PERMISSION_CODES.repoBook, <RepoBook />) },
      { path: 'repo/:repoId/practice', element: guard(PERMISSION_CODES.repoPractice, <RepoPracticeHome />) },
      { path: 'repo/book/practice', element: guard(PERMISSION_CODES.repoBook, <BookPractice />) },

      {
        path: 'repo/:repoId/questions/:mode',
        element: guard([PERMISSION_CODES.repoDetail, PERMISSION_CODES.repoQuestionsRead, PERMISSION_CODES.templateList], <RepoQuestions />),
      },
      { path: 'account/settings', element: <AccountSettings /> },
      { path: 'survey/:id', element: guard(PERMISSION_CODES.projectDetail, <SurveyOverview />) },
      { path: 'survey/:id/edit', element: guard(PERMISSION_CODES.projectUpdate, <SurveyEditor />) },
      { path: 'survey/:id/print', element: guard(PERMISSION_CODES.projectDetail, <SurveyPrint />) },

      { path: 'survey/:id/setting', element: guard(PERMISSION_CODES.projectUpdate, <SurveySetting />) },
      { path: 'survey/:id/data', element: guard(PERMISSION_CODES.answerList, <SurveyData />) },

      { path: 'survey/:id/report', element: guard(PERMISSION_CODES.projectReport, <SurveyReport />) },
      { path: 'survey/:id/poster', element: <Placeholder title="分享海报" /> },

      {
        path: 'system/access',
        element: guard(
          [PERMISSION_CODES.systemUserList, PERMISSION_CODES.systemRoleList, PERMISSION_CODES.systemDeptList],
          <SystemAccess />,
        ),
      },

      { path: 'system/user', element: <Navigate to="/system/access?tab=user" replace /> },
      { path: 'system/group', element: <Navigate to="/system/access?tab=group" replace /> },
      { path: 'system/permissions', element: <Navigate to="/system/access?tab=role" replace /> },
      { path: 'system/setting', element: guard(PERMISSION_CODES.systemRoleList, <SystemSetting />) },

      {
        path: 'system/notice',
        element: guard([PERMISSION_CODES.noticeManageSystem, PERMISSION_CODES.noticeManageClass], <NoticeAdmin />),
      },
      { path: 'system/audit', element: guard(PERMISSION_CODES.systemLogList, <SystemAudit />) },
    ],
  },

  { path: '/s/:id', element: withSuspense(<PublicAnswer />) },
  { path: '/s/:id/:answerId', element: withSuspense(<PublicAnswer />) },
  { path: '/s/:id/exam-result/:answerId', element: withSuspense(<ExamResult />) },
  { path: '/s/:id/result/:resultId', element: withSuspense(<PublicQuery />) },
  { path: '/setup', element: <Placeholder title="初始化向导" public /> },
  { path: '*', element: <Placeholder title="页面不存在" /> },
]);
