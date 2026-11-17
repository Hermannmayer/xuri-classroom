import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Dropdown, Layout, Menu, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  DatabaseOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  ProjectOutlined,
  SettingOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, getSystem, logout } from '../api';
import type { SystemInfo, UserInfo } from '../api';
import { can, notifyAuthChanged } from '../auth/permissions';
import ZoomControl from '../components/ZoomControl';
import { applyZoom, readZoom, snapZoom } from '../utils/uiZoom';
import { post } from '../api';
import { t } from '../i18n';
import { useThemeMode } from '../theme/ThemeProvider';
import MobileTabBar from './MobileTabBar';
import NoticeBell from '../pages/notice/NoticeBell';
import { PERMISSION_CODES } from '../auth/permission-codes';
import { AiAssistantFloat, AiAssistantProvider } from '../components/AiAssistant';

const { Header, Sider, Content } = Layout;

const MOBILE_QUERY = '(max-width: 767.98px)';

/** 用 matchMedia 而不是读 innerWidth，避免滚动/键盘引起的宽度抖动；767.98 与 antd md 断点对齐，覆盖 767.x 的小数视口 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export default function BasicLayout() {
  const [user, setUser] = useState<UserInfo>();
  const [system, setSystem] = useState<SystemInfo>();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const authorities = user?.authorityList ?? [];
  const { mode, setMode, toggle } = useThemeMode();
  // 页面缩放：整体放大，方便年长老师看清。默认 1.1 而不是 1：基准字号已经提到 15，
  // 再叠一档 110% 才是中老年学员实际能轻松读的尺寸，用户自己改过就尊重用户的值。
  const [zoom, setZoom] = useState<number>(() => readZoom());
  // 缩放跟着账号走：登录后优先用账号里存的档位，没有才用本机上次的值
  const changeTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    toggle();
    void post('/api/user/ui-theme', { uiTheme: next }).catch(() => undefined);
  };

  const changeZoom = (value: number) => {
    const snapped = snapZoom(value);
    setZoom(snapped);
    void post('/api/user/ui-zoom', { uiZoom: snapped }).catch(() => undefined);
  };
  useEffect(() => {
    applyZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    Promise.all([getCurrentUser(), getSystem().catch(() => undefined)])
      .then(([u, s]) => {
        setUser(u);
        setSystem(s);
        if (u?.uiZoom != null && Number.isFinite(Number(u.uiZoom))) {
          setZoom(snapZoom(Number(u.uiZoom)));
        }
        // 主题也跟着账号：账号里存过就用账号的，否则用本机上次的
        if (u?.uiTheme === 'light' || u?.uiTheme === 'dark') {
          setMode(u.uiTheme);
        }
        document.title = s?.name || '旭日云课堂';
      })
      .catch(() => navigate('/user/login', { replace: true }))
      .finally(() => setLoading(false));
  }, [navigate]);

  /**
   * 菜单按权限过滤（权限串来自 /api/currentUser 的 authorityList）：
   * - ROLE_admin 视为全权限
   * - 学员只需 exercise:*（我的练习）与 repo:*（题库只读）
   * - 管理员才有 project:* 与 system:*
   */
  const items = useMemo(() => {
    const authorities = user?.authorityList ?? [];
    const isAdmin = authorities.includes('ROLE_admin');
    // 用和路由守卫完全一致的 can() 判定（精确权限或显式 domain:*），
    // 不再用 startsWith 前缀——否则有 system:log:list 的人会看到「用户管理」，
    // 点进去被 router 的精确守卫拦成 403。
    const allow = (perm: string) => can(authorities, perm);

    const menu: NonNullable<MenuProps['items']> = [{ key: '/home', icon: <HomeOutlined />, label: t('menu.home', '首页') }];

    // 三个视角分开：
    // - 老师/管理员：教学（考试/问卷 + 班级，已经合并成一页两个 Tab）；不做题，所以没有「我的任务」
    // - 学员：只有「我的任务」（考试安排 / 练习记录 / 我的成绩）
    // 入口按「能上课（project:list）」或「能带班（class:list）」任一命中，与 router.tsx 的守卫一致；
    // 只带班不带课的班主任也有入口，合并之后他不会反而进不去。
    const canTeach = allow(PERMISSION_CODES.projectList) || allow(PERMISSION_CODES.classList);
    if (canTeach) {
      menu.push({ key: '/teaching', icon: <ProjectOutlined />, label: '教学' });
    }
    // 管理/教学视角优先：账号同时拥有 portal:student（管理员默认全有）时，
    // 不再显示「我的任务」——管理员和老师不做题。
    if (!canTeach && !isAdmin && allow(PERMISSION_CODES.portalStudent)) {
      menu.push({ key: '/tasks', icon: <ProjectOutlined />, label: '我的任务' });
    }

    // 题库中心：父项只有在至少有一个子项可见时才出现
    const repoChildren: NonNullable<MenuProps['items']> = [];
    if (allow(PERMISSION_CODES.repoList)) {
      repoChildren.push({ key: '/repo/index', label: t('menu.repo.list', '题库列表') });
    }
    // 练习册是学员能力（repo:book）；管理员不自动拥有，只有显式勾选的角色才显示
    if (allow(PERMISSION_CODES.repoBook)) {
      repoChildren.push({ key: '/repo/book', label: t('menu.repo.book', '练习册') });
    }
    if (repoChildren.length > 0) {
      menu.push({ key: '/repo', icon: <DatabaseOutlined />, label: t('menu.repo', '题库中心'), children: repoChildren });
    }

    // 系统管理：4 项（用户与权限 / 系统设置 / 公告管理 / 操作日志）。
    // 原来 5 项：用户、用户组、系统设置、权限配置、日志——前三个合并成「用户与权限」一页三 Tab。
    const systemChildren: NonNullable<MenuProps['items']> = [];
    if (
      allow(PERMISSION_CODES.systemUserList) ||
      allow(PERMISSION_CODES.systemRoleList) ||
      allow(PERMISSION_CODES.systemDeptList)
    ) {
      systemChildren.push({ key: '/system/access', label: '用户与权限' });
    }
    if (allow(PERMISSION_CODES.systemRoleList)) {
      systemChildren.push({ key: '/system/setting', label: t('menu.system.setting', '系统设置') });
    }
    // 公告管理：管理员发全站（notice:manage:system），老师发自己带的班（notice:manage:class）
    if (allow(PERMISSION_CODES.noticeManageSystem) || allow(PERMISSION_CODES.noticeManageClass)) {
      systemChildren.push({ key: '/system/notice', label: '公告管理' });
    }
    if (allow(PERMISSION_CODES.systemLogList)) systemChildren.push({ key: '/system/audit', label: t('menu.system.audit', '操作日志') });
    if (systemChildren.length > 0) {
      menu.push({ key: '/system', icon: <SettingOutlined />, label: t('menu.system', '系统管理'), children: systemChildren });
    }

    // 注意：这里**不再**给「没有角色的用户」强塞「我的练习」。
    // 之前那段兜底会和 router.tsx 的 exercise:list 守卫打架：菜单能点、进去 403。
    // 真正的兜底是：给用户配一个角色（学员预设），而不是在界面上假装他有权限。
    return menu;
  }, [user]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const siderWidth = 208;
  // AI 悬浮入口的显示条件（两条都要）：
  // 1. 账号有 ai:use（admin / teacher 默认有，学员没有——学员侧的 AI 只有答题解析）；
  // 2. 系统设置里 AI 总开关是开着的（/api/system 的 aiEnabled）——停用后按钮直接不出现，
  //    而不是出现一个点开就说「未启用」的按钮。
  const canUseAi = can(authorities, PERMISSION_CODES.aiUse) && system?.aiEnabled !== false;

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {!isMobile && (
        <Sider
          breakpoint="md"
          collapsedWidth={0}
          trigger={null}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme={mode}
          width={siderWidth}
          style={{
            background: 'var(--bp-nav)',
            borderRight: '1px solid var(--bp-line-soft)',
          }}
        >
          <div
            style={{
              height: 56,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: collapsed ? '0 0 0 18px' : '0 16px',
              borderBottom: '1px solid var(--bp-line-soft)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {system?.avatar ? (
              <img
                src={system.avatar}
                alt=""
                style={{ width: 20, height: 20, objectFit: 'contain', flex: '0 0 auto' }}
              />
            ) : (
              <span
                style={{
                  width: 18,
                  height: 18,
                  border: '1px solid var(--bp-text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  flex: '0 0 auto',
                }}
              >
                {(system?.name || '云课堂').slice(0, 1)}
              </span>
            )}
            {!collapsed && (
              <span
                className="bp-title"
                style={{ fontSize: 12, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {system?.name || '旭日云课堂'}
              </span>
            )}
          </div>
          <Menu
            mode="inline"
            theme={mode}
            items={items}
            selectedKeys={[location.pathname]}
            defaultOpenKeys={['/repo', '/system']}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', borderInlineEnd: 0 }}
          />
        </Sider>
      )}

      {/*
        AI 助手（右下角悬浮对话框）：挂在布局里而不是每页各写一份，所以换页时对话历史不丢、
        上下文自动跟着路由变。provider 放在这一层，是因为它是「全站唯一一份状态」的宿主
        （见 components/AiAssistant/AiAssistantContext.tsx）。
      */}
      {canUseAi && (
        <AiAssistantProvider>
          <AiAssistantFloat isMobile={isMobile} />
        </AiAssistantProvider>
      )}

      <Layout style={{ background: 'transparent' }}>
        <Header
          style={{
            background: 'var(--bp-nav)',
            height: 56,
            lineHeight: '56px',
            padding: isMobile ? '0 14px' : '0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--bp-line-soft)',
          }}
        >
          {isMobile ? (
            <span
              className="bp-title"
              style={{
                fontSize: 13,
                letterSpacing: '0.08em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {system?.name || '旭日云课堂'}
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Button
                type="text"
                size="small"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                aria-label={collapsed ? '展开侧栏菜单' : '收起侧栏菜单'}
                title={collapsed ? '展开侧栏菜单' : '收起侧栏菜单'}
                onClick={() => setCollapsed((c) => !c)}
              />
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: 'var(--bp-text-soft)',
                  textTransform: 'uppercase',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {location.pathname.replace(/^\//, '').replace(/\//g, ' / ') || 'dashboard'}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
            {/* 公告铃铛：未读数走 60 秒轮询 + window focus 立即刷新（实施计划 4.6） */}
            <NoticeBell authorities={authorities} />
            <ZoomControl value={zoom} onChange={changeZoom} hideLabel={isMobile} />
            <Button
              type="text"
              size="small"
              aria-label={mode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
              title={mode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
              icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={changeTheme}
            />
            <Dropdown
              menu={{
                items: [
                  { key: 'account', icon: <UserOutlined />, label: t('menu.account', '账号设置') },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: t('menu.logout', '退出登录') },
                ],
                onClick: async ({ key }) => {
                  if (key === 'logout') {
                    await logout().catch(() => undefined);
                    // 清掉权限缓存并广播给其它标签页，避免下一位登录者继承当前账号的菜单/按钮
                    notifyAuthChanged();
                    navigate('/user/login', { replace: true });
                  } else {
                    navigate('/account/settings');
                  }
                },
              }}
            >
              <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Avatar style={{ background: 'var(--bp-blue-weak)', border: '1px solid var(--bp-line)' }} src={user?.avatar || undefined}>
                  {(user?.name || user?.userId || '?').slice(0, 1).toUpperCase()}
                </Avatar>
                {!isMobile && <span style={{ fontSize: 12 }}>{user?.name || user?.userId}</span>}
              </span>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={
            isMobile
              ? {
                  margin: '12px 12px 0',
                  paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 12px)',
                }
              : { margin: 16, paddingBottom: 8 }
          }
        >
          {/**
           * 这里原来挂着 UpdateBanner（「发现新版本」横幅），按实施计划 4.1 / 4.7 撤掉：
           * 更新检查发现新版本后由后端写成一条 type=system_update 的公告，
           * 管理员在公告中心里查看与归档，不再单独渲染一条独立提示。
           */}
          <Outlet context={{ user, system }} />
        </Content>
      </Layout>
      {isMobile && <MobileTabBar authorities={authorities} />}
    </Layout>
  );
}
