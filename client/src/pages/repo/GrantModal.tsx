import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Empty, Modal, Popconfirm, Segmented, Select, Spin, Table, Tag, TreeSelect } from 'antd';
import { get, getWithPagination, post } from '../../api';
import LinkAction from '../../components/LinkAction';

interface Dept {
  id: string;
  name: string;
  children?: Dept[];
}

/** 后端 RepoPartnerView：按组授权时 userId 为空，按个人授权时 deptId 为空 */
interface RepoPartnerView {
  id: string;
  userId?: string;
  user?: { userId?: string; name?: string; username?: string };
  deptId?: string;
  deptName?: string;
}

/**
 * 后端 /api/system/user/options（UserOptionView）：
 * 只返回 id / 姓名 / 账号 / 部门，不带手机号等敏感字段，老师也能读。
 */
interface UserOption {
  id: string;
  name?: string;
  username?: string;
  deptName?: string;
}

type GrantMode = 'dept' | 'user';

/**
 * 题库授权管理。
 *
 * 上半部分列出「已经授权给谁」并可取消，下半部分新增授权（按用户组或按个人）。
 * 后端：t_repo_partner 一条记录 = 一个组（dept_id）或一个人（user_id）；
 * 组授权靠 t_user.dept_id 自动继承，以后进组的人不需要重新授权。
 */
