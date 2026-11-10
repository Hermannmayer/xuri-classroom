import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, message, Modal, Popconfirm, Segmented, Select, Table, Tag, TreeSelect } from 'antd';
import { PlusOutlined, TeamOutlined } from '@ant-design/icons';
import LinkAction from '../../components/LinkAction';
import { get, getWithPagination, post } from '../../api';
import type { UserInfo } from '../../api';

interface Partner {
  id: string;
  userId?: string;
  userName?: string;
  groupId?: string;
  type?: number;
  status?: number;
  /** 1 查看 / 2 编辑（含查看）/ 3 授权（含查看+编辑）；班级授权为空 */
  accessLevel?: number;
}

/** 老师授权级别：3 同时包含 1 和 2 */
const LEVEL_OPTIONS = [
  { value: 1, label: '1 · 可查看' },
  { value: 2, label: '2 · 可编辑（含查看）' },
  { value: 3, label: '3 · 可授权（含查看+编辑）' },
];
const LEVEL_SHORT_OPTIONS = [
  { value: 1, label: '可查看' },
  { value: 2, label: '可编辑' },
  { value: 3, label: '可授权' },
];
const levelText = (level?: number) =>
  level === 3 ? '可授权' : level === 1 ? '可查看' : '可编辑';
const levelColor = (level?: number) => (level === 3 ? 'green' : level === 1 ? 'default' : 'blue');

interface SysUser {
  userId: string;
  name?: string;
  username?: string;
  /** 所属组名，用于在协作者选择框里区分同名的人（后端 selectUser 会带回来） */
  deptName?: string;
}

interface Dept {
  id: string;
  name: string;
  /** org=用户组（教师工作部）/ class=班级 */
  deptType?: 'org' | 'class';
  /** 后端 /api/system/dept/list 返回的是树，这里补上子节点 */
  children?: Dept[];
}

type CollabMode = 'user' | 'group';

/**
 * 协作 + 授权：一份考试/问卷可以
 * 1) 加协作者（type=2，能编辑题目、看数据）
 * 2) 授权给班级（type=3 + group_id，该班学员在「我的考试」里能看到这份卷子）
 *
 * 匿名答题不受这里影响：公开链接 /s/:id 任何人都能答。
 */
