import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tree,
} from 'antd';
import type { TreeDataNode } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UploadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { get, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import LinkAction from '../../components/LinkAction';
import TableScrollRegion from '../../components/TableScrollRegion';
import ClassSettingsModal from './ClassSettingsModal';
import DeleteDeptDialog from './DeleteDeptDialog';
import ImportMembersModal from './ImportMembersModal';
import { PERMISSION_CODES } from '../../auth/permission-codes';

/** 与后端 ClassNodeView 对齐 */
interface ClassNode {
  id: string;
  name: string;
  parentId?: string;
  managerId?: string;
  managerName?: string;
  memberCount?: number;
  /** 班级设置回显：有效期 */
  validFrom?: string;
  validTo?: string;
  /** false = 只是路径祖先（后端为了显示被授权的子班补出来的），点它会 403 */
  accessible?: boolean;
  /**
   * 当前登录人对本班是否有写权限（后端按「本人对这个班的授权」下发）。
   * false = 只有查看权限，不能用全局 class:member:* 代替。
   */
  manageable?: boolean;
  children?: ClassNode[];
}

/** 与后端 ClassMemberView 对齐：学员的手机号就是登录账号，username 与 phone 同值 */
interface ClassMember {
  id: string;
  name?: string;
  username?: string;
  status?: number | null;
  deptId?: string;
  deptName?: string;
  phone?: string;
  email?: string;
  createAt?: string;
  roleNames?: string[];
}

/** 与后端 ClassTeacherView 对齐：id 是 t_class_partner.id（取消授权用），userId 才是用户 */
interface ClassTeacher {
  id: string;
  userId?: string;
  userName?: string;
  deptName?: string;
  /** 1 = 只读，2 = 可管理 */
  accessLevel?: number;
  createAt?: string;
}

/** 与后端 UserOptionView 对齐：id 就是用户 id，授权时直接作为 userIds 提交 */
interface TeacherOption {
  id: string;
  name?: string;
  username?: string;
  deptName?: string;
}

interface MemberFormValues {
  name: string;
  /** 手机号即登录账号，必填 */
  phone: string;
  password: string;
  email?: string;
}

const MOBILE_QUERY = '(max-width: 767.98px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

/**
 * 后端 listClassTree 返回的是嵌套树；如果哪天改成扁平列表（只有 parentId），这里按 parentId 重新组装。
 * 父节点不在结果里的节点当成根（后端只返回「可见子树 + 补出来的祖先路径」）。
 */
function normalizeTree(list: ClassNode[]): ClassNode[] {
  const nested = list.some((node) => (node.children?.length ?? 0) > 0);
  if (nested) return list;

  const map = new Map<string, ClassNode>();
  list.forEach((node) => map.set(node.id, { ...node, children: [] }));
  const roots: ClassNode[] = [];
  map.forEach((node) => {
    const parent = node.parentId ? map.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) {
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function findNode(nodes: ClassNode[], id: string): ClassNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = node.children ? findNode(node.children, id) : undefined;
    if (hit) return hit;
  }
  return undefined;
}

/**
 * 自动选中第一个叶子班。
 * 树里可能有「只是路径」的祖先节点（后端为了让被授权的班有路径可显示补出来的），
 * 点这种节点成员接口会 403，所以默认落到叶子班。
 */
function firstSelectable(nodes: ClassNode[]): ClassNode | undefined {
  for (const node of nodes) {
    const leaf = !node.children || node.children.length === 0;
    if (leaf && node.accessible !== false) return node;
    const hit = firstSelectable(node.children ?? []);
    if (hit) return hit;
  }
  return undefined;
}

function collectIds(nodes: ClassNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectIds(node.children ?? [])]);
}

/** 搜索框是客户端过滤（接口也支持 keyword，但本地过滤不用每敲一个字就打一次后端） */
function filterTree(nodes: ClassNode[], keyword: string): ClassNode[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return nodes;

  const walk = (list: ClassNode[]): ClassNode[] =>
    list.flatMap((node) => {
      // 命中的班保留完整子树，方便继续点下级班
      if ((node.name || '').toLowerCase().includes(kw)) return [node];
      const children = walk(node.children ?? []);
      return children.length > 0 ? [{ ...node, children }] : [];
    });

  return walk(nodes);
}

