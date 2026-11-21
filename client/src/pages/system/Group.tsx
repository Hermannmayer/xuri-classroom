import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Empty, Form, Input, message, Modal, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import LinkAction from '../../components/LinkAction';
import DeleteDeptDialog from '../teaching/DeleteDeptDialog';
import { ApiError, get, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import { useIsMobile } from '../../hooks/useIsMobile';

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


interface RoleOption {
  id: string;
  name?: string;
  code?: string;
  status?: number;
}

/** 用户组（班级）管理 */
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

function flattenDeptNodes(list: Dept[], depth = 0): { node: Dept; depth: number }[] {
  return list.flatMap((node) => [{ node, depth }, ...flattenDeptNodes(node.children ?? [], depth + 1)]);
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

export default function SystemGroup({ embedded = false }: { embedded?: boolean } = {}) {
  const isMobile = useIsMobile();
  const [tree, setTree] = useState<Dept[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [roleError, setRoleError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);

  const [originalRoleIds, setOriginalRoleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Dept | null>(null);
  const [form] = Form.useForm<{
    name: string;
    parentId?: string;
    roleIds?: string[];
    validity?: [Dayjs, Dayjs] | undefined;
  }>();


  const [authorities, setAuthorities] = useState<string[]>([]);
  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  const canCreate = can(authorities, PERMISSION_CODES.systemDeptCreate);
  const canUpdate = can(authorities, PERMISSION_CODES.systemDeptUpdate);
  const canDelete = can(authorities, PERMISSION_CODES.systemDeptDelete);

  const roleDenied = roleError === '无权读取角色';

  const roleUnavailable = Boolean(roleError);

  const load = useCallback(async () => {
    setLoading(true);
    try {

      const list = await get<Dept[]>('/api/system/dept/list', { deptType: 'org' });
      setTree(buildTree(Array.isArray(list) ? list : []));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();


    get<RoleOption[]>('/api/system/role/options')
      .then((list) => {
        setRoles(Array.isArray(list) ? list : []);
        setRoleError(undefined);
      })
      .catch((e) => {
        setRoles([]);
        if (e instanceof ApiError && e.code === 403) {
          setRoleError('无权读取角色');
        } else {
          setRoleError('角色列表读取失败');
          message.error((e as Error).message || '读取角色列表失败');
        }
      });
  }, [load]);


  const allKeys = useMemo(() => collectIds(tree), [tree]);

  /** 角色下拉的候选： */
  const roleSelectOptions = useMemo(() => {
    const options = roles.map((r) => ({
      value: r.id,

      label: `${r.name ?? r.code ?? r.id}${r.status === 0 ? '（已停用）' : ''}`,
    }));
    if (roleUnavailable && editing) {
      const known = new Set(options.map((option) => option.value));
      (editing.roleIds ?? []).forEach((id, index) => {
        if (!known.has(id)) {
          options.push({ value: id, label: editing.roleNames?.[index] ?? id });
        }
      });
    }
    return options;
  }, [roles, roleUnavailable, editing]);

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







    const omitRoleIds = roleUnavailable || (Boolean(editing) && sameIds(nextRoleIds, originalRoleIds));
    const payload = {
      name: values.name,
      parentId: values.parentId,

      deptType: 'org',
      ...(omitRoleIds ? {} : { roleIds: nextRoleIds }),
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
          <LinkAction style={{ color: 'var(--bp-orange)' }} onClick={() => setDeleteTarget(row)}>
            删除
          </LinkAction>
        )}
      </Space>
    ),
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>

        {!embedded && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>GROUP / 用户组</div>
            <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
              用户组
            </div>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
              教职工组织与角色：组内成员继承绑定角色的权限；班级与学员在「班级管理」维护。
            </div>
            {roleError && (
              <div style={{ fontSize: 11, color: 'var(--bp-orange)', marginTop: 4 }}>
                {roleError}
                {roleDenied && '：当前账号缺少 system:role:list，角色下拉已禁用；保存不会改动组已绑定的角色。'}
              </div>
            )}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()} />
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
            新建用户组
          </Button>
        )}
      </div>


      {embedded && roleError && (
        <div style={{ fontSize: 11, color: 'var(--bp-orange)', marginBottom: 10 }}>
          {roleError}
          {roleDenied && '：当前账号缺少 system:role:list，角色下拉已禁用；保存不会改动组已绑定的角色。'}
        </div>
      )}

      <Card

        className={embedded ? undefined : 'bp-corners'}
        variant={embedded ? 'borderless' : undefined}
        style={
          embedded ? { background: 'transparent' } : { border: '1px solid var(--bp-line)' }
        }
        styles={embedded ? { body: { padding: 0 } } : undefined}
      >
        {isMobile ? (
          <div className="sk-group-list">
            {flattenDeptNodes(tree).length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有用户组" />
            ) : (
              flattenDeptNodes(tree).map(({ node, depth }) => (
                <div className="sk-group-row" key={node.id} style={{ marginLeft: depth * 12 }}>
                  <div className="sk-group-row-head">{node.name || '—'}</div>
                  <div className="sk-group-row-meta">
                    <span>
                      {node.roleNames?.length
                        ? node.roleNames.join(' / ')
                        : roleDenied
                          ? '无权读取角色'
                          : '未分配角色'}
                    </span>
                    <span style={{ color: isExpired(node.validTo) ? 'var(--bp-orange)' : undefined }}>
                      {validityText(node.validFrom, node.validTo)}
                      {isExpired(node.validTo) ? '（已过期）' : ''}
                    </span>
                  </div>
                  {(canCreate || canUpdate || canDelete) && (
                    <div className="sk-group-row-actions">
                      {canCreate && <LinkAction onClick={() => openCreate(node)}>加子组</LinkAction>}
                      {canUpdate && <LinkAction onClick={() => openEdit(node)}>编辑</LinkAction>}
                      {canDelete && (
                        <LinkAction style={{ color: 'var(--bp-orange)' }} onClick={() => setDeleteTarget(node)}>
                          删除
                        </LinkAction>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <Table<Dept>
            rowKey="id"
            size="small"
            loading={loading}
            dataSource={tree}
            pagination={false}
            scroll={{ x: 680 }}
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
                    <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                      {roleDenied ? '无权读取角色' : '未分配角色'}
                    </span>
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
        )}
      </Card>

      <Modal
        width={640}
        title={editing ? '编辑用户组' : '新建用户组'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" size="small" requiredMark={false}>
          <Form.Item name="name" label="用户组名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：教务处 / 护理教研组" />
          </Form.Item>
          <Form.Item name="parentId" label="上级用户组" extra="留空表示顶层">
            <Select
              allowClear
              placeholder="顶层（不选）"
              options={flattenDepts(tree)
                .filter((d) => d.id !== editing?.id)
                .map((d) => ({ value: d.id, label: `${'　'.repeat(d.depth)}${d.name}` }))}
            />
          </Form.Item>
          <Form.Item
            name="roleIds"
            label="本组角色"
            extra={
              roleDenied
                ? '当前账号没有读取角色的权限（需要 system:role:list）；保存时不会改动本组已绑定的角色'
                : roleUnavailable
                  ? '角色列表读取失败，暂时不能修改角色；保存时不会改动本组已绑定的角色'
                  : '组内成员（含子组）自动获得这些角色的权限；权限点请在「权限配置」里维护'
            }
          >
            <Select
              mode="multiple"
              allowClear
              disabled={roleUnavailable}
              placeholder={roleDenied ? '无权读取角色' : roleUnavailable ? '角色列表读取失败' : '选择角色（可多选）'}
              optionFilterProp="label"
              options={roleSelectOptions}
            />
          </Form.Item>
          <Form.Item name="validity" label="有效期" extra="留空=永久有效；过期后组内成员无法登录">
            <DatePicker.RangePicker style={{ width: '100%' }} allowEmpty={[true, true]} />
          </Form.Item>
        </Form>
      </Modal>

      <DeleteDeptDialog
        open={Boolean(deleteTarget)}
        deptId={deleteTarget?.id ?? ''}
        deptName={deleteTarget?.name}
        deptType="org"
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => void load()}
      />
    </div>
  );
}
