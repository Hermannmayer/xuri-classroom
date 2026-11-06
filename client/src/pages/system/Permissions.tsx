import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Empty, Form, Input, Modal, Popconfirm, Spin, Table, Tabs, Tag, Tree } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import { get, getWithPagination, post, type PermissionGroup, type PermissionItem, type RoleView } from '../../api';

/** 内置角色不可删除、不可改 code；其余都算自定义角色 */
const BUILTIN_CODES = new Set(['admin', 'teacher', 'student']);
const isBuiltin = (role: RoleView) => BUILTIN_CODES.has(role.code ?? '');

/**
 * 系统管理 → 权限配置
 *
 * 两个视图：
 * 1. 权限目录：左侧树（分组 → 权限点），点击任一权限点在右侧看它的说明、涵盖操作与依赖项。
 * 2. 角色权限矩阵：行=权限点，列=角色，勾选即表示该角色拥有该权限，保存写回 t_role.authority。
 *
 * 数据来源：
 * - 权限目录 GET /api/system/permission/list（后端 PermissionEnum，含中文名/分组/说明）
 * - 角色列表 GET /api/system/role/list
 * - 保存     POST /api/system/role/update（authorities 传数组，空数组=收回全部权限）
 */

const ACTION_LABEL: Record<string, string> = {
  list: '查看列表',
  detail: '查看详情',
  create: '新建',
  update: '修改',
  delete: '删除',
  export: '导出',
  import: '导入',
  upload: '上传附件',
  report: '查看报表/分析',
  book: '错题本与练习',
  updatePosition: '调整职务',
};

/** 「涵盖操作」按权限串最后一段推导，界面里会注明是约定推导，不是后端字段 */
function actionsOf(code: string): string[] {
  const action = code.split(':').pop() ?? code;
  const label = ACTION_LABEL[action];
  return label ? [label] : [`${action}（自定义动作）`];
}

/**
 * 「依赖项」按命名约定推导：
 * - domain:object:action 依赖 domain:object:list
 * - domain:action 依赖 domain:list（且都不依赖自己）
 * - 若目录里存在裸域权限（如 repo），也一并列出
 */
function dependenciesOf(code: string, allCodes: Set<string>): string[] {
  const parts = code.split(':');
  const deps: string[] = [];
  if (parts.length >= 3) {
    const listCode = `${parts[0]}:${parts[1]}:list`;
    if (listCode !== code && allCodes.has(listCode)) deps.push(listCode);
  } else if (parts.length === 2) {
    const listCode = `${parts[0]}:list`;
    if (listCode !== code && allCodes.has(listCode)) deps.push(listCode);
  }
  if (parts.length > 1 && allCodes.has(parts[0])) deps.push(parts[0]);
  return deps;
}