function toTreeData(nodes: ClassNode[]): TreeDataNode[] {
  return nodes.map((node) => ({
    key: node.id,
    // 只是路径的祖先节点不能选：点它查成员会 403
    selectable: node.accessible !== false,
    title: (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 6,
          maxWidth: '100%',
          color: node.accessible === false ? 'var(--bp-text-soft)' : undefined,
        }}
      >
        <span
          style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={node.name || '(未命名班级)'}
        >
          {node.name || '(未命名班级)'}
        </span>
        <span style={{ flex: '0 0 auto', fontSize: 11, color: 'var(--bp-text-soft)' }}>
          {node.accessible === false ? '（上级）' : `${node.memberCount ?? 0} 人`}
        </span>
      </span>
    ),
    children: node.children && node.children.length > 0 ? toTreeData(node.children) : undefined,
  }));
}

/** 后端 USER_STATUS：1 激活 / 0 失活；系统用户页把 0 展示成「待审核」，这里保持一致 */
function MemberStatus({ status }: { status?: number | null }) {
  if (status === 1) return <Tag color="success">正常</Tag>;
  if (status === 0) return <Tag color="warning">待审核</Tag>;
  return <span style={{ color: 'var(--bp-text-soft)' }}>—</span>;
}

/**
 * 班级管理（老师 / 管理员视角）。
 *
 * 权限切分：
 * - class:list          → 进页面（路由守卫）
 * - class:detail        → 看本班成员
 * - class:grant         → 看全部班级、给老师分配查看权限
 * - class:member:create → 在自己管的班里添加学员
 *
 * 数据全部来自后端（/api/teaching/classes/tree 只返回班级节点），没有班级时显示引导而不是假数据。
 */
