import { createBrowserRouter, Navigate } from 'react-router-dom';
import BasicLayout from './layout/BasicLayout';
import Login from './pages/user/Login';
import Home from './pages/Home';
import Placeholder from './pages/Placeholder';

/**
 * 路由与 spec/architecture.md 的 40 条表对齐；
 * 一期只落地闭环相关页面，其余先挂占位，P2/P3 替换。
 */
export const router = createBrowserRouter([
  { path: '/user/login', element: <Login /> },
  {
    path: '/',
    element: <BasicLayout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      { path: 'project', element: <Placeholder title="我的项目" /> },
      { path: 'project/:id', element: <Placeholder title="项目详情" /> },
      { path: 'exercise', element: <Placeholder title="我的练习" /> },
      { path: 'exercise/:repoId', element: <Placeholder title="练习详情" /> },
      { path: 'repo/index', element: <Placeholder title="题库列表" /> },
      { path: 'repo/book', element: <Placeholder title="练习册" /> },
      { path: 'repo/template', element: <Placeholder title="题库模板" /> },
      { path: 'repo/:repoId/questions/:mode', element: <Placeholder title="题目管理" /> },
      { path: 'template', element: <Placeholder title="模板广场" /> },
      { path: 'account/settings', element: <Placeholder title="账号设置" /> },
      { path: 'survey/:id', element: <Placeholder title="问卷总览" /> },
      { path: 'survey/:id/edit', element: <Placeholder title="问卷设计器" /> },
      { path: 'survey/:id/setting', element: <Placeholder title="发布设置" /> },
      { path: 'survey/:id/flow', element: <Placeholder title="流程编排" /> },
      { path: 'survey/:id/data', element: <Placeholder title="答卷数据" /> },
      { path: 'survey/:id/report', element: <Placeholder title="数据分析" /> },
      { path: 'survey/:id/poster', element: <Placeholder title="分享海报" /> },
      { path: 'system/user', element: <Placeholder title="用户管理" /> },
      { path: 'system/role', element: <Placeholder title="角色管理" /> },
      { path: 'system/dept', element: <Placeholder title="部门管理" /> },
      { path: 'system/position', element: <Placeholder title="职务管理" /> },
      { path: 'system/dict', element: <Placeholder title="数据字典" /> },
      { path: 'system/setting', element: <Placeholder title="系统设置" /> },
    ],
  },
  // 公开答题侧不需要登录与侧栏
  { path: '/s/:id', element: <Placeholder title="公开答题" public /> },
  { path: '/s/:id/:answerId', element: <Placeholder title="答题页" public /> },
  { path: '/s/:id/exam-result/:answerId', element: <Placeholder title="考试成绩" public /> },
  { path: '/s/:id/result/:resultId', element: <Placeholder title="结果查询" public /> },
  { path: '/t/:id', element: <Placeholder title="模板预览" public /> },
  { path: '/setup', element: <Placeholder title="初始化向导" public /> },
  { path: '*', element: <Placeholder title="页面不存在" /> },
]);
