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
import './renderer/registerAll';
import './styles/global.css';
import './styles/answer.css';

dayjs.locale('zh-cn');

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
        <RouterProvider router={router} />
        {/* 内容保护：水印与防复制都挂在路由之外，覆盖全站（开关跟着系统设置走） */}
        <Watermark />
        <CopyGuard />
      </AntApp>
    </ThemeProvider>
  </ConfigProvider>,
);
