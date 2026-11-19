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
  // 教学 = 考试/问卷 + 班级（已合并），入口按「能上课」或「能带班」任一命中
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
  // 三个视角和桌面端一致：老师/管理员一个「教学」（考试/问卷 + 班级两个 Tab），学员一个「我的任务」。
  // 原来的独立「班级」tab 已经并进教学——底栏 5 个位置本来就挤。
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
  // 系统管理：手机上没有侧栏，底栏原来只有「首页/教学/题库/我的」，
  // 管理员在手机上根本进不去系统设置。这里补一个「系统」，落到他有权限的第一个系统页。
  const canSystem =
    can(authorities, PERMISSION_CODES.systemUserList) ||
    can(authorities, PERMISSION_CODES.systemRoleList) ||
    can(authorities, PERMISSION_CODES.systemDeptList) ||
    can(authorities, PERMISSION_CODES.noticeManageSystem) ||
    can(authorities, PERMISSION_CODES.noticeManageClass) ||
    can(authorities, PERMISSION_CODES.systemLogList);
  if (canSystem) {
    const systemPath = can(authorities, PERMISSION_CODES.systemRoleList)
      ? '/system/setting'
      : can(authorities, PERMISSION_CODES.systemUserList) || can(authorities, PERMISSION_CODES.systemDeptList)
        ? '/system/access'
        : can(authorities, PERMISSION_CODES.noticeManageSystem) || can(authorities, PERMISSION_CODES.noticeManageClass)
          ? '/system/notice'
          : '/system/audit';
    tabs.push({
      key: 'system',
      path: systemPath,
      label: '系统',
      icon: <SettingOutlined />,
      active: (p) => under(p, '/system'),
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
