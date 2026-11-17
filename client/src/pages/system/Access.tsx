import { useEffect, useState } from 'react';
import { Alert, Card, Result, Spin, Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import SystemUser from './User';
import SystemPermissions from './Permissions';
import SystemGroup from './Group';

type TabKey = 'user' | 'role' | 'group';

const TAB_ORDER: TabKey[] = ['user', 'role', 'group'];

const TAB_PERMISSION: Record<TabKey, string> = {
  user: PERMISSION_CODES.systemUserList,
  role: PERMISSION_CODES.systemRoleList,
  group: PERMISSION_CODES.systemDeptList,
};

const TAB_LABEL: Record<TabKey, string> = {
  user: '用户',
  role: '权限配置',
  group: '用户组',
};

/**
 * 用户与权限：把原来三个独立菜单（用户管理 / 权限配置 / 用户组）合成一页三个 Tab。
 *
 * <p>为什么合并：这三件事本来就是同一件事的三个切面——「有哪些人」「他们被授了什么角色」
 * 「角色在哪个组」；分三页的直接后果是管理员改一个老师要跳三次页，且侧栏常驻 5 项，
 * 把真正高频的「系统设置」「公告」「日志」挤在一起。
 *
 * <p>权限没有放松：Tab 逐个按自己的权限点判定，只保留当前账号真能看的 Tab；
 * 一个都没有时直接给 403 结果页（而不是渲染一个空壳）。
 *
 * <p>子页一律以 embedded 传入：页头统一由这里给（一个页面只该有一个标题），
 * 子页自己那份「SYSTEM / 教职工」之类的小标题会和外层打架。
 */
export default function SystemAccess() {
  const [authorities, setAuthorities] = useState<string[]>();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');

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

  const tabs = TAB_ORDER.filter((key) => can(authorities, TAB_PERMISSION[key]));
  if (tabs.length === 0) {
    return <Result status="403" title="没有访问权限" subTitle="当前账号没有用户、角色或用户组的管理权限。" />;
  }
  /** ?tab= 只认这三个键；乱值（手敲的、旧链接的）一律按「用户」处理 */
  const asked: TabKey = TAB_ORDER.includes((requested ?? '') as TabKey) ? ((requested ?? '') as TabKey) : 'user';
  const active: TabKey = tabs.includes(asked) ? asked : tabs[0];
  /**
   * 明确从链接点进来、但那个页签自己没权限时，不要静默跳到别的 Tab：
   * 用户会以为「权限配置」坏了。说清原因，再切到第一个能看的。
   */
  const denied = requested && TAB_ORDER.includes(asked) && !tabs.includes(asked) ? asked : undefined;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>SYSTEM / 用户与权限</div>
        <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
          用户与权限
        </div>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
          用户管账号，权限配置管角色能做什么，用户组管教职工的组织归属；三处改的是同一套人。
        </div>
      </div>
      {denied && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={'没有「' + TAB_LABEL[denied] + '」的访问权限，已切到「' + TAB_LABEL[active] + '」'}
          description="需要管理员在「权限配置」里给当前角色补上对应权限点，重新登录后生效。"
        />
      )}
      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}>
        <Tabs
          activeKey={active}
          onChange={(key) => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', key);
            setSearchParams(next, { replace: true });
          }}
          items={tabs.map((key) => ({
            key,
            label: TAB_LABEL[key],
            children:
              key === 'user' ? (
                <SystemUser embedded />
              ) : key === 'role' ? (
                <SystemPermissions embedded />
              ) : (
                <SystemGroup embedded />
              ),
          }))}
        />
      </Card>
    </div>
  );
}
