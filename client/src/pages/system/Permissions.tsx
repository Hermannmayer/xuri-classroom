import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  App,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Tag,
  Tree,
} from 'antd';
import type { TreeDataNode, TreeProps } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import LinkAction from '../../components/LinkAction';
import { loadAuthorities } from '../../auth/permissions';
import {
  get,
  getWithPagination,
  post,
  type PermissionGroup,
  type PermissionItem,
  type RoleView,
} from '../../api';
import {
  FRONTEND_ONLY_CODES,
  GROUP_DESCRIPTIONS,
  KIND_HINT,
  KIND_META,
  PERMISSION_MENU,
  permissionKind,
  type PermissionKind,
} from './permissionPresets';




























const BUILTIN_CODES = new Set(['admin', 'teacher', 'student', 'xueyuan']);
const isBuiltin = (role: RoleView) => BUILTIN_CODES.has(role.code ?? '');

/** t_role.authority 用逗号拆分，空串权限会拆出 ['']；这里统一清洗 */
const authoritiesOf = (role: RoleView | undefined) =>
  (role?.authorities ?? []).map((code) => code.trim()).filter(Boolean);

const sameMembers = (a: Set<string>, b: Set<string>) => {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
};

const ROLE_CARD_BUTTON: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
};

const KIND_TAG_STYLE: CSSProperties = {
  marginInlineEnd: 0,
  fontSize: 11,
  lineHeight: '16px',
  padding: '0 5px',
};


const PANEL_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  height: 'clamp(320px, calc(100vh - 500px), 760px)',
  overflow: 'hidden',
};

const PANEL_HEAD_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  padding: '9px 12px',
  borderBottom: '1px dashed var(--bp-line)',
};

const PANEL_TOOLBAR_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  padding: '8px 12px',
  borderBottom: '1px dashed var(--bp-line-soft)',
};

const PANEL_BODY_STYLE: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '6px 10px 12px',
};

const GROUP_TITLE_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  width: '100%',
  padding: '2px 0',
};

const LEAF_TITLE_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  width: '100%',
  padding: '2px 0',
};

const MUTED_STYLE: CSSProperties = {
  fontSize: 11,
  color: 'var(--bp-text-soft)',
};

const HINT_STYLE: CSSProperties = {
  fontSize: 11,
  color: 'var(--bp-hint)',
};

/** 「看 / 改 / 基础」标签：颜色与 tooltip 都来自 permissionPresets 的静态规则 */
function KindTag({ kind }: { kind: PermissionKind }) {
  const meta = KIND_META[kind];
  return (
    <Tag color={meta.color} title={KIND_HINT[kind]} style={KIND_TAG_STYLE}>
      {meta.label}
    </Tag>
  );
}

