import { useEffect, useMemo, useState } from 'react';
import { Avatar, Dropdown, Layout, Menu, Spin } from 'antd';
import {
  DatabaseOutlined,
  FormOutlined,
  HomeOutlined,
  LogoutOutlined,
  ProjectOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, getSystem, logout } from '../api';
import type { SystemInfo, UserInfo } from '../api';
import { t } from '../i18n';

const { Header, Sider, Content } = Layout;

export default function BasicLayout() {
  const [user, setUser] = useState<UserInfo>();
  const [system, setSystem] = useState<SystemInfo>();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    Promise.all([getCurrentUser(), getSystem().catch(() => undefined)])
      .then(([u, s]) => {
        setUser(u);
        setSystem(s);
        document.title = s?.name || 'SurveyKing';
      })
      .catch(() => navigate('/user/login', { replace: true }))
      .finally(() => setLoading(false));
  }, [navigate]);

  const items = useMemo(
    () => [
      { key: '/home', icon: <HomeOutlined />, label: t('menu.home', '首页') },
      { key: '/project', icon: <ProjectOutlined />, label: t('menu.project', '我的项目') },
      { key: '/exercise', icon: <FormOutlined />, label: t('menu.exercise', '我的练习') },
      {
        key: '/repo',
        icon: <DatabaseOutlined />,
        label: t('menu.repo', '题库中心'),
        children: [
          { key: '/repo/index', label: t('menu.repo.list', '题库列表') },
          { key: '/repo/book', label: t('menu.repo.book', '练习册') },
        ],
      },
      {
        key: '/system',
        icon: <SettingOutlined />,
        label: t('menu.system', '系统管理'),
        children: [
          { key: '/system/user', label: t('menu.system.user', '用户管理') },
          { key: '/system/setting', label: t('menu.system.setting', '系统设置') },
        ],
      },
    ],
    [],
  );

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
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={siderWidth}
        style={{
          background: 'rgba(21,42,68,0.92)',
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
          <span
            style={{
              width: 18,
              height: 18,
              border: '1px solid #fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              flex: '0 0 auto',
            }}
          >
            SK
          </span>
          {!collapsed && (
            <span
              className="bp-title"
              style={{ fontSize: 12, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {system?.name || 'SurveyKing'}
            </span>
          )}
        </div>
        <Menu
          mode="inline"
          theme="dark"
          items={items}
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['/repo', '/system']}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderInlineEnd: 0 }}
        />
      </Sider>

      <Layout style={{ background: 'transparent' }}>
        <Header
          style={{
            background: 'rgba(21,42,68,0.92)',
            height: 56,
            lineHeight: '56px',
            padding: '0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--bp-line-soft)',
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              color: 'var(--bp-text-soft)',
              textTransform: 'uppercase',
            }}
          >
            {location.pathname.replace(/^\//, '').replace(/\//g, ' / ') || 'dashboard'}
          </span>
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
              <Avatar
                size={22}
                shape="square"
                style={{ background: 'rgba(74,144,217,0.25)', border: '1px solid var(--bp-line)' }}
              >
                {(user?.name || user?.userId || '?').slice(0, 1).toUpperCase()}
              </Avatar>
              <span style={{ fontSize: 12 }}>{user?.name || user?.userId}</span>
            </span>
          </Dropdown>
        </Header>

        <Content style={{ margin: 16, paddingBottom: 8 }}>
          <Outlet context={{ user, system }} />
        </Content>
      </Layout>
    </Layout>
  );
}
