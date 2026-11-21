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








setUnauthorizedHandler(() => {
  const path = window.location.pathname;
  if (path.startsWith('/s/') || path === '/setup' || path.startsWith('/user/')) {
    return;
  }
  window.location.replace('/user/login');
});


applyStoredZoom();


void fetch('/api/system')
  .then((res) => res.json())
  .then((body: { data?: { name?: string; avatar?: string; setting?: { favicon?: string } } }) => {

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

        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>

        <Watermark />
        <CopyGuard />
      </AntApp>
    </ThemeProvider>
  </ConfigProvider>,
);
