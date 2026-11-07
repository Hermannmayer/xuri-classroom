import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import LinkAction from '../../components/LinkAction';
import { get, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';

interface Dept {
  id: string;
  name: string;
  parentId?: string;
  roleIds?: string[];
  roleNames?: string[];
  validFrom?: string;
  validTo?: string;
  children?: Dept[];
}

interface Role {
  id: string;
  name?: string;
  code?: string;
}

/**
 * 用户组（班级）管理。
 *
 * 设计要点（见 docs/permissions-ia.md）：
 * - 组只负责「是哪批人 + 拥有哪些角色 + 有效期」，**不直接挂权限串**；
 *   权限点挂在角色上，在「权限配置」页维护。
 * - 有效期为空表示永久；过期后组员无法登录（后端在鉴权链路校验）。
 * - 组树默认全部展开，避免层数一多就找不到班级。
 */
function buildTree(list: Dept[]): Dept[] {
  const map = new Map<string, Dept & { children: Dept[] }>();
  list.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: Dept[] = [];
  map.forEach((node) => {
    const parent = node.parentId ? map.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function flattenDepts(list: Dept[], depth = 0): { id: string; name: string; depth: number }[] {
  return list.flatMap((d) => [{ id: d.id, name: d.name, depth }, ...flattenDepts(d.children ?? [], depth + 1)]);
}

function collectIds(list: Dept[]): string[] {
  return list.flatMap((d) => [d.id, ...collectIds(d.children ?? [])]);
}

/** 有效期展示：空=永久；只填开始=从某时起永久；只填结束=截止到某时 */
function validityText(from?: string, to?: string): string {
  const fmt = (v?: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '');
  if (!from && !to) return '永久有效';
  if (from && !to) return `${fmt(from)} 起 · 永久`;
  if (!from && to) return `截至 ${fmt(to)}`;
  return `${fmt(from)} ~ ${fmt(to)}`;
}

function isExpired(to?: string): boolean {
  return Boolean(to && dayjs(to).endOf('day').isBefore(dayjs()));
}

/** 角色选中是否真的变了：只有用户动过选择才提交 roleIds，避免把「没读到」当成「清空」 */
function sameIds(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export default function SystemGroup() {
  const [tree, setTree] = useState<Dept[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  // 打开编辑弹窗时该组已有的角色，用于判断用户是否真的改动了角色选择
  const [originalRoleIds, setOriginalRoleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{
    name: string;
    parentId?: string;
    roleIds?: string[];
    validity?: [Dayjs, Dayjs] | undefined;
  }>();

  /** 按钮级权限：列表由 system:dept:list 守卫，这里管新建/编辑/删除 */
  const [authorities, setAuthorities] = useState<string[]>([]);
  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  const canCreate = can(authorities, 'system:dept:create');
  const canUpdate = can(authorities, 'system:dept:update');
  const canDelete = can(authorities, 'system:dept:delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await get<Dept[]>('/api/system/dept/list');
      setTree(buildTree(Array.isArray(list) ? list : []));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    get<{ list?: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 })
      .then((res) => setRoles(res?.list ?? []))
      .catch(() => setRoles([]));
  }, [load]);

  /** 默认展开全部：组树不应折叠，否则多层班级找不到 */
  const allKeys = useMemo(() => collectIds(tree), [tree]);

  const openCreate = (parent?: Dept) => {
    setEditing(null);
    setOriginalRoleIds([]);
    form.resetFields();
    if (parent) form.setFieldsValue({ parentId: parent.id });
    setOpen(true);
  };

  const openEdit = (row: Dept) => {
    setEditing(row);
    setOriginalRoleIds(row.roleIds ?? []);
    form.setFieldsValue({
      name: row.name,
      parentId: row.parentId,
      roleIds: row.roleIds ?? [],
      validity:
        row.validFrom || row.validTo
          ? [row.validFrom ? dayjs(row.validFrom) : dayjs(0), row.validTo ? dayjs(row.validTo) : dayjs('2099-12-31')]
          : undefined,
    });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    const [from, to] = values.validity ?? [];
    const nextRoleIds = values.roleIds ?? [];
    /**
     * roleIds 只在用户真的改过勾选时才提交（后端约定：不传=不动角色，传空数组=清空）。
     * 这样即使列表因缓存/并发读到了旧值，改个名字也不会顺手把组绑定的角色清掉。
     */
    const roleIdsUnchanged = Boolean(editing) && sameIds(nextRoleIds, originalRoleIds);
    const payload = {
      name: values.name,
      parentId: values.parentId,
      ...(roleIdsUnchanged ? {} : { roleIds: nextRoleIds }),
      validFrom: from ? from.startOf('day').toISOString() : null,
      validTo: to ? to.endOf('day').toISOString() : null,
    };
    setSaving(true);
    try {
      if (editing) {
        await post('/api/system/dept/update', { id: editing.id, ...payload });
        message.success('已保存；组内成员下次登录时按新配置生效');
      } else {
        await post('/api/system/dept/create', payload);
        message.success('已创建');
      }
      setOpen(false);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Dept) => {
    try {
      await post('/api/system/dept/delete', { id: row.id });
      message.success('已删除');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  /** 桌面端「操作」列：三个动作都没权限时整列不渲染 */
  const opsColumn: ColumnsType<Dept>[number] = {
    title: '操作',
    key: 'ops',
    width: 200,
    render: (_, row) => (
      <Space size={12}>
        {canCreate && <LinkAction onClick={() => openCreate(row)}>加子组</LinkAction>}
        {canUpdate && <LinkAction onClick={() => openEdit(row)}>编辑</LinkAction>}
        {canDelete && (
          <Popconfirm
            title={`删除「${row.name}」？`}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => remove(row)}
          >
            <LinkAction style={{ color: 'var(--bp-orange)' }}>删除</LinkAction>
          </Popconfirm>
        )}
      </Space>
    ),
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>GROUP / 用户组</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            班级与分组
          </div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
            组决定「哪些人 + 拥有哪些角色 + 有效期」；组内成员的最终权限 = 直挂角色 ∪ 组链上绑定的角色，
            具体权限点在「权限配置」里按角色维护（旧的组级权限串机制已下线）。
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()} />
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
            新建分组
          </Button>
        )}
      </div>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)' }}>
        <Table<Dept>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={tree}
          pagination={false}
          expandable={{ defaultExpandAllRows: true, expandedRowKeys: allKeys, indentSize: 18 }}
          columns={[
            {
              title: '名称',
              dataIndex: 'name',
              render: (v: string) => <span style={{ fontSize: 13 }}>{v || '—'}</span>,
            },
            {
              title: '角色',
              dataIndex: 'roleNames',
              width: 260,
              render: (names?: string[]) =>
                names && names.length ? (
                  <Space size={4} wrap>
                    {names.map((n) => (
                      <Tag key={n} color="blue">
                        {n}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>未分配角色</span>
                ),
            },
            {
              title: '有效期',
              key: 'validity',
              width: 210,
              render: (_, row) => (
                <span
                  style={{
                    fontSize: 12,
                    color: isExpired(row.validTo) ? 'var(--bp-orange)' : 'var(--bp-text-soft)',
                  }}
                >
                  {validityText(row.validFrom, row.validTo)}
                  {isExpired(row.validTo) && ' （已过期）'}
                </span>
              ),
            },
            ...(canCreate || canUpdate || canDelete ? [opsColumn] : []),
          ]}
        />
      </Card>

      <Modal
        width={640}
        title={editing ? '编辑分组' : '新建分组'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" requiredMark={false}>
          <Form.Item name="name" label="分组名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：育婴五级 2026 春季班" />
          </Form.Item>
          <Form.Item name="parentId" label="上级分组" extra="留空表示顶层">
            <Select
              allowClear
              placeholder="顶层（不选）"
              options={flattenDepts(tree)
                .filter((d) => d.id !== editing?.id)
                .map((d) => ({ value: d.id, label: `${'　'.repeat(d.depth)}${d.name}` }))}
            />
          </Form.Item>
          <Form.Item name="roleIds" label="本组角色" extra="组内成员（含子组）自动获得这些角色的权限；权限点请在「权限配置」里维护">
            <Select
              mode="multiple"
              allowClear
              placeholder="选择角色（可多选）"
              optionFilterProp="label"
              options={roles.map((r) => ({ value: r.id, label: r.name ?? r.code ?? r.id }))}
            />
          </Form.Item>
          <Form.Item name="validity" label="有效期" extra="留空=永久有效；过期后组内成员无法登录">
            <DatePicker.RangePicker style={{ width: '100%' }} allowEmpty={[true, true]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
