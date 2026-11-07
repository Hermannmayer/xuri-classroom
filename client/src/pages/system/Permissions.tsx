import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Collapse,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Spin,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import LinkAction from '../../components/LinkAction';
import { loadAuthorities } from '../../auth/permissions';
import { get, getWithPagination, post, type PermissionGroup, type RoleView } from '../../api';
import {
  GROUP_DESCRIPTIONS,
  KIND_HINT,
  KIND_META,
  PERMISSION_MENU,
  PRESET_KEYS,
  PRESET_META,
  permissionKind,
  type PermissionKind,
  type PresetKey,
} from './permissionPresets';

/**
 * 系统管理 → 权限配置。
 *
 * 页面只做三件事：
 * 1. 选角色：一行角色卡，内置的 admin/teacher/student 标「预设」；
 * 2. 勾权限：按后端分组渲染成可折叠卡片，每组一个全选，权限点标「看/改/基础」；
 * 3. 保存：只提交当前角色的 authorities，保存后相关用户需重新登录才生效。
 *
 * 数据来源：
 * - 权限目录 GET /api/system/permission/list（后端 PermissionEnum 的 73 个权限点，按组返回）
 * - 角色列表 GET /api/system/role/list
 * - 新建角色 POST /api/system/role/create
 * - 保存角色 POST /api/system/role/update（body 只带 { id, authorities }）
 * - 删除角色 POST /api/system/role/delete
 *
 * 约定：
 * - admin 角色只读：永远显示「全部勾选 + 禁用」，后端也会拦截对它的权限修改；
 * - t_role.authority 里还有 `system:role`、`position` 这类不在目录里的历史前缀串，
 *   它们不在页面上显示，但草稿里会原样保留，保存时不会误删；
 * - 「套用预设」只改本地草稿，点保存才落库。
 */

const BUILTIN_CODES = new Set(['admin', 'teacher', 'student']);
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

/** 「看 / 改 / 基础」标签：颜色与 tooltip 都来自 permissionPresets 的静态规则 */
function KindTag({ kind }: { kind: PermissionKind }) {
  const meta = KIND_META[kind];
  return (
    <Tag color={meta.color} title={KIND_HINT[kind]} style={KIND_TAG_STYLE}>
      {meta.label}
    </Tag>
  );
}

type RoleFormValues = {
  name: string;
  code: string;
  remark?: string;
  preset?: PresetKey | 'blank';
};

/** 草稿绑定到角色：roleId 与当前选中角色不一致时，直接回落到服务端数据 */
type DraftState = {
  roleId?: string;
  codes: Set<string>;
};