export default function SystemPermissions() {
  const { message } = App.useApp();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [roles, setRoles] = useState<RoleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeCode, setActiveCode] = useState<string>();
  /** roleId -> 勾选的权限串集合（本地草稿，保存时才落库） */
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  /** 角色管理（新建 / 重命名 / 删除自定义角色） */
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleView | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleForm] = Form.useForm<{ name: string; code: string; remark?: string }>();

  const openCreateRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    setRoleModalOpen(true);
  };

  const openEditRole = (role: RoleView) => {
    setEditingRole(role);
    roleForm.setFieldsValue({ name: role.name ?? '', code: role.code ?? '', remark: role.remark });
    setRoleModalOpen(true);
  };

  const submitRole = async () => {
    const values = await roleForm.validateFields();
    setSavingRole(true);
    try {
      if (editingRole) {
        await post('/api/system/role/update', {
          id: editingRole.id,
          name: values.name,
          code: values.code,
          remark: values.remark,
          // 不传 authorities = 不动已有权限
        });
        message.success('角色已更新');
      } else {
        await post('/api/system/role/create', {
          name: values.name,
          code: values.code,
          remark: values.remark,
          authorities: [],
        });
        message.success('角色已创建，可以在下面的矩阵里给它勾选权限，也可以去用户组里绑定它');
      }
      setRoleModalOpen(false);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSavingRole(false);
    }
  };

  const removeRole = async (role: RoleView) => {
    try {
      await post('/api/system/role/delete', { id: role.id });
      message.success('角色已删除');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, rolePage] = await Promise.all([
        get<PermissionGroup[]>('/api/system/permission/list'),
        getWithPagination<RoleView>('/api/system/role/list', { current: 1, pageSize: 100 }),
      ]);
      const nextGroups = Array.isArray(catalog) ? catalog : [];
      const nextRoles = rolePage.data ?? [];
      setGroups(nextGroups);
      setRoles(nextRoles);
      const nextDraft: Record<string, Set<string>> = {};
      for (const role of nextRoles) {
        nextDraft[role.id] = new Set(role.authorities ?? []);
      }
      setDraft(nextDraft);
      setDirty(new Set());
      setActiveCode((prev) => prev ?? nextGroups[0]?.permissions[0]?.code);
    } catch (e) {
      message.error((e as Error).message || '加载权限目录失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const allItems = useMemo<PermissionItem[]>(
    () => groups.flatMap((group) => group.permissions ?? []),
    [groups],
  );
  const allCodes = useMemo(() => new Set(allItems.map((item) => item.code)), [allItems]);
  const activeItem = useMemo(
    () => allItems.find((item) => item.code === activeCode),
    [allItems, activeCode],
  );

  /** 目录树：分组做父节点，权限点做叶子 */
  const treeData = useMemo<DataNode[]>(() => {
    const lower = keyword.trim().toLowerCase();
    const match = (item: PermissionItem) =>
      !lower ||
      item.code.toLowerCase().includes(lower) ||
      (item.name ?? '').toLowerCase().includes(lower) ||
      (item.description ?? '').toLowerCase().includes(lower);
    return groups
      .map((group) => {
        const children = (group.permissions ?? []).filter(match).map((item) => ({
          key: item.code,
          title: (
            <span>
              <span style={{ fontSize: 13 }}>{item.name}</span>
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--bp-text-soft)' }}>{item.code}</span>
            </span>
          ),
        }));
        return {
          key: `group:${group.group}`,
          title: (
            <span>
              <span className="bp-title" style={{ fontSize: 13 }}>
                {group.group}
              </span>
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--bp-text-soft)' }}>
                {children.length} / {group.total}
              </span>
            </span>
          ),
          selectable: false,
          children,
        } as DataNode;
      })
      .filter((node) => (node.children ?? []).length > 0);
  }, [groups, keyword]);

  const togglePermission = (roleId: string, code: string, checked: boolean) => {
    setDraft((prev) => {
      const next = { ...prev };
      const set = new Set(prev[roleId] ?? []);
      if (checked) set.add(code);
      else set.delete(code);
      next[roleId] = set;
      return next;
    });
    setDirty((prev) => new Set(prev).add(roleId));
  };

  const save = async () => {
    const targets = roles.filter((role) => dirty.has(role.id));
    if (!targets.length) {
      message.info('没有改动需要保存');
      return;
    }
    setSaving(true);
    let ok = 0;
    const failed: string[] = [];
    for (const role of targets) {
      try {
        await post('/api/system/role/update', {
          id: role.id,
          name: role.name,
          code: role.code,
          remark: role.remark,
          // 空数组表示「收回全部权限」，后端会把 authority 写成空串
          authorities: Array.from(draft[role.id] ?? []),
        });
        ok += 1;
      } catch (e) {
        failed.push(`${role.name ?? role.id}：${(e as Error).message}`);
      }
    }
    setSaving(false);
    if (failed.length) {
      message.error(`保存失败 ${failed.length} 个角色：${failed.join('；')}`);
    }
    if (ok) {
      message.success(`已保存 ${ok} 个角色的权限，相关用户需要重新登录才会刷新权限`);
      await load();
    }
  };

  const columns = useMemo<ColumnsType<PermissionItem>>(() => {
    const roleColumns: ColumnsType<PermissionItem> = roles.map((role) => {
      const isAdminRole = role.code === 'admin';
      return {
        title: (
          <span>
            {role.name ?? role.code}
            {isAdminRole && (
              <Tag style={{ marginLeft: 6 }} color="orange">
                全权限
              </Tag>
            )}
            {!isAdminRole && (
              <span style={{ marginLeft: 6, whiteSpace: 'nowrap' }}>
                <a style={{ fontSize: 11 }} onClick={() => openEditRole(role)}>
                  改名
                </a>
                {!isBuiltin(role) && (
                  <Popconfirm
                    title={`删除角色「${role.name ?? role.code}」？`}
                    description="已绑定该角色的用户会失去对应权限，请先确认。"
                    okText="删除"
                    okButtonProps={{ danger: true }}
                    cancelText="取消"
                    onConfirm={() => void removeRole(role)}
                  >
                    <a style={{ fontSize: 11, marginLeft: 6, color: 'var(--bp-orange)' }}>删除</a>
                  </Popconfirm>
                )}
              </span>
            )}
          </span>
        ),
        key: `role:${role.id}`,
        width: 130,
        align: 'center' as const,
        render: (_: unknown, item: PermissionItem) => {
          const checked = draft[role.id]?.has(item.code) ?? false;
          return (
            <input
              type="checkbox"
              aria-label={`${role.name ?? role.id} 是否拥有 ${item.code}`}
              checked={isAdminRole ? true : checked}
              disabled={isAdminRole}
              onChange={(event) => togglePermission(role.id, item.code, event.target.checked)}
              style={{ width: 16, height: 16, cursor: isAdminRole ? 'not-allowed' : 'pointer' }}
            />
          );
        },
      };
    });
    return [
      {
        title: '权限',
        key: 'permission',
        render: (_: unknown, item: PermissionItem) => (
          <div>
            <div style={{ fontSize: 13 }}>
              {item.name}
              {item.suggested && (
                <Tag style={{ marginLeft: 6 }} color="blue">
                  建议新增
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>{item.code}</div>
          </div>
        ),
      },
      {
        title: '分组',
        dataIndex: 'group',
        key: 'group',
        width: 110,
        render: (value: string) => <span style={{ fontSize: 12 }}>{value}</span>,
      },
      ...roleColumns,
    ];
  }, [roles, draft]);

  const flatColumns = useMemo<ColumnsType<PermissionItem>>(() => columns, [columns]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const adminRole = roles.find((role) => role.code === 'admin');

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            SYSTEM / 权限配置
          </div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            权限目录与角色矩阵
          </div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
            共 {allItems.length} 个权限点、{roles.length} 个角色
            {adminRole ? '；超级管理员始终拥有全部权限，不可修改' : ''}
          </div>
        </div>
        <Button onClick={openCreateRole}>新建角色</Button>
        <Button type="primary" loading={saving} onClick={() => void save()} disabled={dirty.size === 0}>
          保存改动{dirty.size ? `（${dirty.size} 个角色）` : ''}
        </Button>
      </div>

      <Tabs
        items={[
          {
            key: 'catalog',
            label: '权限目录',
            children: (
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="bp-card" style={{ flex: '1 1 320px', minWidth: 280, padding: 14 }}>
                  <Input.Search
                    allowClear
                    placeholder="搜索权限名或权限串"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    style={{ marginBottom: 10 }}
                  />
                  {treeData.length ? (
                    <Tree
                      treeData={treeData}
                      defaultExpandAll
                      selectedKeys={activeCode ? [activeCode] : []}
                      onSelect={(keys) => {
                        const key = keys[0];
                        if (typeof key === 'string' && !key.startsWith('group:')) setActiveCode(key);
                      }}
                    />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的权限点" />
                  )}
                </div>

                <div className="bp-card" style={{ flex: '1 1 380px', minWidth: 300, padding: 18 }}>
                  {!activeItem ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="从左侧选一个权限点查看详情" />
                  ) : (
                    <>
                      <div className="bp-title" style={{ fontSize: 16 }}>
                        {activeItem.name}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Tag color="blue">{activeItem.code}</Tag>
                        <Tag>{activeItem.group}</Tag>
                        {activeItem.suggested && <Tag color="orange">建议新增，尚未接入注解</Tag>}
                      </div>

                      <SectionTitle text="说明" />
                      <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--bp-text)' }}>
                        {activeItem.description || '暂无说明'}
                      </div>

                      <SectionTitle text="涵盖操作" />
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9 }}>
                        {actionsOf(activeItem.code).map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>

                      <SectionTitle text="依赖的权限" />
                      {(() => {
                        const deps = dependenciesOf(activeItem.code, allCodes);
                        if (!deps.length) {
                          return (
                            <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                              按命名约定推导，未发现前置依赖
                            </div>
                          );
                        }
                        return (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {deps.map((dep) => (
                              <Tag
                                key={dep}
                                color="blue"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setActiveCode(dep)}
                              >
                                {dep}
                              </Tag>
                            ))}
                          </div>
                        );
                      })()}
                      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--bp-hint)' }}>
                        说明：涵盖操作与依赖项是按权限串命名约定推导的，后端只提供名称、分组与描述。
                      </div>
                    </>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'matrix',
            label: '角色权限矩阵',
            children: (
              <div className="bp-card" style={{ padding: 0 }}>
                <Table<PermissionItem>
                  rowKey="code"
                  size="small"
                  columns={flatColumns}
                  dataSource={allItems}
                  pagination={{ pageSize: 30, size: 'small', showSizeChanger: false }}
                  scroll={{ x: 760 }}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="权限目录为空" /> }}
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={editingRole ? `编辑角色：${editingRole.name ?? editingRole.code}` : '新建角色'}
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={submitRole}
        confirmLoading={savingRole}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={roleForm} layout="vertical" size="small" requiredMark={false}>
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称，例如：教研组长' }]}
          >
            <Input placeholder="例如：教研组长 / 校区负责人" />
          </Form.Item>
          <Form.Item
            name="code"
            label="角色编码"
            rules={[
              { required: true, message: '请输入编码' },
              { pattern: /^[a-z][a-z0-9_-]{1,31}$/, message: '小写字母开头，可含数字、下划线、短横线' },
            ]}
            extra="用于程序内部识别，建好后不建议改；内置角色 admin/teacher/student 不可删除"
          >
            <Input placeholder="例如：research_lead" disabled={Boolean(editingRole && isBuiltin(editingRole))} />
          </Form.Item>
          <Form.Item name="remark" label="说明">
            <Input.TextArea rows={2} placeholder="这个角色是干什么的（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div
      style={{
        marginTop: 16,
        marginBottom: 6,
        fontSize: 10,
        letterSpacing: '0.18em',
        color: 'var(--bp-text-soft)',
      }}
    >
      {text}
    </div>
  );
}
