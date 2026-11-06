import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Dropdown, Layout, Menu, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  DatabaseOutlined,
  FormOutlined,
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
import ZoomControl from '../components/ZoomControl';
import { t } from '../i18n';
import { useThemeMode } from '../theme/ThemeProvider';
import MobileTabBar from './MobileTabBar';

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
  const { mode, toggle } = useThemeMode();
  // 页面缩放：整体放大，方便年长老师看清。默认 1.1 而不是 1：基准字号已经提到 15，
  // 再叠一档 110% 才是中老年学员实际能轻松读的尺寸，用户自己改过就尊重用户的值。
  const [zoom, setZoom] = useState<number>(() => Number(localStorage.getItem('sk-zoom')) || 1.1);
  useEffect(() => {
    document.documentElement.style.zoom = String(zoom);
    localStorage.setItem('sk-zoom', String(zoom));
  }, [zoom]);

  useEffect(() => {
    Promise.all([getCurrentUser(), getSystem().catch(() => undefined)])
      .then(([u, s]) => {
        setUser(u);
        setSystem(s);
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
    const has = (prefix: string) => isAdmin || authorities.some((a) => a.startsWith(prefix));

    const menu: NonNullable<MenuProps['items']> = [{ key: '/home', icon: <HomeOutlined />, label: t('menu.home', '首页') }];

    if (has('project:')) {
      menu.push({ key: '/project', icon: <ProjectOutlined />, label: t('menu.project', '我的考试') });
    }
    // 管理员不做题，练习入口只给老师/学员
    if (has('exercise:') && !isAdmin) {
      menu.push({ key: '/exercise', icon: <FormOutlined />, label: t('menu.exercise', '我的练习') });
    }
    if (has('repo:')) {
      menu.push({
        key: '/repo',
        icon: <DatabaseOutlined />,
        label: t('menu.repo', '题库中心'),
        children: [
          { key: '/repo/index', label: t('menu.repo.list', '题库列表') },
          ...(isAdmin ? [] : [{ key: '/repo/book', label: t('menu.repo.book', '练习册') }]),
        ],
      });
    }
    if (has('system:')) {
      menu.push({
        key: '/system',
        icon: <SettingOutlined />,
        label: t('menu.system', '系统管理'),
        children: [
          { key: '/system/user', label: t('menu.system.user', '用户管理') },
          { key: '/system/group', label: t('menu.system.group', '用户组') },
          { key: '/system/setting', label: t('menu.system.setting', '系统设置') },
          { key: '/system/permissions', label: t('menu.system.permissions', '权限配置') },
          { key: '/system/audit', label: t('menu.system.audit', '操作日志') },
        ],
      });
    }

    // 学员账号（无任何角色）至少能看到「我的练习」，否则登录后是一片空白
    if (!isAdmin && !menu.some((m) => m?.key === '/exercise')) {
      menu.push({ key: '/exercise', icon: <FormOutlined />, label: t('menu.exercise', '我的练习') });
    }
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
            <ZoomControl value={zoom} onChange={setZoom} hideLabel={isMobile} />
            <Button
              type="text"
              size="small"
              aria-label={mode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
              title={mode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
              icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggle}
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
          <Outlet context={{ user, system }} />
        </Content>
      </Layout>
      {isMobile && <MobileTabBar authorities={authorities} />}
    </Layout>
  );
}
