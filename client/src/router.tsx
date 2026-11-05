import { createBrowserRouter, Navigate } from 'react-router-dom';
import BasicLayout from './layout/BasicLayout';
import Login from './pages/user/Login';
import Home from './pages/Home';
import ProjectList from './pages/project/List';
import Placeholder from './pages/Placeholder';
import Playground from './pages/Playground';

/**
 * 路由与 spec/architecture.md 的 40 条表对齐，按调查结论做了裁剪：
 * - 模板广场 / 题库模板：模板只在客户端 localStorage 参与「从模板新建」，无独立页面价值
 * - 系统管理的角色/部门/职务/数据字典：单人自用场景用不到，数据仍在库里
 * - 流程编排：flow 模块没打进 api jar，`/api/workflow/*` 实际不可用
 * 一期只落地闭环页面，其余先挂占位。
 */
export const router = createBrowserRouter([
  { path: '/user/login', element: <Login /> },
  {
    path: '/',
    element: <BasicLayout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      { path: 'playground', element: <Playground /> },
      { path: 'project', element: <ProjectList /> },
      { path: 'project/:id', element: <Placeholder title="项目详情" /> },
      { path: 'exercise', element: <Placeholder title="我的练习" /> },
      { path: 'exercise/:repoId', element: <Placeholder title="练习详情" /> },
      { path: 'repo/index', element: <Placeholder title="题库列表" /> },
      { path: 'repo/book', element: <Placeholder title="练习册" /> },
      { path: 'repo/:repoId/questions/:mode', element: <Placeholder title="题目管理" /> },
      { path: 'account/settings', element: <Placeholder title="账号设置" /> },
      { path: 'survey/:id', element: <Placeholder title="问卷总览" /> },
      { path: 'survey/:id/edit', element: <Placeholder title="问卷设计器" /> },
      { path: 'survey/:id/setting', element: <Placeholder title="发布设置" /> },
      { path: 'survey/:id/data', element: <Placeholder title="答卷数据" /> },
      { path: 'survey/:id/report', element: <Placeholder title="数据分析" /> },
      { path: 'survey/:id/poster', element: <Placeholder title="分享海报" /> },
      { path: 'system/user', element: <Placeholder title="用户管理" /> },
      { path: 'system/setting', element: <Placeholder title="系统设置" /> },
    ],
  },
  // 公开答题侧不需要登录与侧栏
  { path: '/s/:id', element: <Placeholder title="公开答题" public /> },
  { path: '/s/:id/:answerId', element: <Placeholder title="答题页" public /> },
  { path: '/s/:id/exam-result/:answerId', element: <Placeholder title="考试成绩" public /> },
  { path: '/s/:id/result/:resultId', element: <Placeholder title="结果查询" public /> },
  { path: '/setup', element: <Placeholder title="初始化向导" public /> },
  { path: '*', element: <Placeholder title="页面不存在" /> },
]);
