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

const BUILD_RELOAD_KEY = 'sk-web-build-reload';

function metaContent(name: string): string | null {
  return document.querySelector<HTMLMetaElement>('meta[name="' + name + '"]')?.content || null;
}

function showStaleBuildBanner() {
  if (document.getElementById('sk-stale-build')) return;
  const bar = document.createElement('div');
  bar.id = 'sk-stale-build';
  bar.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;gap:12px;align-items:center;justify-content:center;padding:10px 14px;background:#8a3b12;color:#fff;font:13px/1.6 system-ui,sans-serif;';
  bar.textContent = '系统已更新，但当前页面还是旧版本资源；请联系管理员确认前端是否已更新。';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '重新加载';
  button.style.cssText = 'border:1px solid rgba(255,255,255,.7);background:transparent;color:#fff;padding:2px 10px;cursor:pointer;';
  button.onclick = () => window.location.reload();
  bar.appendChild(button);
  document.body.appendChild(bar);
}

/** 旧包检测：后端换了新 jar 时，浏览器可能还拿着旧 index.html；先自动刷新一次，仍不一致再提示 */
async function ensureFreshBuild() {
  const local = metaContent('app-build');
  if (!local) return;
  try {
    const res = await fetch('/api/system/version', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const body = (await res.json()) as { data?: { version?: string; webBuild?: string }; version?: string; webBuild?: string };
    const data = body?.data ?? body;
    if (!data?.webBuild || data.webBuild === local) {
      sessionStorage.removeItem(BUILD_RELOAD_KEY);
      return;
    }
    if (!sessionStorage.getItem(BUILD_RELOAD_KEY)) {
      sessionStorage.setItem(BUILD_RELOAD_KEY, '1');
      window.location.reload();
      return;
    }
    showStaleBuildBanner();
  } catch {
    // 版本检查失败不影响正常使用
  }
}


void ensureFreshBuild();

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
