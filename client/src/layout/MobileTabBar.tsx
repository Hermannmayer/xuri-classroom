import type { ReactNode } from 'react';
import {
  DatabaseOutlined,
  FormOutlined,
  HomeOutlined,
  ProjectOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { can } from '../auth/permissions';
import { t } from '../i18n';

interface TabItem {
  key: string;
  path: string;
  label: string;
  icon: ReactNode;
  active: (pathname: string) => boolean;
}

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** 手机端底栏：只渲染当前用户有权限的入口，「我的」常驻 */
export default function MobileTabBar({ authorities }: { authorities: string[] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs: TabItem[] = [
    {
      key: 'home',
      path: '/home',
      label: t('menu.home', '首页'),
      icon: <HomeOutlined />,
      active: (p) => p === '/home' || p === '/',
    },
  ];
  if (can(authorities, 'project:list')) {
    tabs.push({
      key: 'project',
      path: '/project',
      label: t('menu.project', '我的项目'),
      icon: <ProjectOutlined />,
      active: (p) => under(p, '/project'),
    });
  }
  if (can(authorities, 'exercise:list')) {
    tabs.push({
      key: 'exercise',
      path: '/exercise',
      label: t('menu.exercise', '我的练习'),
      icon: <FormOutlined />,
      active: (p) => under(p, '/exercise'),
    });
  }
  if (can(authorities, 'repo:list')) {
    tabs.push({
      key: 'repo',
      path: '/repo/index',
      label: '题库',
      icon: <DatabaseOutlined />,
      active: (p) => under(p, '/repo'),
    });
  }
  tabs.push({
    key: 'account',
    path: '/account/settings',
    label: '我的',
    icon: <UserOutlined />,
    active: (p) => under(p, '/account'),
  });

  return (
    <nav className="sk-mobile-tabbar" aria-label="移动端导航">
      {tabs.map((tab) => {
        const active = tab.active(pathname);
        return (
          <button
            key={tab.key}
            type="button"
            className={`sk-mobile-tabbar-item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(tab.path)}
          >
            {tab.icon}
            <span className="sk-mobile-tabbar-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