/** 悬停提示：保留原页面里的权限说明与菜单入口，只是不再占版面 */
function permissionTip(item: PermissionItem): string | undefined {
  const menu = PERMISSION_MENU[item.code];
  const parts = [item.description, menu ? `入口：${menu}` : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

/** 搜索按「中文名 / 权限串」匹配，大小写不敏感（中文不受影响） */
function matchesKeyword(item: PermissionItem, keyword: string) {
  if (!keyword) return true;
  return item.name.toLowerCase().includes(keyword) || item.code.toLowerCase().includes(keyword);
}

type RoleFormValues = {
  name: string;
  code: string;
  remark?: string;

  presetRoleId?: string;
};


type DraftState = {
  roleId?: string;
  codes: Set<string>;
};

type VisibleGroup = {
  group: PermissionGroup;
  items: PermissionItem[];
};

export default function SystemPermissions({ embedded = false }: { embedded?: boolean } = {}) {
  const { message, modal } = App.useApp();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [roles, setRoles] = useState<RoleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState<string>();
  const [draftState, setDraftState] = useState<DraftState>({ codes: new Set<string>() });

  const [keyword, setKeyword] = useState('');

  const [onlyChecked, setOnlyChecked] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);


  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    void loadAuthorities().then((list) => setIsAdmin(list.includes('ROLE_admin')));
  }, []);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleView | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleForm] = Form.useForm<RoleFormValues>();

  const [copyRoleId, setCopyRoleId] = useState<string>();

  const load = useCallback(
    async (silent = false): Promise<RoleView[]> => {
      if (!silent) setLoading(true);
      try {
        const [catalog, rolePage] = await Promise.all([
          get<PermissionGroup[]>('/api/system/permission/list'),
          getWithPagination<RoleView>('/api/system/role/list', { current: 1, pageSize: 100 }),
        ]);
        const nextGroups = Array.isArray(catalog) ? catalog : [];
        const nextRoles = rolePage.data ?? [];
        setGroups(nextGroups);
        setRoles(nextRoles);
        setActiveRoleId((prev) => (prev && nextRoles.some((role) => role.id === prev) ? prev : nextRoles[0]?.id));
        return nextRoles;
      } catch (e) {
        message.error((e as Error).message || '加载权限配置失败');
        return [];
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const activeRole = useMemo(() => roles.find((role) => role.id === activeRoleId), [roles, activeRoleId]);
  const activeAuthorities = useMemo(() => authoritiesOf(activeRole), [activeRole]);

  const editorLocked = activeRole?.code === 'admin';

  const draft = useMemo(() => {
    if (activeRoleId && draftState.roleId === activeRoleId) return draftState.codes;
    return new Set(activeAuthorities);
  }, [activeRoleId, draftState, activeAuthorities]);

  const commitDraft = (updater: (prev: Set<string>) => Set<string>) => {
    setDraftState((prev) => {
      const base = activeRoleId && prev.roleId === activeRoleId ? prev.codes : new Set(activeAuthorities);
      return { roleId: activeRoleId, codes: updater(base) };
    });
  };

  const allItems = useMemo(() => groups.flatMap((group) => group.permissions ?? []), [groups]);
  const catalogCodes = useMemo(() => new Set(allItems.map((item) => item.code)), [allItems]);

  const checkedCount = useMemo(() => {
    if (editorLocked) return allItems.length;
    return allItems.filter((item) => draft.has(item.code)).length;
  }, [allItems, draft, editorLocked]);


  const dirty = useMemo(() => {
    if (editorLocked) return false;
    return !sameMembers(draft, new Set(activeAuthorities));
  }, [draft, activeAuthorities, editorLocked]);

  const keywordNorm = keyword.trim().toLowerCase();

  /** 左树数据源：按目录分组顺序，过滤掉不命中的权限点 */
  const visibleGroups = useMemo<VisibleGroup[]>(() => {
    const result: VisibleGroup[] = [];
    for (const group of groups) {
      const items = (group.permissions ?? []).filter((item) => {
        if (onlyChecked && !(editorLocked || draft.has(item.code))) return false;
        return matchesKeyword(item, keywordNorm);
      });
      if (items.length > 0) result.push({ group, items });
    }
    return result;
  }, [groups, onlyChecked, editorLocked, draft, keywordNorm]);

  /** 右栏数据源：只按目录分组顺序列已勾选的权限，和左树的分组顺序天然一致 */
  const selectedGroups = useMemo<VisibleGroup[]>(
    () =>
      groups
        .map((group) => ({
          group,
          items: (group.permissions ?? []).filter((item) => editorLocked || draft.has(item.code)),
        }))
        .filter((entry) => entry.items.length > 0),
    [groups, editorLocked, draft],
  );

  /** 左树勾选态：只传叶子权限串，父节点的全选 / 半选交给 antd 的级联推导 */
  const treeCheckedKeys = useMemo(
    () =>
      editorLocked
        ? allItems.map((item) => item.code)
        : allItems.filter((item) => draft.has(item.code)).map((item) => item.code),
    [allItems, draft, editorLocked],
  );

  /** 左树的两级结构：分组 → 权限点 */
  const treeData = useMemo<TreeDataNode[]>(
    () =>
      visibleGroups.map(({ group, items }) => {
        const total = (group.permissions ?? []).length;
        const picked = editorLocked
          ? total
          : (group.permissions ?? []).filter((item) => draft.has(item.code)).length;
        return {
          key: group.group,

          title: (
            <div
              style={{ ...GROUP_TITLE_STYLE, cursor: 'pointer' }}
              title={GROUP_DESCRIPTIONS[group.group]}
              onClick={(event) => {
                event.stopPropagation();
                setExpandedKeys((prev) =>
                  prev.includes(group.group)
                    ? prev.filter((key) => key !== group.group)
                    : [...prev, group.group],
                );
              }}
            >
              <span className="bp-title" style={{ fontSize: 13 }}>
                {group.group}
              </span>
              <span style={MUTED_STYLE}>
                已选 {picked} / {total}
              </span>
            </div>
          ),
          children: items.map((item) => ({
            key: item.code,
            title: (
              <div style={LEAF_TITLE_STYLE} title={permissionTip(item)}>
                <span style={{ fontSize: 13 }}>{item.name}</span>
                <span style={MUTED_STYLE}>{item.code}</span>
                <KindTag kind={permissionKind(item.code)} />
                {item.studentOnly && (
                  <span style={{ fontSize: 10, color: 'var(--bp-orange)' }}>学员专属</span>
                )}
                {FRONTEND_ONLY_CODES.has(item.code) && (
                  <span
                    style={{ fontSize: 10, color: 'var(--bp-text-soft)' }}
                    title="后端没有接口校验这个权限点，它只控制前端入口"
                  >
                    仅前端
                  </span>
                )}
              </div>
            ),
          })),
        };
      }),
    [visibleGroups, draft, editorLocked],
  );





  useEffect(() => {
    if (groups.length === 0) return;
    const role = roles.find((item) => item.id === activeRoleId);
    const codes = new Set(authoritiesOf(role));
    const withSelection = groups.filter((group) =>
      (group.permissions ?? []).some((item) => codes.has(item.code)),
    );
    const initial = withSelection.length > 0 ? withSelection : groups.slice(0, 1);
    setExpandedKeys(initial.map((group) => group.group));
  }, [groups, roles, activeRoleId]);






  useEffect(() => {
    if (!keywordNorm && !onlyChecked) {
      setExpandedKeys(
        groups
          .filter((group) => (group.permissions ?? []).some((item) => editorLocked || draft.has(item.code)))
          .map((group) => group.group),
      );
      return;
    }
    setExpandedKeys(visibleGroups.map((entry) => entry.group.group));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在筛选条件变化时重置展开态
  }, [keywordNorm, onlyChecked]);

  const togglePermission = (code: string, checked: boolean) => {
    commitDraft((prev) => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  };

  const toggleGroup = (group: PermissionGroup, checked: boolean) => {
    commitDraft((prev) => {
      const next = new Set(prev);
      for (const item of group.permissions ?? []) {
        if (checked) next.add(item.code);
        else next.delete(item.code);
      }
      return next;
    });
  };

  /** 勾选框的委托：勾选分组 = 整组加入 / 整组移除（搜索过滤时也按整组算，语义不随视图变化）； 勾选权限点 = 单项切换 */
  const handleTreeCheck: TreeProps['onCheck'] = (_checkedKeys, info) => {
    if (editorLocked) return;
    const key = String(info.node.key);
    const target = groups.find((group) => group.group === key);
    if (target) {
      toggleGroup(target, info.checked);
    } else {
      togglePermission(key, info.checked);
    }
  };

  const expandAll = () => setExpandedKeys(visibleGroups.map((entry) => entry.group.group));
  const collapseAll = () => setExpandedKeys([]);

  /** 不再按固定 key（teacher/student）查找：直接按角色 id 取当前 authorities */
  const presetCodesOf = (roleId?: string): string[] => {
    const role = roles.find((r) => r.id === roleId);
    return (role?.authorities ?? []).filter((code) => catalogCodes.has(code));
  };

  const applyPreset = (roleId: string) => {
    const source = roles.find((r) => r.id === roleId);
    const codes = presetCodesOf(roleId);
    if (!source || !codes.length) {
      message.warning('这个角色没有可复制的权限');
      return;
    }

    const next = new Set([...draft].filter((code) => !catalogCodes.has(code)));
    codes.forEach((code) => next.add(code));
    if (sameMembers(next, draft)) {
      message.info(`当前权限与「${source.name || source.code}」一致`);
      return;
    }
    setDraftState({ roleId: activeRoleId, codes: next });

    setExpandedKeys(
      groups
        .filter((group) => (group.permissions ?? []).some((item) => next.has(item.code)))
        .map((group) => group.group),
    );
    message.info(`已复制「${source.name || source.code}」的权限，保存后才生效`);
  };

  const clearDraft = () => {
    const kept = [...draft].filter((code) => !catalogCodes.has(code));
    if (kept.length === draft.size) {
      message.info('当前没有勾选任何权限');
      return;
    }
    setDraftState({ roleId: activeRoleId, codes: new Set(kept) });
  };

  const resetDraft = () => {
    setDraftState({ roleId: activeRoleId, codes: new Set(activeAuthorities) });
    setExpandedKeys(
      groups
        .filter((group) => (group.permissions ?? []).some((item) => activeAuthorities.includes(item.code)))
        .map((group) => group.group),
    );
  };

  const save = async () => {
    if (!activeRole || editorLocked) return;
    setSaving(true);
    try {
      await post('/api/system/role/update', {
        id: activeRole.id,
        authorities: [...draft].filter(Boolean),
      });
      await load(true);
      message.success('权限已保存，相关用户需重新登录才生效');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const selectRole = (role: RoleView) => {
    if (role.id === activeRoleId) return;
    if (dirty) {
      modal.confirm({
        title: '切换角色？',
        content: '当前角色的勾选还没有保存，切换后会丢弃。',
        okText: '丢弃并切换',
        cancelText: '继续编辑',
        onOk: () => setActiveRoleId(role.id),
      });
      return;
    }
    setActiveRoleId(role.id);
  };

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
    let values: RoleFormValues;
    try {
      values = await roleForm.validateFields();
    } catch {
      return;
    }
    setSavingRole(true);
    try {
      if (editingRole) {

        await post('/api/system/role/update', {
          id: editingRole.id,
          name: values.name,
          code: values.code,
          remark: values.remark,
        });
        message.success('角色信息已更新');
      } else {
        const source = values.presetRoleId ? roles.find((r) => r.id === values.presetRoleId) : undefined;
        await post('/api/system/role/create', {
          name: values.name,
          code: values.code,
          remark: values.remark,
          authorities: values.presetRoleId ? presetCodesOf(values.presetRoleId) : [],
        });
        message.success(
          source ? `角色已创建，已复制「${source.name || source.code}」的权限` : '角色已创建，接下来勾选权限',
        );
      }
      setRoleModalOpen(false);
      const nextRoles = await load(true);
      if (!editingRole) {
        const created = nextRoles.find((role) => role.code === values.code);
        if (created) setActiveRoleId(created.id);
      }
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
      await load(true);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const treeEmptyText =
    allItems.length === 0
      ? '权限目录为空，请检查后端接口'
      : keywordNorm
        ? `没有匹配「${keyword.trim()}」的权限`
        : onlyChecked
          ? '当前角色还没有勾选任何权限'
          : '没有可显示的权限';

  return (
    <div>

      {!embedded && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            SYSTEM / 权限配置
          </div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            角色与权限
          </div>
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginTop: 4 }}>
            共 {allItems.length} 个权限点、{roles.length} 个角色。左边勾选、右边核对；新角色可以从老师或学员预设起步。
          </div>
        </div>
      )}


      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--bp-text-soft)' }}>角色</span>
        <span style={HINT_STYLE}>内置角色带「预设」标签，选中后在下方左右两栏里调整</span>
      </div>

      <div
        role="radiogroup"
        aria-label="选择角色"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' }}
      >
        {roles.map((role) => {
          const selected = role.id === activeRoleId;
          const builtin = isBuiltin(role);
          const count = authoritiesOf(role).length;
          return (
            <div
              key={role.id}
              className="bp-card"
              style={{
                flex: '0 1 210px',
                minWidth: 168,
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${selected ? 'var(--bp-orange)' : 'var(--bp-line)'}`,
                background: selected ? 'var(--bp-orange-tint)' : 'var(--bp-panel)',
              }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectRole(role)}
                style={ROLE_CARD_BUTTON}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="bp-title" style={{ fontSize: 13 }}>
                    {role.name || role.code || role.id}
                  </span>
                  {builtin && (
                    <Tag style={{ marginInlineEnd: 0, fontSize: 11, lineHeight: '16px', padding: '0 5px' }}>预设</Tag>
                  )}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 2 }}>
                  {role.code || '—'}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--bp-hint)', marginTop: 2 }}>
                  {count} 项权限
                </span>
              </button>
              <div style={{ display: 'flex', gap: 12, padding: '0 12px 8px' }}>
                <LinkAction
                  style={{ fontSize: 11 }}
                  aria-label={`编辑角色 ${role.name || role.code || role.id}`}
                  onClick={() => openEditRole(role)}
                >
                  编辑
                </LinkAction>
                {!builtin && (
                  <Popconfirm
                    title={`删除角色「${role.name || role.code || role.id}」？`}
                    description="已绑定该角色的用户会失去对应权限，请先确认。"
                    okText="删除"
                    okButtonProps={{ danger: true }}
                    cancelText="取消"
                    onConfirm={() => void removeRole(role)}
                  >
                    <LinkAction
                      style={{ fontSize: 11, color: 'var(--bp-orange)' }}
                      aria-label={`删除角色 ${role.name || role.code || role.id}`}
                    >
                      删除
                    </LinkAction>
                  </Popconfirm>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          {isAdmin && (
            <Button icon={<PlusOutlined />} onClick={openCreateRole}>
              新建角色
            </Button>
          )}
        </div>
      </div>


      {!activeRole ? (
        <div className="bp-card" style={{ marginTop: 18, padding: 40 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="先在上方选一个角色，或者新建一个" />
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="bp-title" style={{ fontSize: 15 }}>
                  {activeRole.name || activeRole.code || activeRole.id}
                </span>
                <Tag style={{ marginInlineEnd: 0 }}>{activeRole.code || '—'}</Tag>
                {editorLocked && (
                  <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                    只读
                  </Tag>
                )}
                {dirty && (
                  <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                    未保存
                  </Tag>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 3 }}>
                {editorLocked
                  ? `共 ${allItems.length} 个权限点；管理员拥有全部管理权限，学员专属能力除外`
                  : `已勾选 ${checkedCount} / ${allItems.length} 项 · 左树勾选即加入，右栏可逐条移除`}
              </div>
            </div>
            {!editorLocked && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Select
                  size="small"
                  allowClear
                  placeholder="从现有角色复制权限"
                  style={{ width: 230 }}
                  value={copyRoleId}
                  onChange={(id) => setCopyRoleId(id)}
                  options={roles
                    .filter((role) => role.id !== activeRoleId)
                    .map((role) => ({
                      value: role.id,
                      label: `${role.name || role.code || role.id}（${role.code || role.id}）`,
                    }))}
                />
                <Button size="small" disabled={!copyRoleId} onClick={() => copyRoleId && applyPreset(copyRoleId)}>
                  复制权限
                </Button>
              </div>
            )}
          </div>


          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 8,
              fontSize: 11,
              color: 'var(--bp-hint)',
            }}
          >
            <span>标签：</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <KindTag kind="read" />
              只读，不改数据
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <KindTag kind="write" />
              会新增、修改或删除数据
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <KindTag kind="basic" />
              默认页等基础能力
            </span>
          </div>


          <div className="sk-perm-panels" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }}>

            <div className="bp-card" style={{ ...PANEL_STYLE, flex: '2 1 calc(40% - 8px)', minWidth: 260 }}>
              <div style={PANEL_HEAD_STYLE}>
                <span className="bp-title" style={{ fontSize: 13 }}>
                  全部权限
                </span>
                <span style={MUTED_STYLE}>{allItems.length} 个权限点</span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LinkAction style={{ fontSize: 11 }} onClick={expandAll}>
                    展开全部
                  </LinkAction>
                  <LinkAction style={{ fontSize: 11 }} onClick={collapseAll}>
                    收起全部
                  </LinkAction>
                </div>
              </div>
              <div style={PANEL_TOOLBAR_STYLE}>
                <Input
                  allowClear
                  size="small"
                  aria-label="搜索权限"
                  placeholder="搜索中文名或权限串"
                  prefix={<SearchOutlined style={{ color: 'var(--bp-text-soft)' }} />}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  style={{ flex: '1 1 160px', minWidth: 140 }}
                />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <Switch
                    size="small"
                    checked={onlyChecked}
                    onChange={setOnlyChecked}
                    disabled={allItems.length === 0}
                  />
                  <span style={HINT_STYLE}>只看已选</span>
                </span>
              </div>
              <div style={PANEL_BODY_STYLE}>
                {visibleGroups.length === 0 ? (
                  <div style={{ padding: '32px 8px' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={<span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>{treeEmptyText}</span>}
                    />
                  </div>
                ) : (
                  <Tree
                    blockNode
                    checkable
                    selectable={false}
                    disabled={editorLocked}
                    style={{ background: 'transparent', fontSize: 13 }}
                    treeData={treeData}
                    checkedKeys={treeCheckedKeys}
                    expandedKeys={expandedKeys}
                    onExpand={(keys) => setExpandedKeys(keys.map(String))}
                    onCheck={handleTreeCheck}
                  />
                )}
              </div>
            </div>



            <div className="bp-card" style={{ ...PANEL_STYLE, flex: '3 1 calc(60% - 8px)', minWidth: 'min(340px, 100%)' }}>
              <div style={PANEL_HEAD_STYLE}>
                <span className="bp-title" style={{ fontSize: 13 }}>
                  当前角色权限
                </span>
                <span style={MUTED_STYLE}>
                  已勾选 {checkedCount} / 全部 {allItems.length}
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  <Button size="small" onClick={clearDraft} disabled={editorLocked || checkedCount === 0}>
                    清空
                  </Button>
                </div>
              </div>
              <div style={PANEL_BODY_STYLE}>
                {selectedGroups.length === 0 ? (
                  <div style={{ padding: '36px 12px' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                          {allItems.length === 0
                            ? '权限目录为空，请检查后端接口'
                            : '这个角色还没有任何权限，从左边勾选，或套用预设'}
                        </span>
                      }
                    />
                  </div>
                ) : (
                  selectedGroups.map(({ group, items }) => (
                    <div key={group.group} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '5px 4px',
                          borderBottom: '1px solid var(--bp-line-soft)',
                        }}
                        title={GROUP_DESCRIPTIONS[group.group]}
                      >
                        <span className="bp-title" style={{ fontSize: 12 }}>
                          {group.group}
                        </span>
                        <span style={HINT_STYLE}>{items.length} 项</span>
                      </div>
                      {items.map((item) => (
                        <div
                          key={item.code}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '7px 4px',
                            borderBottom: '1px dashed var(--bp-line-soft)',
                          }}
                        >
                          <div
                            title={permissionTip(item)}
                            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                          >
                            <span style={{ fontSize: 13 }}>{item.name}</span>
                            <span style={MUTED_STYLE}>{item.code}</span>
                            <KindTag kind={permissionKind(item.code)} />
                          </div>
                          {!editorLocked && (
                            <LinkAction
                              style={{ fontSize: 11, flexShrink: 0, color: 'var(--bp-orange)' }}
                              aria-label={`移除权限 ${item.name}`}
                              onClick={() => togglePermission(item.code, false)}
                            >
                              移除
                            </LinkAction>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


          {!editorLocked && (
            <div
              className="sk-perm-savebar"
              style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 3,
                marginTop: 14,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                background: 'var(--bp-toolbar)',
                border: '1px solid var(--bp-line)',
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                已勾选 {checkedCount} / {allItems.length} 项 · 保存后需重新登录生效
              </span>
              {dirty && (
                <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                  未保存
                </Tag>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <Button size="small" onClick={resetDraft} disabled={!dirty}>
                  放弃修改
                </Button>
                <Button size="small" type="primary" loading={saving} disabled={!dirty} onClick={() => void save()}>
                  保存
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        title={editingRole ? `编辑角色：${editingRole.name || editingRole.code || editingRole.id}` : '新建角色'}
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={() => void submitRole()}
        confirmLoading={savingRole}
        okText={editingRole ? '保存' : '创建'}
        cancelText="取消"
        forceRender
      >
        <Form
          form={roleForm}
          layout="vertical"
          size="small"
          requiredMark={false}
          initialValues={{ presetRoleId: undefined }}
        >
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
            extra="admin / teacher / student 是内置编码，不要复用"
          >
            <Input placeholder="例如：research_lead" disabled={Boolean(editingRole && isBuiltin(editingRole))} />
          </Form.Item>
          {!editingRole && (
            <Form.Item
              name="presetRoleId"
              label="复制哪个角色的权限"
              extra="不选则从空白开始；老师、学员或后续新增的任何角色都可以作为复制源"
            >
              <Select
                allowClear
                placeholder="空白角色"
                options={roles.map((role) => ({
                  value: role.id,
                  label: `${role.name || role.code || role.id}（${role.code || role.id}）`,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item name="remark" label="说明">
            <Input.TextArea rows={2} placeholder="这个角色是干什么的（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