export default function PartnerPanel({
  projectId,
  canManage = false,
}: {
  projectId: string;
  /** project:partner：没有这个权限时只读（不渲染添加/授权/移除，只能看名单） */
  canManage?: boolean;
}) {
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [depts, setDepts] = useState<Dept[]>([]);

  const [collabOpen, setCollabOpen] = useState(false);
  const [users, setUsers] = useState<SysUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [collabMode, setCollabMode] = useState<CollabMode>('user');
  const [teacherGroups, setTeacherGroups] = useState<Dept[]>([]);
  const [collabGroup, setCollabGroup] = useState<string>();

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantDept, setGrantDept] = useState<string>();

  const [saving, setSaving] = useState(false);
  /** 新增协作者时的授权级别，默认 2（可编辑） */
  const [collabLevel, setCollabLevel] = useState(2);
  const [myId, setMyId] = useState<string>();
  const [updatingId, setUpdatingId] = useState<string>();

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getWithPagination<Partner>('/api/project/partner/list', {
        projectId,
        current: 1,
        pageSize: 100,
      });
      setRows(res.data.filter((item) => item.type === 2 || item.type === 3 || item.type === undefined));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    get<Dept[]>('/api/system/dept/list')
      .then((list) => setDepts(Array.isArray(list) ? list : []))
      .catch(() => undefined);
    // 教师工作部/用户组：只取 org，避免把班级当教师组授权
    get<Dept[]>('/api/system/dept/list', { deptType: 'org' })
      .then((list) => setTeacherGroups(Array.isArray(list) ? list : []))
      .catch(() => setTeacherGroups([]));
  }, [load]);

  // 判断「我」在这份考试里的级别：level3 才能继续授权；owner/admin 没有协作者行，视为全量
  useEffect(() => {
    void get<UserInfo>('/api/currentUser')
      .then((user) => setMyId(user.userId))
      .catch(() => undefined);
  }, []);

  const myPartner = rows.find((row) => row.type === 2 && row.userId && myId && row.userId === myId);
  const myLevel = myPartner?.accessLevel;
  const canWrite = canManage && (myLevel === undefined || myLevel >= 3);

  const openCollab = async () => {
    setCollabOpen(true);
    setSelectedUsers([]);
    setCollabMode('user');
    setCollabGroup(undefined);
    setCollabLevel(2);
    try {
      // 改用 /api/project/selectUser 并带上 collaboratorOnly：
      // 后端只返回「具备协作权限（默认 project:create）」的账号，学员不会再被列进来；
      // 这个接口对老师也开放（/api/system/user/list 需要 system:user:list，老师没有）。
      const list = await post<SysUser[]>('/api/project/selectUser', { collaboratorOnly: true });
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const addCollab = async () => {
    if (collabMode === 'group') {
      if (!collabGroup) {
        message.warning('先选一个教师组');
        return;
      }
    } else if (selectedUsers.length === 0) {
      message.warning('先选要添加的人');
      return;
    }
    setSaving(true);
    try {
      if (collabMode === 'group') {
        await post('/api/project/partner/create', {
          projectId,
          type: 2,
          groupId: collabGroup,
          accessLevel: collabLevel,
        });
        message.success(`已添加教师组（${levelText(collabLevel)}）`);
      } else {
        await post('/api/project/partner/create', {
          projectId,
          type: 2,
          userIds: selectedUsers,
          accessLevel: collabLevel,
        });
        message.success(`已添加 ${selectedUsers.length} 位协作者（${levelText(collabLevel)}）`);
      }
      setCollabOpen(false);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addGrant = async () => {
    if (!grantDept) {
      message.warning('先选一个班级');
      return;
    }
    setSaving(true);
    try {
      await post('/api/project/partner/create', { projectId, type: 3, groupId: grantDept });
      message.success('已授权给该班级，组内学员可在「我的考试」看到这份卷子');
      setGrantOpen(false);
      setGrantDept(undefined);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateLevel = async (row: Partner, accessLevel: number) => {
    if (!row.id || updatingId) return;
    setUpdatingId(row.id);
    try {
      await post('/api/project/partner/update', { projectId, id: row.id, accessLevel });
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, accessLevel } : item)));
      message.success('已更新授权级别');
    } catch (e) {
      message.error((e as Error).message);
      await load();
    } finally {
      setUpdatingId(undefined);
    }
  };

  const remove = async (row: Partner) => {
    try {
      await post('/api/project/partner/delete', { ids: [row.id] });
      message.success('已移除');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const deptName = (id?: string) => depts.find((d) => d.id === id)?.name ?? '未知班级';

  const groupTreeData = (list: Dept[]): { value: string; title: string; children?: any[] }[] =>
    list.map((dept) => ({
      value: dept.id,
      title: dept.name,
      children: dept.children && dept.children.length ? groupTreeData(dept.children) : undefined,
    }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', flex: 1, minWidth: 200 }}>
          协作者级别：1 可查看 / 2 可编辑（含查看）/ 3 可授权（含查看+编辑）；授权班级后该班学员能在「我的考试」里看到。
          公开链接仍然任何人都能答。
        </div>
        {canWrite && (
          <>
            <Button size="small" icon={<TeamOutlined />} onClick={() => setGrantOpen(true)}>
              授权给班级
            </Button>
            <Button size="small" icon={<PlusOutlined />} onClick={openCollab}>
              添加协作者
            </Button>
          </>
        )}
      </div>

      {!canManage && (
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
          只读：没有「协作者与班级授权」（project:partner）权限，只能查看名单。
        </div>
      )}
      {canManage && !canWrite && (
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
          当前授权级别为「{levelText(myLevel)}」，只有「可授权」级别可以管理协作者和班级授权。
        </div>
      )}

      <Table<Partner>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: <Empty description="还没有协作者或班级授权" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        columns={[
          {
            title: '对象',
            key: 'target',
            render: (_, row) => {
              if (row.groupId && row.type === 3) return `班级：${deptName(row.groupId)}`;
              if (row.groupId) return `教师组：${deptName(row.groupId)}`;
              return row.userName || row.userId || '—';
            },
          },
          {
            title: '角色',
            key: 'type',
            width: 120,
            render: (_, row) =>
              row.groupId && row.type === 3 ? (
                <Tag color="orange">班级可见</Tag>
              ) : row.groupId ? (
                <Tag color="purple">教师组</Tag>
              ) : (
                <Tag color="blue">协作者</Tag>
              ),
          },
          {
            title: '级别',
            key: 'level',
            width: 150,
            render: (_, row) => {
              if (row.groupId && row.type === 3) {
                return <span style={{ color: 'var(--bp-text-soft)' }}>—（班级无级别）</span>;
              }
              if (row.type !== 2) return '—';
              if (!canWrite) return <Tag color={levelColor(row.accessLevel)}>{levelText(row.accessLevel)}</Tag>;
              return (
                <Select
                  size="small"
                  style={{ width: 120 }}
                  value={row.accessLevel ?? 2}
                  options={LEVEL_SHORT_OPTIONS}
                  disabled={updatingId === row.id}
                  onChange={(value) => void updateLevel(row, value)}
                />
              );
            },
          },
          // 移除是 project:partner 的写操作：没权限时整列不渲染，避免「看得见、点了 403」
          ...(canWrite
            ? [
                {
                  title: '操作',
                  key: 'ops',
                  width: 80,
                  render: (_: unknown, row: Partner) => (
                    <Popconfirm
                      title="移除此授权？"
                      okText="移除"
                      cancelText="取消"
                      onConfirm={() => remove(row)}
                    >
                      <LinkAction style={{ color: 'var(--bp-orange)' }}>移除</LinkAction>
                    </Popconfirm>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        title="添加协作者"
        open={collabOpen}
        onCancel={() => setCollabOpen(false)}
        onOk={addCollab}
        confirmLoading={saving}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <Segmented<CollabMode>
          value={collabMode}
          onChange={(value: CollabMode) => setCollabMode(value)}
          options={[
            { label: '按老师', value: 'user' },
            { label: '按教师组', value: 'group' },
          ]}
          style={{ marginBottom: 10 }}
        />
        {collabMode === 'group' ? (
          <TreeSelect
            style={{ width: '100%' }}
            placeholder="选择教师工作部 / 用户组"
            value={collabGroup}
            onChange={setCollabGroup}
            treeData={groupTreeData(teacherGroups)}
            showSearch
            treeNodeFilterProp="title"
            treeDefaultExpandAll
            allowClear
            dropdownStyle={{ maxHeight: 420, overflow: 'auto' }}
          />
        ) : (
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="选择用户（可多选）"
            value={selectedUsers}
            onChange={setSelectedUsers}
            optionFilterProp="label"
            options={users.map((u) => ({
              value: u.userId,
              label: `${u.name || u.username || u.userId}${u.deptName ? ` · ${u.deptName}` : ''}`,
            }))}
          />
        )}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>授权级别</div>
          <Select
            style={{ width: '100%' }}
            value={collabLevel}
            onChange={setCollabLevel}
            options={LEVEL_OPTIONS}
          />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--bp-text-soft)' }}>
            3 = 可查看 + 可编辑 + 可授权；2 = 可查看 + 可编辑；1 = 仅可查看。只有 3 可以继续把这份考试授权给其他老师和班级。
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--bp-text-soft)' }}>
          按老师：只能添加管理员和老师（学员没有协作权限，不会出现在列表里）；按教师组：整组获得所选级别。
        </div>
      </Modal>

      <Modal
        title="授权给班级"
        open={grantOpen}
        onCancel={() => setGrantOpen(false)}
        onOk={addGrant}
        confirmLoading={saving}
        okText="授权"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
          授权后，该班级的学员登录后能在「我的考试」里看到这份卷子；未注册的人仍可通过公开链接作答。
        </div>
        <TreeSelect
          style={{ width: '100%' }}
          placeholder="选择班级 / 用户组"
          value={grantDept}
          onChange={setGrantDept}
          treeData={depts.map((d) => ({ value: d.id, title: d.name, children: d.children?.map((c) => ({ value: c.id, title: c.name })) }))}
          showSearch
          treeNodeFilterProp="title"
          treeDefaultExpandAll
          allowClear
          dropdownStyle={{ maxHeight: 420, overflow: 'auto' }}
        />
      </Modal>
    </div>
  );
}
