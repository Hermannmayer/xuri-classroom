import { useOutletContext } from 'react-router-dom';
import Dashboard from './home/Dashboards';
import type { UserInfo } from '../api';

/** 首页按「视角」分发（具体判定在 Dashboards 的默认导出里）： */
export default function Home() {
  const { user } = useOutletContext<{ user?: UserInfo }>();
  return <Dashboard authorities={user?.authorityList ?? []} />;
}