export default function TeachingClasses() {
  const { message } = App.useApp();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  /** ?create=1 只处理一次：ref 防重复，参数用 replace 去掉，避免刷新再弹 */
  const createFromQuery = useRef(false);

  /* ---------------- 按钮级权限 ---------------- */
  const [authorities, setAuthorities] = useState<string[]>([]);
  const [authoritiesReady, setAuthoritiesReady] = useState(false);
  useEffect(() => {
    void loadAuthorities()
      .then((list) => setAuthorities(list))
      .finally(() => setAuthoritiesReady(true));
  }, []);
  // 班级页入口权限：老师有 class:list 就能自己建班（不再要求 system:dept:create）
  const canList = can(authorities, PERMISSION_CODES.classList);
  const canDetail = can(authorities, PERMISSION_CODES.classDetail);
  const canGrant = can(authorities, PERMISSION_CODES.classGrant);
  const canCreateMember = can(authorities, PERMISSION_CODES.classMemberCreate);
  // 组织设置权限（system:dept:*）留给管理员：设置弹窗可见性、删除分组
  const canDeptUpdate = can(authorities, PERMISSION_CODES.systemDeptUpdate);
  const canDeptDelete = can(authorities, PERMISSION_CODES.systemDeptDelete);
  const canMemberUpdate = can(authorities, PERMISSION_CODES.classMemberUpdate);
  const canMemberDelete = can(authorities, PERMISSION_CODES.classMemberDelete);

  /* ---------------- 班级树 ---------------- */
  const [tree, setTree] = useState<ClassNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  // loadTree 里要判断「当前选中项还在不在」，用 ref 读：把 selectedId 写进依赖会让每次选班都重新拉一次树
  const selectedIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadTree = useCallback(async (): Promise<string | undefined> => {
    setTreeLoading(true);
    try {
      const list = await get<ClassNode[]>('/api/teaching/classes/tree');
      const nodes = normalizeTree(Array.isArray(list) ? list : []);
      setTree(nodes);
      const keep = selectedIdRef.current;
      const nextId = keep && findNode(nodes, keep) ? keep : firstSelectable(nodes)?.id;
      setSelectedId(nextId);
      return nextId;
    } catch (e) {
      message.error((e as Error).message || '读取班级列表失败');
      setTree([]);
      setSelectedId(undefined);
      return undefined;
    } finally {
      setTreeLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  // 搜索/换树之后默认展开全部（班级树不该折叠，多层班级找不到）
  const visibleTree = useMemo(() => filterTree(tree, keyword), [tree, keyword]);
  useEffect(() => {
    setExpandedKeys(collectIds(visibleTree));
  }, [visibleTree]);

  const treeData = useMemo<TreeDataNode[]>(() => toTreeData(visibleTree), [visibleTree]);

  const selected = useMemo(() => (selectedId ? findNode(tree, selectedId) : undefined), [tree, selectedId]);

  /**
   * 后端按「本人对这个班的授权」下发 manageable；false 时只读。
   * 不能拿全局 class:member:* 代替：老师可能对整个模块有写权限，但只被授予了某个班的查看权。
   */
  const readOnlyClass = selected?.manageable === false;

  /* ---------------- 班级成员 ---------------- */
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);

  const loadMembers = useCallback(
    async (deptId?: string) => {
      if (!deptId || !canDetail) {
        setMembers([]);
        setMemberLoading(false);
        return;
      }
      setMemberLoading(true);
      try {
        const list = await get<ClassMember[]>('/api/teaching/classes/members', { deptId });
        setMembers(Array.isArray(list) ? list : []);
      } catch (e) {
        message.error((e as Error).message || '读取班级成员失败');
        setMembers([]);
      } finally {
        setMemberLoading(false);
      }
    },
    [canDetail, message],
  );

  useEffect(() => {
    void loadMembers(selectedId);
  }, [loadMembers, selectedId]);

  const refreshAll = async () => {
    const before = selectedId;
    const nextId = await loadTree();
    // 选中项没变时上面的 effect 不会重跑，这里手动刷新成员；变了就交给 effect
    if (nextId && nextId === before) await loadMembers(nextId);
  };

  /* ---------------- 班级设置 ---------------- */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'create' | 'edit'>('create');
  const [settingsNode, setSettingsNode] = useState<ClassNode | null>(null);
  /** 新建时的默认上级：页头按钮沿用「挂在当前选中组下」，从用户管理 ?create=1 进来时默认根级 */
  const [settingsParentId, setSettingsParentId] = useState<string>();
  /** 统一删除弹窗：本页 / 班级设置 / 用户组页三个入口共用 DeleteDeptDialog */
  const [deleteTarget, setDeleteTarget] = useState<ClassNode | null>(null);

  const openCreateClass = (parentId?: string) => {
    setSettingsMode('create');
    setSettingsNode(null);
    setSettingsParentId(parentId);
    setSettingsOpen(true);
  };

  const openClassSettings = () => {
    if (!selected) return;
    setSettingsMode('edit');
    setSettingsNode(selected);
    setSettingsOpen(true);
  };

  /**
   * 从其它入口带 ?create=1 进来：首次加载完成后自动打开新建弹窗。
   * 等 authoritiesReady（canList 依赖它）和 treeLoading（首次树加载）都结束再判断，
   * 否则会在权限还没拉到时就误判成「无权限」。
   */
  useEffect(() => {
    if (createFromQuery.current) return;
    if (searchParams.get('create') !== '1') return;
    if (!authoritiesReady || treeLoading) return;
    createFromQuery.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
    if (canList) openCreateClass();
  }, [searchParams, setSearchParams, authoritiesReady, treeLoading, canList]);

  /** 删除成功后刷新树和成员；选中项由 loadTree 重新挑，选中没变时它会补刷成员 */
  const handleClassDeleted = () => {
    void refreshAll();
  };

  /* ---------------- 添加学员 / 批量导入 ---------------- */
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberForm] = Form.useForm<MemberFormValues>();
  const [importOpen, setImportOpen] = useState(false);

  /* ---------------- 编辑/删除学员 ---------------- */
  const [editingMember, setEditingMember] = useState<ClassMember | null>(null);
  const [memberEditSaving, setMemberEditSaving] = useState(false);
  const [memberEditForm] = Form.useForm<{
    name: string;
    phone: string;
    email?: string;
    status: number;
    password?: string;
  }>();

  const openMemberModal = () => {
    memberForm.resetFields();
    setMemberOpen(true);
  };

  const submitMember = async () => {
    if (!selected || memberSaving) return;
    let values: MemberFormValues;
    try {
      values = await memberForm.validateFields();
    } catch {
      return; // 校验提示已经在字段上
    }
    setMemberSaving(true);
    try {
      await post('/api/teaching/classes/member/create', {
        deptId: selected.id,
        name: values.name.trim(),
        // 手机号即登录账号：后端不再接收 username
        phone: values.phone.trim(),
        password: values.password,
        email: values.email?.trim() || undefined,
      });
      message.success('已添加学员 ' + values.name.trim());
      setMemberOpen(false);
      await Promise.all([loadMembers(selected.id), loadTree()]);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setMemberSaving(false);
    }
  };

  const openEditMember = (row: ClassMember) => {
    setEditingMember(row);
  };

  const submitEditMember = async () => {
    if (!selected || !editingMember || memberEditSaving) return;
    let values: { name: string; phone: string; email?: string; status: number; password?: string };
    try {
      values = await memberEditForm.validateFields();
    } catch {
      return;
    }
    setMemberEditSaving(true);
    try {
      await post('/api/teaching/classes/member/update', {
        deptId: selected.id,
        id: editingMember.id,
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email?.trim() || undefined,
        status: values.status,
        password: values.password || undefined,
      });
      message.success('已保存学员信息');
      setEditingMember(null);
      await Promise.all([loadMembers(selected.id), loadTree()]);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setMemberEditSaving(false);
    }
  };

  const removeMember = async (row: ClassMember) => {
    if (!selected) return;
    try {
      await post('/api/teaching/classes/member/delete', { deptId: selected.id, id: row.id });
      message.success('已删除学员 ' + (row.name || ''));
      await Promise.all([loadMembers(selected.id), loadTree()]);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  /* ---------------- 任课老师 ---------------- */
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantSaving, setGrantSaving] = useState(false);
  const [teachers, setTeachers] = useState<ClassTeacher[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [options, setOptions] = useState<TeacherOption[]>([]);
  const [optionLoading, setOptionLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  /** 本次授权使用的级别：1 只读（默认）/ 2 可管理 */
  const [grantAccessLevel, setGrantAccessLevel] = useState<number>(1);
  const optionTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (optionTimer.current !== undefined) window.clearTimeout(optionTimer.current);
    },
    [],
  );

  const loadTeachers = useCallback(
    async (deptId: string) => {
      setTeacherLoading(true);
      try {
        const list = await get<ClassTeacher[]>('/api/teaching/classes/teachers', { deptId });
        setTeachers(Array.isArray(list) ? list : []);
      } catch (e) {
        message.error((e as Error).message || '读取已授权任课老师失败');
        setTeachers([]);
      } finally {
        setTeacherLoading(false);
      }
    },
    [message],
  );

  const loadTeacherOptions = useCallback(
    async (kw?: string) => {
      setOptionLoading(true);
      try {
        const list = await get<TeacherOption[]>('/api/teaching/classes/teacher-options', { keyword: kw });
        setOptions(Array.isArray(list) ? list : []);
      } catch (e) {
        message.error((e as Error).message || '读取老师列表失败');
        setOptions([]);
      } finally {
        setOptionLoading(false);
      }
    },
    [message],
  );

  // 选人下拉走服务端搜索（接口有 keyword + 200 条上限），这里做 250ms 防抖
  const searchTeacherOptions = (kw: string) => {
    if (optionTimer.current !== undefined) window.clearTimeout(optionTimer.current);
    optionTimer.current = window.setTimeout(() => {
      void loadTeacherOptions(kw);
    }, 250);
  };

  const openGrantModal = () => {
    if (!selected) return;
    setSelectedUserIds([]);
    setGrantAccessLevel(1);
    setGrantOpen(true);
    void loadTeachers(selected.id);
    void loadTeacherOptions('');
  };

  const closeGrantModal = () => {
    setGrantOpen(false);
    setSelectedUserIds([]);
  };

  const removeTeacher = async (row: ClassTeacher) => {
    if (!selected) return;
    try {
      await post('/api/teaching/classes/partner/delete', { deptId: selected.id, id: row.id });
      message.success('已取消 ' + (row.userName || '该老师') + ' 的查看权限');
      await loadTeachers(selected.id);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const submitGrant = async () => {
    if (!selected || grantSaving) return;
    if (selectedUserIds.length === 0) {
      message.warning('请先选择要授权的老师');
      return;
    }
    setGrantSaving(true);
    try {
      await post('/api/teaching/classes/partner/create', {
        deptId: selected.id,
        userIds: selectedUserIds,
        accessLevel: grantAccessLevel,
      });
      message.success(
        '已授权 ' + selectedUserIds.length + ' 位老师（' + (grantAccessLevel === 2 ? '可管理' : '只读') + '）',
      );
      setSelectedUserIds([]);
      await Promise.all([loadTeachers(selected.id), loadTeacherOptions('')]);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setGrantSaving(false);
    }
  };

  /** 切换已授权任课老师的级别：1 只读 / 2 可管理，成功后刷新列表 */
  const updateTeacherLevel = async (row: ClassTeacher) => {
    if (!selected) return;
    const next = row.accessLevel === 2 ? 1 : 2;
    try {
      await post('/api/teaching/classes/partner/update', {
        deptId: selected.id,
        id: row.id,
        accessLevel: next,
      });
      message.success('已把「' + (row.userName || '该老师') + '」设为' + (next === 2 ? '可管理' : '只读'));
      await loadTeachers(selected.id);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  // 已授权的老师不再出现在候选里，避免重复提交
  const teacherOptionData = useMemo(() => {
    const granted = new Set(teachers.map((t) => t.userId));
    return options
      .filter((o) => !granted.has(o.id))
      .map((o) => ({
        value: o.id,
        label:
          (o.name || '(未命名)') +
          (o.username ? '（' + o.username + '）' : '') +
          (o.deptName ? ' · ' + o.deptName : ''),
      }));
  }, [options, teachers]);

  const memberColumns: ColumnsType<ClassMember> = [
    { title: '姓名', dataIndex: 'name', width: 120, render: (v?: string) => v || '—' },
    // 手机号即登录账号，两列同值：合并成一列，避免重复展示
    {
      title: '手机号 / 登录账号',
      key: 'account',
      width: 170,
      render: (_: unknown, row: ClassMember) => row.phone || row.username || '—',
    },
    { title: '状态', dataIndex: 'status', width: 100, render: (v?: number | null) => <MemberStatus status={v} /> },
    {
      title: '角色',
      dataIndex: 'roleNames',
      width: 220,
      render: (names?: string[]) =>
        names && names.length ? (
          <Space size={4} wrap>
            {names.map((name) => (
              <Tag key={name} color="blue">
                {name}
              </Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: 'var(--bp-text-soft)' }}>—</span>
        ),
    },
    { title: '加入时间', dataIndex: 'createAt', width: 160, render: (v?: string) => v || '—' },
    ...((canMemberUpdate || canMemberDelete) && !readOnlyClass
      ? [
          {
            title: '操作',
            key: 'memberOps',
            width: 120,
            render: (_: unknown, row: ClassMember) => (
              <Space size={8}>
                {canMemberUpdate && <LinkAction onClick={() => openEditMember(row)}>编辑</LinkAction>}
                {canMemberDelete && (
                  <Popconfirm
                    title={`删除学员「${row.name || row.username || '该学员'}」？`}
                    description="账号会被删除，无法再登录；不可恢复。"
                    okText="删除"
                    okButtonProps={{ danger: true }}
                    cancelText="取消"
                    onConfirm={() => removeMember(row)}
                  >
                    <LinkAction style={{ color: 'var(--bp-orange)' }}>删除</LinkAction>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  const teacherColumns: ColumnsType<ClassTeacher> = [
    { title: '老师', dataIndex: 'userName', render: (v?: string) => v || '—' },
    { title: '所属组', dataIndex: 'deptName', width: 130, render: (v?: string) => v || '—' },
    {
      title: '权限',
      dataIndex: 'accessLevel',
      width: 100,
      render: (v?: number) => <Tag color={v === 2 ? 'orange' : 'blue'}>{v === 2 ? '可管理' : '只读'}</Tag>,
    },
    { title: '授权时间', dataIndex: 'createAt', width: 160, render: (v?: string) => v || '—' },
    {
      title: '操作',
      key: 'ops',
      width: 170,
      render: (_: unknown, row) => (
        <Space size={12}>
          <LinkAction onClick={() => void updateTeacherLevel(row)}>
            {row.accessLevel === 2 ? '设为只读' : '设为可管理'}
          </LinkAction>
          <Popconfirm
            title={'取消「' + (row.userName || '该老师') + '」的查看权限？'}
            okText="取消授权"
            okButtonProps={{ danger: true }}
            cancelText="保留"
            onConfirm={() => removeTeacher(row)}
          >
            <LinkAction style={{ color: 'var(--bp-orange)' }}>取消授权</LinkAction>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            CLASS / 班级管理
          </div>
          <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
            班级管理
          </h2>
          <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
            班级是学员的教学单位：维护学员、任课老师；题库/考试/问卷在资源授权里分配
          </div>
        </div>
        <Space wrap>
          {canList && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateClass(selected?.id)}>
              新建班级
            </Button>
          )}
          <Button icon={<ReloadOutlined />} loading={treeLoading} onClick={() => void refreshAll()}>
            刷新
          </Button>
        </Space>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <Card
          className="bp-card bp-corners"
          size="small"
          title={
            <span className="bp-title" style={{ fontSize: 13 }}>
              我的班级
            </span>
          }
          style={{ width: isMobile ? '100%' : 260, flex: isMobile ? '1 1 100%' : '0 0 260px' }}
          styles={{ body: { padding: '10px 8px' } }}
        >
          <Input
            allowClear
            size="small"
            aria-label="搜索班级名称"
            placeholder="搜索班级名称"
            prefix={<SearchOutlined style={{ color: 'var(--bp-text-soft)' }} />}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div style={{ maxHeight: isMobile ? 300 : 520, overflowY: 'auto' }}>
            {treeLoading && tree.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Spin />
              </div>
            ) : visibleTree.length === 0 ? (
              <div style={{ padding: '16px 4px' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                      {tree.length > 0 ? '没有匹配的班级' : '还没有可管理的班级，请联系管理员分配'}
                    </span>
                  }
                />
              </div>
            ) : (
              <Tree
                blockNode
                style={{ background: 'transparent', fontSize: 13 }}
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys.map(String))}
                selectedKeys={selectedId ? [selectedId] : []}
                onSelect={(keys) => {
                  // 再点一次同一个节点会取消选中，这里保持选中不丢
                  if (keys.length > 0) setSelectedId(String(keys[0]));
                }}
              />
            )}
          </div>
        </Card>

        <Card
          className="bp-card bp-corners"
          size="small"
          style={{ width: isMobile ? '100%' : undefined, flex: '1 1 auto', minWidth: 0 }}
          styles={{ body: { padding: 14 } }}
        >
          {!selected ? (
            <div style={{ padding: '40px 0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                    {treeLoading ? '正在读取班级…' : '从左侧选择一个班级'}
                  </span>
                }
              />
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <div className="bp-title" style={{ fontSize: 15 }}>
                    {selected.name || '(未命名班级)'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 14,
                      flexWrap: 'wrap',
                      fontSize: 12,
                      color: 'var(--bp-text-soft)',
                      marginTop: 6,
                    }}
                  >
                    <span>负责人：{selected.managerName || '未设置'}</span>
                    <span>成员：{selected.memberCount ?? 0} 人</span>
                  </div>
                </div>
                <Space wrap>
                  {canCreateMember && !readOnlyClass && (
                    <Button type="primary" icon={<UserAddOutlined />} onClick={openMemberModal}>
                      添加学员
                    </Button>
                  )}
                  {canCreateMember && !readOnlyClass && (
                    <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
                      批量导入
                    </Button>
                  )}
                  {canGrant && (
                    <Button icon={<TeamOutlined />} onClick={openGrantModal}>
                      任课老师
                    </Button>
                  )}
                  {/* 管理员，或老师自己建/被授「可管理」的班（manageable=true）都能改班级设置 */}
                  {(canDeptUpdate || selected.manageable === true) && (
                    <Button icon={<SettingOutlined />} onClick={openClassSettings}>
                      班级设置
                    </Button>
                  )}
                  {canDeptDelete && (
                    <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteTarget(selected)}>
                      删除分组
                    </Button>
                  )}
                </Space>
              </div>

              {readOnlyClass && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="info"
                  showIcon
                  message="你对该班级只有查看权限"
                  description="成员名单和学情仍可查看；添加学员、批量导入、编辑和删除需要「可管理」级别的授权。"
                />
              )}

              <hr className="bp-dim" style={{ margin: '14px 0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <span className="bp-title" style={{ fontSize: 13 }}>
                  班级成员
                </span>
                <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {members.length} 人</span>
                <div style={{ flex: 1 }} />
                {canDetail && (
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    loading={memberLoading}
                    onClick={() => void loadMembers(selected.id)}
                  >
                    刷新成员
                  </Button>
                )}
              </div>

              {!canDetail ? (
                <div style={{ padding: '30px 0' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                        没有查看班级成员的权限（需要 class:detail）
                      </span>
                    }
                  />
                </div>
              ) : (
                <TableScrollRegion label="班级成员（可横向滚动）">
                  <Table<ClassMember>
                    rowKey={(row) => row.id || row.username || ''}
                    size="small"
                    loading={memberLoading}
                    dataSource={members}
                    columns={memberColumns}
                    scroll={{ x: 1000 }}
                    pagination={{ pageSize: 10, hideOnSinglePage: true, size: 'small' }}
                    locale={{
                      emptyText: (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这个班级还没有学员" />
                      ),
                    }}
                  />
                </TableScrollRegion>
              )}
            </>
          )}
        </Card>
      </div>

      <Modal
        title={'添加学员' + (selected?.name ? '：' + selected.name : '')}
        open={memberOpen}
        onCancel={() => setMemberOpen(false)}
        onOk={() => void submitMember()}
        confirmLoading={memberSaving}
        okText="添加"
        cancelText="取消"
        width={isMobile ? '94%' : 520}
        destroyOnClose
      >
        <Form form={memberForm} layout="vertical" size="small" preserve={false} requiredMark={false}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, whitespace: true, message: '请填写学员姓名' }]}>
            <Input placeholder="例如：张三" maxLength={40} autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请填写手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入 11 位手机号' },
            ]}
            extra="手机号即登录账号，学员用手机号登录；不能与已有账号重复"
          >
            <Input placeholder="11 位手机号" maxLength={11} autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="password"
            label="初始密码"
            rules={[
              { required: true, message: '请填写初始密码' },
              { min: 8, message: '密码至少 8 位' },
            ]}
            extra="至少 8 位；学员登录后可在「账号设置」里自行修改"
          >
            <Input.Password placeholder="8-32 位" maxLength={32} autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入正确的邮箱' }]}>
            <Input placeholder="选填" maxLength={80} autoComplete="off" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={'编辑学员' + (editingMember?.name ? '：' + editingMember.name : '')}
        open={Boolean(editingMember)}
        onCancel={() => setEditingMember(null)}
        onOk={() => void submitEditMember()}
        confirmLoading={memberEditSaving}
        okText="保存"
        cancelText="取消"
        width={isMobile ? '94%' : 520}
        destroyOnClose
      >
        <Form
          key={editingMember?.id || 'new'}
          form={memberEditForm}
          layout="vertical"
          size="small"
          preserve={false}
          requiredMark={false}
          initialValues={{
            name: editingMember?.name || '',
            phone: editingMember?.phone,
            email: editingMember?.email,
            status: editingMember?.status ?? 1,
            password: undefined,
          }}
        >
          <Form.Item name="name" label="姓名" rules={[{ required: true, whitespace: true, message: '请填写学员姓名' }]}>
            <Input placeholder="例如：张三" maxLength={40} autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请填写手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入 11 位手机号' },
            ]}
            extra="手机号即登录账号，修改手机号会同步修改登录账号"
          >
            <Input placeholder="11 位手机号" maxLength={11} autoComplete="off" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入正确的邮箱' }]}>
            <Input placeholder="选填" maxLength={80} autoComplete="off" />
          </Form.Item>
          <Form.Item name="status" label="账号状态">
            <Select
              options={[
                { value: 1, label: '正常（可登录）' },
                { value: 0, label: '停用（不能登录）' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="重置密码"
            rules={[{ min: 8, message: '密码至少 8 位' }]}
            extra="留空表示不修改；重置后请让学员用新密码登录"
          >
            <Input.Password placeholder="8-32 位，留空不改" maxLength={32} autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={'任课老师' + (selected?.name ? '：' + selected.name : '')}
        open={grantOpen}
        onCancel={closeGrantModal}
        footer={null}
        width={isMobile ? '94%' : 680}
        destroyOnClose
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
          只读：可以查看本班（含下级班）的成员与学情；可管理：还能添加、编辑学员。两种级别都不能修改班级设置。
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className="bp-title" style={{ fontSize: 13 }}>
            已授权任课老师
          </span>
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {teachers.length} 人</span>
        </div>

        <TableScrollRegion label="已授权任课老师（可横向滚动）">
          <Table<ClassTeacher>
            rowKey="id"
            size="small"
            loading={teacherLoading}
            dataSource={teachers}
            columns={teacherColumns}
            pagination={false}
            scroll={{ x: 620 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这个班级还没有任课老师" />,
            }}
          />
        </TableScrollRegion>

        <hr className="bp-dim" style={{ margin: '14px 0' }} />

        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 8 }}>添加任课老师</div>
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 6 }}>
          权限级别（本次授权的老师都使用这个级别）
        </div>
        <Radio.Group
          value={grantAccessLevel}
          onChange={(event) => setGrantAccessLevel(Number(event.target.value))}
          style={{ marginBottom: 10 }}
        >
          <Space size={16} wrap>
            <Radio value={1}>只读</Radio>
            <Radio value={2}>可管理</Radio>
          </Space>
        </Radio.Group>
        <Select
          mode="multiple"
          showSearch
          allowClear
          style={{ width: '100%' }}
          placeholder="输入姓名搜索老师，可多选"
          value={selectedUserIds}
          onChange={(value: string[]) => setSelectedUserIds(value)}
          onSearch={searchTeacherOptions}
          filterOption={false}
          loading={optionLoading}
          options={teacherOptionData}
          notFoundContent={optionLoading ? <Spin size="small" /> : '没有匹配的老师'}
          aria-label="选择要授权的老师"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={closeGrantModal}>关闭</Button>
          <Button
            type="primary"
            loading={grantSaving}
            disabled={selectedUserIds.length === 0}
            onClick={() => void submitGrant()}
          >
            授权{selectedUserIds.length > 0 ? '（' + selectedUserIds.length + '）' : ''}
          </Button>
        </div>
      </Modal>

      <ImportMembersModal
        open={importOpen}
        deptId={selected?.id ?? ''}
        deptName={selected?.name}
        onClose={() => setImportOpen(false)}
        onImported={() => void refreshAll()}
      />

      <DeleteDeptDialog
        open={Boolean(deleteTarget)}
        deptId={deleteTarget?.id ?? ''}
        deptName={deleteTarget?.name}
        deptType="class"
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleClassDeleted}
      />

      <ClassSettingsModal
        open={settingsOpen}
        mode={settingsMode}
        node={settingsNode}
        defaultParentId={settingsParentId}
        tree={tree}
        canDelete={canDeptDelete}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => void refreshAll()}
      />
    </div>
  );
}
