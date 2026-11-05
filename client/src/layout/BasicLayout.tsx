import { useEffect, useMemo, useState } from 'react';
import { Avatar, Dropdown, Layout, Menu, Spin } from 'antd';
import {
  CopyOutlined,
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
          { key: '/repo/template', label: t('menu.repo.template', '题库模板') },
        ],
      },
      { key: '/template', icon: <CopyOutlined />, label: t('menu.template', '模板广场') },
      {
        key: '/system',
        icon: <SettingOutlined />,
        label: t('menu.system', '系统管理'),
        children: [
          { key: '/system/user', label: t('menu.system.user', '用户管理') },
          { key: '/system/role', label: t('menu.system.role', '角色管理') },
          { key: '/system/dept', label: t('menu.system.dept', '部门管理') },
          { key: '/system/position', label: t('menu.system.position', '职务管理') },
          { key: '/system/dict', label: t('menu.system.dict', '数据字典') },
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light" width={208}>
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: collapsed ? 12 : 15,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {collapsed ? 'SK' : system?.name || 'SurveyKing'}
        </div>
        <Menu
          mode="inline"
          items={items}
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['/repo', '/system']}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            height: 56,
            lineHeight: '56px',
            padding: '0 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
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
              <Avatar size="small" src={user?.avatar ? `/api/public/preview/${user.avatar}` : undefined} />
              {user?.name || user?.userId}
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16 }}>
          <Outlet context={{ user, system }} />
        </Content>
      </Layout>
    </Layout>
  );
}
