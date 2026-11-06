import { createBrowserRouter, Navigate } from 'react-router-dom';
import BasicLayout from './layout/BasicLayout';
import RequirePerm from './components/RequirePerm';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import Home from './pages/Home';
import ProjectList from './pages/project/List';
import ProjectTrash from './pages/project/Trash';
import SurveyEditor from './pages/survey/Editor';
import SurveySetting from './pages/survey/Setting';
import SurveyOverview from './pages/survey/Overview';
import SurveyData from './pages/survey/Data';
import SurveyReport from './pages/survey/Report';
import SystemUser from './pages/system/User';
import SystemGroup from './pages/system/Group';
import SystemSetting from './pages/system/Setting';
import SystemPermissions from './pages/system/Permissions';
import AccountSettings from './pages/account/Settings';
import RepoList from './pages/repo/List';
import RepoQuestions from './pages/repo/Questions';
import RepoBook from './pages/repo/Book';
import BookPractice from './pages/repo/BookPractice';
import ExerciseList from './pages/exercise/List';
import Practice from './pages/exercise/Practice';
import PublicAnswer from './pages/answer/PublicAnswer';
import PublicQuery from './pages/answer/PublicQuery';
import ExamResult from './pages/answer/ExamResult';
import Placeholder from './pages/Placeholder';

/** 页面级权限守卫：角色权限在 auth/permissions.ts 里统一判定 */
const guard = (perm: string, element: JSX.Element) => <RequirePerm perm={perm}>{element}</RequirePerm>;

/**
 * 路由与 spec/architecture.md 的 40 条表对齐，按调查结论做了裁剪：
 * - 模板广场 / 题库模板：模板只在客户端 localStorage 参与「从模板新建」，无独立页面价值
 * - 系统管理的角色/部门/职务/数据字典：单人自用场景用不到，数据仍在库里
 * - 流程编排：flow 模块没打进 api jar，`/api/workflow/*` 实际不可用
 */
export const router = createBrowserRouter([
  { path: '/user/login', element: <Login /> },
  { path: '/user/register', element: <Register /> },
  {
    path: '/',
    element: <BasicLayout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      { path: 'project', element: guard('project:list', <ProjectList />) },
      { path: 'project/trash', element: guard('project:list', <ProjectTrash />) },
      { path: 'project/:id', element: <Placeholder title="项目详情" /> },
      { path: 'exercise', element: guard('exercise:list', <ExerciseList />) },
      { path: 'exercise/practice/:repoId', element: guard('exercise:list', <Practice />) },
      { path: 'exercise/:repoId', element: <Placeholder title="练习详情" /> },
      { path: 'repo/index', element: guard('repo:list', <RepoList />) },
      { path: 'repo/book', element: guard('repo:list', <RepoBook />) },
      { path: 'repo/book/practice', element: guard('repo:list', <BookPractice />) },
      { path: 'repo/:repoId/questions/:mode', element: guard('repo:list', <RepoQuestions />) },
      { path: 'account/settings', element: <AccountSettings /> },
      { path: 'survey/:id', element: guard('project:detail', <SurveyOverview />) },
      { path: 'survey/:id/edit', element: guard('project:update', <SurveyEditor />) },
      { path: 'survey/:id/setting', element: guard('project:update', <SurveySetting />) },
      { path: 'survey/:id/data', element: guard('answer:list', <SurveyData />) },
      { path: 'survey/:id/report', element: guard('answer:list', <SurveyReport />) },
      { path: 'survey/:id/poster', element: <Placeholder title="分享海报" /> },
      { path: 'system/user', element: guard('system:user:list', <SystemUser />) },
      { path: 'system/group', element: guard('system:dept:list', <SystemGroup />) },
      { path: 'system/setting', element: guard('system:role:list', <SystemSetting />) },
      // 权限目录与角色矩阵：按任务要求用 system:user:update 守卫
      { path: 'system/permissions', element: guard('system:role:list', <SystemPermissions />) },
    ],
  },
  // 公开答题侧不需要登录与侧栏
  { path: '/s/:id', element: <PublicAnswer /> },
  { path: '/s/:id/:answerId', element: <PublicAnswer /> },
  { path: '/s/:id/exam-result/:answerId', element: <ExamResult /> },
  { path: '/s/:id/result/:resultId', element: <PublicQuery /> },
  { path: '/setup', element: <Placeholder title="初始化向导" public /> },
  { path: '*', element: <Placeholder title="页面不存在" /> },
]);