export default function SystemPermissions() {
  const { message, modal } = App.useApp();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [roles, setRoles] = useState<RoleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState<string>();
  const [draftState, setDraftState] = useState<DraftState>({ codes: new Set<string>() });
  /** 套用预设后重建 Collapse，让新勾选的组自动展开（defaultActiveKey 只在挂载时生效） */
  const [presetVersion, setPresetVersion] = useState(0);

  // 只有管理员能新建角色（后端 system/role/create 是 hasRole('admin')），非管理员不显示入口
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    void loadAuthorities().then((list) => setIsAdmin(list.includes('ROLE_admin')));
  }, []);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleView | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleForm] = Form.useForm<RoleFormValues>();

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
  /** admin 只读：显示全部勾选并禁用 */
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

  /** 目录之外的旧权限串：页面不显示，但保存时保留，避免误删历史数据 */
  const legacyCodes = useMemo(
    () => activeAuthorities.filter((code) => !catalogCodes.has(code)),
    [activeAuthorities, catalogCodes],
  );

  const dirty = useMemo(() => {
    if (editorLocked) return false;
    return !sameMembers(draft, new Set(activeAuthorities));
  }, [draft, activeAuthorities, editorLocked]);

  /** 默认展开「已经有勾选」的组；一个都没勾（新角色）时只展开第一组 */
  const defaultOpenKeys = useMemo(() => {
    if (editorLocked) return groups.map((group) => group.group);
    const withChecked = groups
      .filter((group) => (group.permissions ?? []).some((item) => draft.has(item.code)))
      .map((group) => group.group);
    if (withChecked.length) return withChecked;
    return groups.length ? [groups[0].group] : [];
  }, [groups, draft, editorLocked]);

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

  const applyPreset = (key: PresetKey) => {
    const preset = PRESET_META[key];
    // 保留不在目录里的历史权限串，其余整体替换成预设
    const next = new Set([...draft].filter((code) => !catalogCodes.has(code)));
    preset.codes.forEach((code) => next.add(code));
    if (sameMembers(next, draft)) {
      message.info(`当前已经是${preset.label}预设`);
      return;
    }
    setDraftState({ roleId: activeRoleId, codes: next });
    setPresetVersion((version) => version + 1);
    message.info(`已套用${preset.label}预设，保存后才生效`);
  };

  const clearDraft = () => {
    const kept = [...draft].filter((code) => !catalogCodes.has(code));
    if (kept.length === draft.size) {
      message.info('当前没有勾选任何权限');
      return;
    }
    setDraftState({ roleId: activeRoleId, codes: new Set(kept) });
  };

  const resetDraft = () => setDraftState({ roleId: activeRoleId, codes: new Set(activeAuthorities) });

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
        // 只改角色信息，不传 authorities，权限仍由下方编辑区维护
        await post('/api/system/role/update', {
          id: editingRole.id,
          name: values.name,
          code: values.code,
          remark: values.remark,
        });
        message.success('角色信息已更新');
      } else {
        const preset = values.preset && values.preset !== 'blank' ? PRESET_META[values.preset] : undefined;
        await post('/api/system/role/create', {
          name: values.name,
          code: values.code,
          remark: values.remark,
          authorities: preset ? [...preset.codes] : [],
        });
        message.success(preset ? `角色已创建，已套用${preset.label}预设` : '角色已创建，接下来勾选权限');
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

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
          SYSTEM / 权限配置
        </div>
        <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
          角色与权限
        </div>
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginTop: 4 }}>
          共 {allItems.length} 个权限点、{roles.length} 个角色。先选角色，再勾权限；新角色可以从老师或学员预设起步。
        </div>
      </div>

      {/* 1. 角色选择 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--bp-text-soft)' }}>角色</span>
        <span style={{ fontSize: 11, color: 'var(--bp-hint)' }}>内置角色带「预设」标签，选中后在下方微调</span>
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

      {/* 2. 权限编辑 */}
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
              </div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 3 }}>
                {editorLocked ? `共 ${allItems.length} 个权限点` : `已勾选 ${checkedCount} / ${allItems.length} 项`}
              </div>
            </div>
            {!editorLocked && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESET_KEYS.map((key) => (
                  <Button key={key} size="small" title={PRESET_META[key].hint} onClick={() => applyPreset(key)}>
                    套用预设：{PRESET_META[key].label}
                  </Button>
                ))}
                <Button size="small" onClick={clearDraft}>
                  清空
                </Button>
              </div>
            )}
          </div>

          {editorLocked && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 10 }}
              message="超级管理员拥有全部权限，不可修改"
              description="下面仅供查看。需要调整权限时，请改用老师、学员或自定义角色。"
            />
          )}

          {!editorLocked && legacyCodes.length > 0 && (
            <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--bp-hint)' }}>
              另有 {legacyCodes.length} 个历史权限串不在目录中（如 {legacyCodes.slice(0, 3).join('、')}），保存时会原样保留。
            </div>
          )}

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

          {groups.length === 0 ? (
            <div className="bp-card" style={{ padding: 40 }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="权限目录为空，请检查后端接口" />
            </div>
          ) : (
            <Collapse
              key={`${activeRole.id}-${presetVersion}`}
              ghost
              defaultActiveKey={defaultOpenKeys}
              items={groups.map((group) => {
                const items = group.permissions ?? [];
                const picked = editorLocked ? items.length : items.filter((item) => draft.has(item.code)).length;
                const allChecked = items.length > 0 && picked === items.length;
                const someChecked = picked > 0 && !allChecked;
                return {
                  key: group.group,
                  className: 'bp-card',
                  style: { marginBottom: 10 },
                  label: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="bp-title" style={{ fontSize: 13 }}>
                          {group.group}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                          已选 {picked} / {items.length}
                        </span>
                      </span>
                      {GROUP_DESCRIPTIONS[group.group] && (
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--bp-hint)' }}>
                          {GROUP_DESCRIPTIONS[group.group]}
                        </span>
                      )}
                    </div>
                  ),
                  extra: (
                    <span
                      onClick={(event) => event.stopPropagation()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Checkbox
                        checked={allChecked}
                        indeterminate={someChecked}
                        disabled={editorLocked}
                        aria-label={`全选${group.group}权限`}
                        onChange={(event) => toggleGroup(group, event.target.checked)}
                      >
                        <span style={{ fontSize: 11 }}>全选</span>
                      </Checkbox>
                    </span>
                  ),
                  children: (
                    <div>
                      {items.map((item) => {
                        const checked = editorLocked || draft.has(item.code);
                        const kind = permissionKind(item.code);
                        const menu = PERMISSION_MENU[item.code];
                        const inputId = `perm-${activeRole.id}-${item.code}`;
                        return (
                          <div
                            key={item.code}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              padding: '8px 0',
                              borderBottom: '1px dashed var(--bp-line-soft)',
                            }}
                          >
                            <Checkbox
                              id={inputId}
                              checked={checked}
                              disabled={editorLocked}
                              onChange={(event) => togglePermission(item.code, event.target.checked)}
                              style={{ marginTop: 2 }}
                            />
                            <label
                              htmlFor={inputId}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                gap: 12,
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                cursor: editorLocked ? 'default' : 'pointer',
                              }}
                            >
                              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13 }}>{item.name}</span>
                                  <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>{item.code}</span>
                                  <KindTag kind={kind} />
                                </span>
                                {item.description && (
                                  <span style={{ fontSize: 12, color: 'var(--bp-hint)' }}>{item.description}</span>
                                )}
                              </span>
                              {menu && (
                                <span
                                  style={{
                                    flexShrink: 0,
                                    maxWidth: 180,
                                    fontSize: 11,
                                    lineHeight: 1.5,
                                    color: 'var(--bp-text-soft)',
                                    textAlign: 'right',
                                  }}
                                >
                                  入口：{menu}
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  ),
                };
              })}
            />
          )}

          {!editorLocked && (
            <div
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
                已勾选 {checkedCount} / {allItems.length} 项 · 保存后相关用户需重新登录才生效
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
          initialValues={{ preset: 'blank' }}
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
            extra="用于程序内部识别，建好后不建议修改；admin / teacher / student 为内置角色"
          >
            <Input placeholder="例如：research_lead" disabled={Boolean(editingRole && isBuiltin(editingRole))} />
          </Form.Item>
          {!editingRole && (
            <Form.Item name="preset" label="以哪个预设为起点" extra="预设只是先把常见权限勾上，创建后仍可逐项调整">
              <Radio.Group>
                <Radio value="blank" title="从零开始，不预勾任何权限">
                  空白
                </Radio>
                {PRESET_KEYS.map((key) => (
                  <Radio key={key} value={key} title={PRESET_META[key].hint}>
                    {PRESET_META[key].label}
                  </Radio>
                ))}
              </Radio.Group>
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
