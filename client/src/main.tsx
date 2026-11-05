import ReactDOM from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

dayjs.locale('zh-cn');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#3873f6', borderRadius: 6 } }}>
    <AntApp>
      <RouterProvider router={router} />
    </AntApp>
  </ConfigProvider>,
);
