import type { ReactNode } from 'react';
import {
  DatabaseOutlined,
  HomeOutlined,
  ProjectOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { can } from '../auth/permissions';
import { t } from '../i18n';
import { PERMISSION_CODES } from '../auth/permission-codes';

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

  const canTeach =
    can(authorities, PERMISSION_CODES.projectList) || can(authorities, PERMISSION_CODES.classList);

  const tabs: TabItem[] = [
    {
      key: 'home',
      path: '/home',
      label: t('menu.home', '首页'),
      icon: <HomeOutlined />,
      active: (p) => p === '/home' || p === '/',
    },
  ];


  if (canTeach) {
    tabs.push({
      key: 'teaching',
      path: '/teaching',
      label: '教学',
      icon: <ProjectOutlined />,
      active: (p) => under(p, '/teaching'),
    });
  }
  if (!canTeach && !can(authorities, PERMISSION_CODES.portalAdmin) && can(authorities, PERMISSION_CODES.portalStudent)) {
    tabs.push({
      key: 'tasks',
      path: '/tasks',
      label: '我的任务',
      icon: <ProjectOutlined />,
      active: (p) => under(p, '/tasks') || under(p, '/project') || under(p, '/exercise'),
    });
  }
  if (can(authorities, PERMISSION_CODES.repoList)) {
    tabs.push({
      key: 'repo',
      path: '/repo/index',
      label: '题库',
      icon: <DatabaseOutlined />,
      active: (p) => under(p, '/repo'),
    });
  }


  const canSystem =
    can(authorities, PERMISSION_CODES.systemUserList) ||
    can(authorities, PERMISSION_CODES.systemRoleList) ||
    can(authorities, PERMISSION_CODES.systemDeptList) ||
    can(authorities, PERMISSION_CODES.noticeManageSystem) ||
    can(authorities, PERMISSION_CODES.noticeManageClass) ||
    can(authorities, PERMISSION_CODES.systemLogList);
  if (canSystem) {
    tabs.push({
      key: 'system',
      path: '/system',
      label: '系统',
      icon: <SettingOutlined />,
      active: (p) => under(p, '/system'),
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