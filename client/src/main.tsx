import ReactDOM from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ThemeProvider } from './theme/ThemeProvider';
import Watermark from './components/Watermark';
import CopyGuard from './components/CopyGuard';
import ErrorBoundary from './components/ErrorBoundary';
import './renderer/registerAll';
import './styles/global.css';
import './styles/answer.css';
import { applyStoredZoom } from './utils/uiZoom';
import { setUnauthorizedHandler } from './api';

dayjs.locale('zh-cn');

/**
 * 401 的统一处理按路由分流。
 *
 * 后台页面：跳登录页（保持原行为）。
 * 前台答题/公开查询（/s/*、/setup）：这些页面没有登录概念，整页跳登录会把学员刚填的答案冲掉，
 * 所以只把错误抛给调用方（页面自己提示"提交失败，请刷新重试"）。
 */
setUnauthorizedHandler(() => {
  const path = window.location.pathname;
  if (path.startsWith('/s/') || path === '/setup' || path.startsWith('/user/')) {
    return;
  }
  window.location.replace('/user/login');
});

// 统一界面缩放：开机就按用户上次选的档位作用到 <html>
applyStoredZoom();

// 用系统配置的 logo 当 favicon（机构换 logo 后标签页跟着换）
void fetch('/api/system')
  .then((res) => res.json())
  .then((body: { data?: { name?: string; avatar?: string; setting?: { favicon?: string } } }) => {
    // 系统名跟随后端配置，登录页也要生效
    if (body?.data?.name) document.title = body.data.name;
    const avatar = body?.data?.setting?.favicon || body?.data?.avatar;
    if (!avatar) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = avatar;
  })
  .catch(() => undefined);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConfigProvider locale={zhCN}>
    <ThemeProvider>
      <AntApp>
        {/* 渲染异常兜底：任何页面抛错都显示中文错误页，而不是整页白屏 */}
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
        {/* 内容保护：水印与防复制都挂在路由之外，覆盖全站（开关跟着系统设置走） */}
        <Watermark />
        <CopyGuard />
      </AntApp>
    </ThemeProvider>
  </ConfigProvider>,
);
