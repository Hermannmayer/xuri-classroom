/** 手机端系统首页：把设置、权限、用户、公告、审计收在一页，避免底栏单选深链。 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Result, Spin } from 'antd';
import {
  AuditOutlined,
  NotificationOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';

interface Entry {
  key: string;
  title: string;
  description: string;
  path: string;
  permissions: string[];
  icon: ReactNode;
}

const ENTRIES: Entry[] = [
  {
    key: 'setting',
    title: '系统设置',
    description: '站点信息、登录、内容、AI 与更新',
    path: '/system/setting',
    permissions: [PERMISSION_CODES.systemRoleList],
    icon: <SettingOutlined />,
  },
  {
    key: 'role',
    title: '权限配置',
    description: '角色能做什么、数据范围',
    path: '/system/access?tab=role',
    permissions: [PERMISSION_CODES.systemRoleList],
    icon: <SafetyCertificateOutlined />,
  },
  {
    key: 'user',
    title: '用户管理',
    description: '账号、状态、角色分配',
    path: '/system/access?tab=user',
    permissions: [PERMISSION_CODES.systemUserList],
    icon: <UserOutlined />,
  },
  {
    key: 'group',
    title: '用户组',
    description: '部门与教职工组织归属',
    path: '/system/access?tab=group',
    permissions: [PERMISSION_CODES.systemDeptList],
    icon: <TeamOutlined />,
  },
  {
    key: 'notice',
    title: '公告管理',
    description: '全站公告与班级公告',
    path: '/system/notice',
    permissions: [PERMISSION_CODES.noticeManageSystem, PERMISSION_CODES.noticeManageClass],
    icon: <NotificationOutlined />,
  },
  {
    key: 'audit',
    title: '操作日志',
    description: '登录、权限与数据变更记录',
    path: '/system/audit',
    permissions: [PERMISSION_CODES.systemLogList],
    icon: <AuditOutlined />,
  },
];

export default function SystemHome() {
  const navigate = useNavigate();
  const [authorities, setAuthorities] = useState<string[]>();

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  if (!authorities) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const entries = ENTRIES.filter((entry) => entry.permissions.some((permission) => can(authorities, permission)));
  if (entries.length === 0) {
    return <Result status="403" title="没有访问权限" subTitle="当前账号没有系统管理权限。" />;
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>SYSTEM / 系统管理</div>
        <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
          系统管理
        </h2>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
          按权限显示可用的管理入口。
        </div>
      </div>
      <div className="sk-system-grid">
        {entries.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className="sk-system-card"
            onClick={() => navigate(entry.path)}
            aria-label={entry.title}
          >
            <span className="sk-system-card-icon">{entry.icon}</span>
            <span className="sk-system-card-title">{entry.title}</span>
            <span className="sk-system-card-desc">{entry.description}</span>
            <span className="sk-system-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}