export default function GrantModal({
  repoId,
  repoIds,
  repoName,
  open,
  onClose,
  onChanged,
}: {
  repoId?: string;
  /** 批量授权：传多个题库 id 时，只做新增授权，不展示单个题库的授权名单 */
  repoIds?: string[];
  repoName?: string;
  open: boolean;
  onClose: () => void;
  /** 授权/取消成功后通知外层刷新列表（可选） */
  onChanged?: () => void;
}) {
  const { message } = App.useApp();
  /** 批量模式：对选中的每个题库依次授权 */
  const targets = repoIds && repoIds.length > 0 ? repoIds : repoId ? [repoId] : [];
  const isBatch = targets.length > 1;
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<RepoPartnerView[]>([]);
  const [mode, setMode] = useState<GrantMode>('dept');
  const [depts, setDepts] = useState<Dept[]>([]);
  const [deptError, setDeptError] = useState<string>();
  const [deptId, setDeptId] = useState<string>();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [userListError, setUserListError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string>();

  const loadPartners = useCallback(async () => {
    if (!repoId || isBatch) return;
    setLoading(true);
    try {
      const res = await getWithPagination<RepoPartnerView>('/api/repo/partner/list', {
        repoId,
        current: 1,
        pageSize: 100,
      });
      setPartners(res.data ?? []);
    } catch (e) {
      message.error((e as Error).message || '读取授权列表失败');
    } finally {
      setLoading(false);
    }
  }, [repoId, message]);

  useEffect(() => {
    if (!open) return;
    setDeptId(undefined);
    setUserIds([]);
    setMode('dept');
    void loadPartners();
    // 组树失败不能再静默：老师没有 system:dept:list 时会 403，界面需要说明原因而不是给个空树
    setDeptError(undefined);
    get<Dept[]>('/api/system/dept/list')
      .then((list) => {
        setDepts(list ?? []);
        setDeptError(undefined);
      })
      .catch((e: Error) => setDeptError(e.message || '没有权限读取用户组'));
  }, [open, loadPartners]);

  /**
   * 只有切到「按个人」时才拉用户候选项。
   *
   * 走 /api/system/user/options（UserOptionView：id/姓名/账号/部门），
   * 不再用需要 system:user:list 的 /api/system/user/list——老师没有系统用户权限，
   * 以前切到「按个人」直接 403、下拉永远是空的。失败时给出可读提示，不静默变空。
   */
  useEffect(() => {
    if (!open || mode !== 'user' || users.length > 0) return;
    setUsersLoading(true);
    setUserListError(undefined);
    get<UserOption[]>('/api/system/user/options')
      .then((list) => setUsers(list ?? []))
      .catch((e: Error) => setUserListError(e.message || '没有权限读取用户列表'))
      .finally(() => setUsersLoading(false));
  }, [open, mode, users.length]);

  const flattenDepts = (list: Dept[], depth = 0): { id: string; name: string; depth: number }[] =>
    list.flatMap((dept) => [
      { id: dept.id, name: dept.name, depth },
      ...flattenDepts(dept.children ?? [], depth + 1),
    ]);

  /** 树形数据：保留层级，group 多的时候靠树 + 搜索定位，不再靠缩进空格硬凑 */
  const deptTree = useMemo(() => {
    const toTree = (list: Dept[]): { value: string; title: string; children?: any[] }[] =>
      list.map((dept) => ({
        value: dept.id,
        title: dept.name,
        children: dept.children && dept.children.length ? toTree(dept.children) : undefined,
      }));
    return toTree(depts);
  }, [depts]);

  const grant = async () => {
    if (targets.length === 0) return;
    if (mode === 'dept' && !deptId) {
      message.warning('先选一个用户组');
      return;
    }
    if (mode === 'user' && userIds.length === 0) {
      message.warning('先选要授权的用户');
      return;
    }
    setSaving(true);
    let ok = 0;
    const failed: string[] = [];
    try {
      // 逐个题库授权：后端 /partner/create 一次只收一个 repoId，
      // 这里串行调用，失败不影响其它题库，最后汇总结果。
      for (const target of targets) {
        try {
          await post('/api/repo/partner/create', mode === 'dept' ? { repoId: target, deptId } : { repoId: target, userIds });
          ok += 1;
        } catch (e) {
          failed.push((e as Error).message);
        }
      }
      if (ok > 0) {
        message.success(
          isBatch
            ? `已授权 ${ok}/${targets.length} 个题库给${mode === 'dept' ? '该用户组' : ` ${userIds.length} 位用户`}`
            : mode === 'dept'
              ? '已授权该用户组，组内成员自动可见'
              : `已授权 ${userIds.length} 位用户`,
        );
      }
      if (failed.length > 0) {
        message.error(`${failed.length} 个题库授权失败：${failed[0]}`);
      }
      if (mode === 'user') setUserIds([]);
      else setDeptId(undefined);
      await loadPartners();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (row: RepoPartnerView) => {
    if (!repoId) return;
    setRemovingId(row.id);
    try {
      await post('/api/repo/partner/delete', { repoId, ids: [row.id] });
      message.success('已取消授权');
      await loadPartners();
      onChanged?.();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setRemovingId(undefined);
    }
  };

  const targetName = (row: RepoPartnerView) =>
    row.deptId ? row.deptName || row.deptId : row.user?.name || row.user?.username || row.userId || '—';

  return (
    <Modal
      title={isBatch ? `批量授权 ${targets.length} 个题库` : `授权管理${repoName ? `：${repoName}` : ''}`}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={760}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="按用户组授权后，组内成员自动可见；以后新加入该组的学员无需重新授权。"
      />

      <div className="bp-title" style={{ fontSize: 12, marginBottom: 8 }}>
        已授权（{partners.length}）
      </div>
      <Table<RepoPartnerView>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={partners}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="还没有授权给任何用户组或个人"
            />
          ),
        }}
        columns={[
          {
            title: '对象',
            key: 'target',
            render: (_: unknown, row) => <span style={{ fontSize: 13 }}>{targetName(row)}</span>,
          },
          {
            title: '类型',
            key: 'type',
            width: 100,
            render: (_: unknown, row) =>
              row.deptId ? <Tag color="orange">用户组</Tag> : <Tag color="blue">个人</Tag>,
          },
          {
            title: '操作',
            key: 'ops',
            width: 100,
            render: (_: unknown, row) => (
              <Popconfirm
                title="取消该授权？"
                description={
                  row.deptId
                    ? '取消后，该组成员将看不到这个题库（除非另有授权）。'
                    : '取消后，该用户将看不到这个题库。'
                }
                okText="取消授权"
                cancelText="再想想"
                onConfirm={() => revoke(row)}
              >
                <LinkAction style={{ color: 'var(--bp-orange)' }}>
                  {removingId === row.id ? '取消中…' : '取消授权'}
                </LinkAction>
              </Popconfirm>
            ),
          },
        ]}
      />

      <div className="bp-title" style={{ fontSize: 12, margin: '18px 0 8px' }}>
        新增授权
      </div>
      <Segmented<GrantMode>
        value={mode}
        onChange={(value) => setMode(value)}
        options={[
          { label: '按用户组', value: 'dept' },
          { label: '按个人', value: 'user' },
        ]}
        style={{ marginBottom: 10 }}
      />

      {mode === 'dept' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deptError && (
            <Alert
              type="warning"
              showIcon
              message="读不到用户组"
              description={`${deptError}；请确认 /api/system/dept/list 是否可用，或联系管理员给账号补上 org:list。`}
            />
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <TreeSelect
              style={{ flex: '1 1 260px', minWidth: 220 }}
              placeholder="选择用户组 / 班级"
              value={deptId}
              onChange={setDeptId}
              treeData={deptTree}
              showSearch
              treeNodeFilterProp="title"
              treeDefaultExpandAll
              allowClear
              dropdownStyle={{ maxHeight: 420, overflow: 'auto' }}
            />
            <Button type="primary" loading={saving} onClick={() => void grant()}>
              授权该用户组
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {userListError ? (
            <Alert
              type="warning"
              showIcon
              message="读不到用户候选项"
              description={`${userListError}；可以改用「按用户组」授权，或请管理员确认 /api/system/user/options 是否正常。`}
            />
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Select
                mode="multiple"
                style={{ flex: '1 1 320px', minWidth: 260 }}
                placeholder="选择用户（可多选）"
                value={userIds}
                onChange={setUserIds}
                showSearch
                optionFilterProp="label"
                maxTagCount={4}
                options={users.map((user) => ({
                  value: user.id,
                  label: `${user.name || user.username || user.id}${user.deptName ? ` · ${user.deptName}` : ''}`,
                }))}
                notFoundContent={usersLoading ? <Spin size="small" /> : users.length ? undefined : '没有可选用户'}
              />
              <Button type="primary" loading={saving} onClick={() => void grant()}>
                授权所选用户
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
