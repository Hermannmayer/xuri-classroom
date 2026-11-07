import type { ReactNode } from 'react';
import {
  BarChartOutlined,
  DatabaseOutlined,
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
  // 三个视角和桌面端一致：
  // - 老师/管理员：教学管理 + 班级学情
  // - 学员：我的任务（考试安排 / 练习记录 / 我的成绩）
  if (can(authorities, 'portal:teacher')) {
    tabs.push({
      key: 'project',
      path: '/project',
      label: '教学',
      icon: <ProjectOutlined />,
      active: (p) => under(p, '/project') || under(p, '/survey'),
    });
    tabs.push({
      key: 'teaching',
      path: '/teaching',
      label: '学情',
      icon: <BarChartOutlined />,
      active: (p) => under(p, '/teaching'),
    });
  }
  if (!can(authorities, 'portal:teacher') && !can(authorities, 'portal:admin') && can(authorities, 'portal:student')) {
    tabs.push({
      key: 'tasks',
      path: '/tasks',
      label: '我的任务',
      icon: <ProjectOutlined />,
      active: (p) => under(p, '/tasks') || under(p, '/project') || under(p, '/exercise'),
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
  // 与桌面端一致：不再给「没有任何角色」的用户强塞「我的练习」。
  // 菜单能点但路由守卫（exercise:list）会 403，属于自欺欺人；
  // 正确做法是给用户配一个角色（学员预设），见 /system/permissions。
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
