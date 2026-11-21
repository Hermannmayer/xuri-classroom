import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  App,
  Badge,
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
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SettingOutlined, TeamOutlined, UploadOutlined, UserAddOutlined } from '@ant-design/icons';
import { get, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import LinkAction from '../../components/LinkAction';
import TableScrollRegion from '../../components/TableScrollRegion';
import ClassResourcesPanel from './ClassResourcesPanel';
import ClassSettingsModal from './ClassSettingsModal';
import DeleteDeptDialog from './DeleteDeptDialog';
import ImportMembersModal from './ImportMembersModal';
import { PERMISSION_CODES } from '../../auth/permission-codes';


interface ClassNode {
  id: string;
  name: string;
  parentId?: string;
  managerId?: string;
  managerName?: string;
  memberCount?: number;

  classKind?: 'group' | 'teaching';

  allowRegister?: boolean;

  validFrom?: string;
  validTo?: string;

  accessible?: boolean;




  manageable?: boolean;
  children?: ClassNode[];
}


interface ClassMember {
  id: string;
  name?: string;
  username?: string;
  status?: number | null;
  deptId?: string;
  deptName?: string;

  primaryDeptId?: string;
  primaryDeptName?: string;

  extraDeptIds?: string[];
  extraDeptNames?: string[];
  primary?: boolean;
  classCount?: number;
  canAssign?: boolean;
  phone?: string;
  email?: string;
  createAt?: string;
  roleNames?: string[];
}


interface ClassTeacher {
  id: string;
  userId?: string;
  userName?: string;
  deptName?: string;

  accessLevel?: number;
  createAt?: string;
}


interface TeacherOption {
  id: string;
  name?: string;
  username?: string;
  deptName?: string;
}

interface MemberFormValues {
  name: string;

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

/** 后端 listClassTree 返回的是嵌套树；如果哪天改成扁平列表（只有 parentId），这里按 parentId 重新组装 */
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

/** 自动选中第一个叶子班 */
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

      if ((node.name || '').toLowerCase().includes(kw)) return [node];
      const children = walk(node.children ?? []);
      return children.length > 0 ? [{ ...node, children }] : [];
    });

  return walk(nodes);
}

function toTreeData(nodes: ClassNode[]): TreeDataNode[] {
  return nodes.map((node) => ({
    key: node.id,

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
        {node.classKind === 'group' ? (
          <Tag color="default" style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>
            容器
          </Tag>
        ) : (
          <Tag color="blue" style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>
            教学班
          </Tag>
        )}
        {node.allowRegister && node.classKind !== 'group' && (
          <Tag color="green" style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>
            开放注册
          </Tag>
        )}
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

/** 班级管理（老师 / 管理员视角） */
export default function TeachingClasses({ embedded = false }: { embedded?: boolean }) {
  const { message } = App.useApp();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const createFromQuery = useRef(false);


  const [authorities, setAuthorities] = useState<string[]>([]);
  const [authoritiesReady, setAuthoritiesReady] = useState(false);
  useEffect(() => {
    void loadAuthorities()
      .then((list) => setAuthorities(list))
      .finally(() => setAuthoritiesReady(true));
  }, []);

  const canList = can(authorities, PERMISSION_CODES.classList);
  const canDetail = can(authorities, PERMISSION_CODES.classDetail);
  const canGrant = can(authorities, PERMISSION_CODES.classGrant);
  const canCreateMember = can(authorities, PERMISSION_CODES.classMemberCreate);
  const canApprove = can(authorities, PERMISSION_CODES.classMemberApprove);
  const canAssign = can(authorities, PERMISSION_CODES.classMemberAssign);

  const canDeptUpdate = can(authorities, PERMISSION_CODES.systemDeptUpdate);
  const canDeptDelete = can(authorities, PERMISSION_CODES.systemDeptDelete);
  const canMemberUpdate = can(authorities, PERMISSION_CODES.classMemberUpdate);
  const canMemberDelete = can(authorities, PERMISSION_CODES.classMemberDelete);


  const [tree, setTree] = useState<ClassNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [globalRegisterEnabled, setGlobalRegisterEnabled] = useState<boolean>();
  const [keyword, setKeyword] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);



  const routeParams = useParams<{ classId?: string }>();
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => routeParams.classId || searchParams.get('classId') || undefined,
  );
  useEffect(() => {
    setSelectedMemberKeys([]);
  }, [selectedId]);

  const selectedIdRef = useRef<string | undefined>(undefined);

  const isMobileRef = useRef(isMobile);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);








  useEffect(() => {
    if (treeLoading) return;
    const inTree = selectedId && findNode(tree, selectedId) ? selectedId : undefined;
    if (inTree === (searchParams.get('classId') || undefined)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (inTree) next.set('classId', inTree);
        else next.delete('classId');
        return next;
      },
      { replace: true },
    );
  }, [selectedId, tree, treeLoading, searchParams, setSearchParams]);

  const loadTree = useCallback(async (): Promise<string | undefined> => {
    setTreeLoading(true);
    try {
      const list = await get<ClassNode[]>('/api/teaching/classes/tree');
      const nodes = normalizeTree(Array.isArray(list) ? list : []);
      setTree(nodes);
      const keep = selectedIdRef.current;


      const nextId = keep && findNode(nodes, keep) ? keep : isMobileRef.current ? undefined : firstSelectable(nodes)?.id;
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
    get<{ globalEnabled: boolean }>('/api/public/registerOptions')
      .then((options) => setGlobalRegisterEnabled(Boolean(options?.globalEnabled)))
      .catch(() => setGlobalRegisterEnabled(undefined));
  }, [loadTree]);

  // 搜索/换树之后默认展开全部（班级树不该折叠，多层班级找不到）
  const visibleTree = useMemo(() => filterTree(tree, keyword), [tree, keyword]);
  useEffect(() => {
    setExpandedKeys(collectIds(visibleTree));
  }, [visibleTree]);

  const treeData = useMemo<TreeDataNode[]>(() => toTreeData(visibleTree), [visibleTree]);
  const targetClassOptions = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    const walk = (nodes: ClassNode[], prefix: string) => {
      for (const node of nodes) {
        const label = prefix ? prefix + ' / ' + node.name : node.name;
        if (node.id !== selectedId && node.accessible !== false && node.manageable !== false && node.classKind !== 'group') {
          result.push({ value: node.id, label });
        }
        walk(node.children ?? [], label);
      }
    };
    walk(tree, '');
    return result;
  }, [tree, selectedId]);
  /** 手机端班级卡片：容器班当分组标题，教学班一张卡一行，点击进详情 */
  const mobileClassList = useMemo(() => {
    const out: Array<{ node: ClassNode; depth: number }> = [];
    const walk = (nodes: ClassNode[], depth: number) => {
      for (const node of nodes) {
        out.push({ node, depth });
        if (node.children?.length) walk(node.children, depth + 1);
      }
    };
    walk(visibleTree, 0);
    return out;
  }, [visibleTree]);

  const hasOpenRegisterClass = useMemo(() => {
    const walk = (nodes: ClassNode[]): boolean =>
      nodes.some((node) => Boolean(node.allowRegister) || walk(node.children ?? []));
    return walk(tree);
  }, [tree]);

  const selected = useMemo(() => (selectedId ? findNode(tree, selectedId) : undefined), [tree, selectedId]);





  const readOnlyClass = selected?.manageable === false;


  const [members, setMembers] = useState<ClassMember[]>([]);
  const [selectedMemberKeys, setSelectedMemberKeys] = useState<string[]>([]);

  const [detailTab, setDetailTab] = useState<'members' | 'exams'>('members');
  const [batchAction, setBatchAction] = useState<'transfer' | 'add' | 'delete'>();
  const [batchTarget, setBatchTarget] = useState<string>();
  const [batchDeleteInput, setBatchDeleteInput] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);

  const loadMembers = useCallback(
    async (deptId?: string) => {
      if (!deptId || !canDetail || selected?.classKind === 'group') {
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
    [canDetail, message, selected?.classKind],
  );

  useEffect(() => {
    void loadMembers(selectedId);
  }, [loadMembers, selectedId]);

  const refreshAll = async () => {
    const before = selectedId;
    const nextId = await loadTree();

    if (nextId && nextId === before) await loadMembers(nextId);
  };


  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pending, setPending] = useState<ClassMember[]>([]);

  const [pendingDept, setPendingDept] = useState<Record<string, string>>({});
  const [approvingId, setApprovingId] = useState<string>();

  const classOptions = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    const walk = (nodes: ClassNode[], prefix: string) => {
      nodes.forEach((node) => {
        const name = node.name || '(未命名班级)';
        const label = prefix ? `${prefix} / ${name}` : name;

        if (node.classKind !== 'group') result.push({ value: node.id, label });
        if (node.children?.length) walk(node.children, label);
      });
    };
    walk(tree, '');
    return result;
  }, [tree]);

  const loadPending = useCallback(async () => {
    if (!canDetail) {
      setPending([]);
      return;
    }
    setPendingLoading(true);
    try {
      const list = await get<ClassMember[]>('/api/teaching/classes/pending-students');
      const rows = Array.isArray(list) ? list : [];
      setPending(rows);
      setPendingDept((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          if (!next[row.id]) next[row.id] = row.deptId || selected?.id || '';
        });
        return next;
      });
    } catch (e) {
      message.error((e as Error).message || '读取待审核学员失败');
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  }, [canDetail, message, selected?.id]);

  useEffect(() => {
    if (canDetail) void loadPending();
  }, [canDetail, loadPending]);

  const openPending = () => {
    setPendingOpen(true);
    void loadPending();
  };

  const approvePending = async (row: ClassMember) => {
    if (!canApprove) return;

    const currentValid = classOptions.some((option) => option.value === row.deptId);
    const deptId = pendingDept[row.id] || (currentValid ? row.deptId : undefined);
    if (!deptId) {
      message.warning('请先为这个学员选择教学班');
      return;
    }
    setApprovingId(row.id);
    try {
      await post('/api/teaching/classes/pending-students/approve', { userId: row.id, deptId });
      message.success('已通过 ' + (row.name || row.phone || '该学员') + ' 的注册申请');
      setPending((prev) => prev.filter((item) => item.id !== row.id));
      await loadTree();
      if (selected?.id === deptId) await loadMembers(deptId);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setApprovingId(undefined);
    }
  };

  const rejectPending = async (row: ClassMember) => {
    try {
      await post('/api/teaching/classes/pending-students/reject', { userId: row.id });
      message.success('已拒绝 ' + (row.name || row.phone || '该学员') + ' 的注册申请');
      setPending((prev) => prev.filter((item) => item.id !== row.id));
      await loadTree();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const pendingColumns: ColumnsType<ClassMember> = [
    { title: '姓名', dataIndex: 'name', width: 110, render: (v?: string) => v || '—' },
    {
      title: '手机号 / 登录账号',
      key: 'account',
      width: 150,
      render: (_: unknown, row) => row.phone || row.username || '—',
    },
    { title: '注册时间', dataIndex: 'createAt', width: 150, render: (v?: string) => v || '—' },
    {
      title: '注册班级',
      key: 'dept',
      width: 220,
      render: (_: unknown, row) =>
        canApprove ? (
          <Select
            size="small"
            showSearch
            optionFilterProp="label"
            value={
              pendingDept[row.id] ||
              (classOptions.some((option) => option.value === row.deptId) ? row.deptId : undefined)
            }
            placeholder={row.deptName ? '原申请：' + row.deptName + '（请改选教学班）' : '选择教学班'}
            style={{ width: '100%' }}
            options={classOptions}
            onChange={(value: string) => setPendingDept((prev) => ({ ...prev, [row.id]: value }))}
            aria-label={'为 ' + (row.name || '该学员') + ' 选择班级'}
          />
        ) : (
          row.deptName || '—'
        ),
    },
    {
      title: '操作',
      key: 'ops',
      width: 170,
      render: (_: unknown, row) =>
        canApprove ? (
          <Space size={8}>
            <Button
              type="primary"
              size="small"
              loading={approvingId === row.id}
              onClick={() => void approvePending(row)}
            >
              通过
            </Button>
            <Popconfirm
              title={'拒绝「' + (row.name || row.phone || '该学员') + '」的注册申请？'}
              description="账号会被删除，手机号可以重新注册；不可恢复。已审核通过的学员不能在这里拒绝。"
              okText="拒绝并删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => void rejectPending(row)}
            >
              <LinkAction style={{ color: 'var(--bp-orange)' }}>拒绝</LinkAction>
            </Popconfirm>
          </Space>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>只读</span>
        ),
    },
  ];



  const [assignTarget, setAssignTarget] = useState<ClassMember | null>(null);
  const [assignPrimary, setAssignPrimary] = useState<string>();
  const [assignExtras, setAssignExtras] = useState<string[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);

  const openAssign = (row: ClassMember) => {
    setAssignTarget(row);
    setAssignPrimary(row.primaryDeptId || row.deptId || '');
    setAssignExtras(row.extraDeptIds ?? []);
  };

  const closeAssign = () => {
    setAssignTarget(null);
    setAssignPrimary(undefined);
    setAssignExtras([]);
  };

  const submitAssign = async () => {
    if (!assignTarget || !assignPrimary || assignSaving) return;
    if (assignExtras.length > 2) {
      message.warning('兼报班最多 2 个，加上主班一共最多 3 个班');
      return;
    }
    if (assignExtras.includes(assignPrimary)) {
      message.warning('兼报班不能和主班相同');
      return;
    }
    setAssignSaving(true);
    try {
      await post('/api/teaching/classes/member/assign', {
        userId: assignTarget.id,
        primaryDeptId: assignPrimary,
        extraDeptIds: assignExtras,
      });
      message.success('已更新班级归属');
      closeAssign();
      await Promise.all([loadMembers(selected?.id), loadTree()]);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setAssignSaving(false);
    }
  };

  const removeExtraMember = async (row: ClassMember) => {
    if (!selected) return;
    try {
      await post('/api/teaching/classes/member/remove-extra', { deptId: selected.id, id: row.id });
      message.success('已把「' + (row.name || row.username || '该学员') + '」移出本班');
      await Promise.all([loadMembers(selected.id), loadTree()]);
    } catch (e) {
      message.error((e as Error).message);
    }
  };


  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'create' | 'edit'>('create');
  const [settingsNode, setSettingsNode] = useState<ClassNode | null>(null);

  const [settingsParentId, setSettingsParentId] = useState<string>();

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






  useEffect(() => {
    if (createFromQuery.current) return;
    if (searchParams.get('create') !== '1') return;
    if (!authoritiesReady || treeLoading) return;
    createFromQuery.current = true;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('create');
        return next;
      },
      { replace: true },
    );
    if (canList) openCreateClass();
  }, [searchParams, setSearchParams, authoritiesReady, treeLoading, canList]);

  /** 删除成功后刷新树和成员；选中项由 loadTree 重新挑，选中没变时它会补刷成员 */
  const handleClassDeleted = () => {
    void refreshAll();
  };


  const [memberOpen, setMemberOpen] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberForm] = Form.useForm<MemberFormValues>();
  const [importOpen, setImportOpen] = useState(false);


  const [editingMember, setEditingMember] = useState<ClassMember | null>(null);
  const [memberEditSaving, setMemberEditSaving] = useState(false);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<ClassMember | null>(null);
  const [deleteMemberInput, setDeleteMemberInput] = useState('');
  const [deleteMemberSaving, setDeleteMemberSaving] = useState(false);
  const [memberEditForm] = Form.useForm<{
    name: string;
    phone: string;
    email?: string;
    status: number;
    password?: string;
  }>();

  // 弹窗里的 Form 要等 open=true 才会挂载；在挂载之前 resetFields 既会触发 antd 的 「Instance created by useForm is not connected to any Form element」告警，也清不掉上一轮的残留值。

  const openMemberModal = () => {
    setMemberOpen(true);
  };

  useEffect(() => {
    if (memberOpen) {
      memberForm.resetFields();
    }
  }, [memberOpen, memberForm]);

  const submitMember = async () => {
    if (!selected || memberSaving) return;
    let values: MemberFormValues;
    try {
      values = await memberForm.validateFields();
    } catch {
      return;
    }
    setMemberSaving(true);
    try {
      await post('/api/teaching/classes/member/create', {
        deptId: selected.id,
        name: values.name.trim(),

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



  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [candidateSource, setCandidateSource] = useState<string>();
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [candidates, setCandidates] = useState<ClassMember[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateSelected, setCandidateSelected] = useState<string[]>([]);
  const [addingExisting, setAddingExisting] = useState(false);

  const openAddExisting = () => {
    setAddExistingOpen(true);
    setCandidateSource(undefined);
    setCandidateKeyword('');
    setCandidates([]);
    setCandidateSelected([]);
  };

  const loadCandidates = useCallback(async () => {
    if (!selected || !candidateSource) {
      setCandidates([]);
      return;
    }
    setCandidateLoading(true);
    try {
      const list = await get<ClassMember[]>('/api/teaching/classes/member/candidates', {
        targetDeptId: selected.id,
        sourceDeptId: candidateSource,
        keyword: candidateKeyword.trim() || undefined,
      });
      setCandidates(Array.isArray(list) ? list : []);
    } catch (e) {
      message.error((e as Error).message || '读取候选学员失败');
      setCandidates([]);
    } finally {
      setCandidateLoading(false);
    }
  }, [candidateKeyword, candidateSource, message, selected]);

  useEffect(() => {
    if (!addExistingOpen || !candidateSource) {
      setCandidates([]);
      return;
    }
    const timer = window.setTimeout(() => void loadCandidates(), 250);
    return () => window.clearTimeout(timer);
  }, [addExistingOpen, candidateSource, candidateKeyword, loadCandidates]);

  const submitAddExisting = async () => {
    if (!selected || !candidateSource || candidateSelected.length === 0 || addingExisting) return;
    setAddingExisting(true);
    try {
      const result = await post<{ added: number; skipped?: { name?: string; reason?: string }[] }>(
        '/api/teaching/classes/member/add-existing',
        { deptId: selected.id, sourceDeptId: candidateSource, userIds: candidateSelected },
      );
      if (result.added > 0) {
        message.success('已把 ' + result.added + ' 名学员加入本班（兼报）');
      }
      if (result.skipped?.length) {
        message.warning(
          '跳过 ' + result.skipped.length + ' 人：' +
            result.skipped.map((item) => (item.name || '') + '（' + (item.reason || '') + '）').join('、'),
        );
      }
      setCandidateSelected([]);
      setAddExistingOpen(false);
      await Promise.all([loadMembers(selected.id), loadTree()]);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setAddingExisting(false);
    }
  };

  const candidateColumns: ColumnsType<ClassMember> = [
    { title: '姓名', dataIndex: 'name', width: 110, render: (v?: string) => v || '—' },
    {
      title: '手机号 / 登录账号',
      key: 'account',
      width: 150,
      render: (_: unknown, row) => row.phone || row.username || '—',
    },
    { title: '主班', dataIndex: 'primaryDeptName', width: 150, render: (v?: string) => v || '未分班' },
    {
      title: '已加入',
      key: 'classCount',
      width: 110,
      render: (_: unknown, row) => {
        const count = row.classCount ?? 1;
        return (
          <Tag color={count >= 3 ? 'orange' : 'blue'}>
            {count} / 3 个班
          </Tag>
        );
      },
    },
    { title: '状态', dataIndex: 'status', width: 90, render: (v?: number | null) => <MemberStatus status={v} /> },
  ];

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

  const openDeleteMember = (row: ClassMember) => {
    setDeleteMemberTarget(row);
    setDeleteMemberInput('');
  };

  const removeMember = async () => {
    if (!selected || !deleteMemberTarget) return;
    const typed = deleteMemberInput.trim();
    const name = (deleteMemberTarget.name || '').trim();
    const phone = (deleteMemberTarget.phone || '').trim();
    if (!typed || (typed !== name && typed !== phone)) {
      message.warning('请输入该学员的姓名或手机号确认删除');
      return;
    }
    setDeleteMemberSaving(true);
    try {
      await post('/api/teaching/classes/member/delete', { deptId: selected.id, id: deleteMemberTarget.id });
      message.success('已删除学员 ' + (deleteMemberTarget.name || ''));
      setDeleteMemberTarget(null);
      setDeleteMemberInput('');
      await Promise.all([loadMembers(selected.id), loadTree()]);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setDeleteMemberSaving(false);
    }
  };


  const [grantOpen, setGrantOpen] = useState(false);
  const [grantSaving, setGrantSaving] = useState(false);
  const [teachers, setTeachers] = useState<ClassTeacher[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [options, setOptions] = useState<TeacherOption[]>([]);
  const [optionLoading, setOptionLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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

  const selectedMembers = members.filter((row) => selectedMemberKeys.includes(row.id || row.username || ''));

  const batchMemberStatus = async (status: number) => {
    if (!selected || !selectedMembers.length) return;
    try {
      for (const row of selectedMembers) {
        if (!row.primary) continue;
        await post('/api/teaching/classes/member/update', {
          deptId: selected.id,
          id: row.id,
          name: row.name,
          phone: row.phone,
          status,
        });
      }
      message.success(status === 1 ? '已批量启用学员' : '已批量停用学员');
      setSelectedMemberKeys([]);
      await Promise.all([loadMembers(selected.id), loadTree()]);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const openBatchAction = (action: 'transfer' | 'add' | 'delete') => {
    setBatchAction(action);
    setBatchTarget(undefined);
    setBatchDeleteInput('');
  };

  const submitBatchMemberAction = async () => {
    if (!selected || !batchAction || !selectedMembers.length || batchSaving) return;
    if (batchAction === 'delete' && batchDeleteInput.trim() !== '删除') {
      message.warning('请输入「删除」两个字确认批量删除账号');
      return;
    }
    if (batchAction !== 'delete' && !batchTarget) {
      message.warning('请选择目标班级');
      return;
    }
    setBatchSaving(true);
    let done = 0;
    let skipped = 0;
    try {
      for (const row of selectedMembers) {
        if (batchAction === 'delete') {
          await post('/api/teaching/classes/member/delete', { deptId: selected.id, id: row.id });
          done += 1;
          continue;
        }
        if (!row.canAssign || !row.primaryDeptId) {
          skipped += 1;
          continue;
        }
        const extras = (row.extraDeptIds ?? []).filter((id) => id !== batchTarget);
        if (batchAction === 'transfer') {
          if (!row.primary) {
            skipped += 1;
            continue;
          }
          await post('/api/teaching/classes/member/assign', {
            userId: row.id,
            primaryDeptId: batchTarget,
            extraDeptIds: extras.slice(0, 2),
          });
          done += 1;
        }
        else {
          if (extras.includes(batchTarget as string) || extras.length >= 2) {
            skipped += 1;
            continue;
          }
          await post('/api/teaching/classes/member/assign', {
            userId: row.id,
            primaryDeptId: row.primaryDeptId,
            extraDeptIds: [...extras, batchTarget],
          });
          done += 1;
        }
      }
      message.success(
        (batchAction === 'delete' ? '已批量删除 ' : batchAction === 'transfer' ? '已批量转移 ' : '已批量添加 ') +
          done +
          ' 人' +
          (skipped ? '，跳过 ' + skipped + ' 人（兼报/无权限/已满 3 个班）' : ''),
      );
      setBatchAction(undefined);
      setSelectedMemberKeys([]);
      await Promise.all([loadMembers(selected.id), loadTree()]);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBatchSaving(false);
    }
  };

  const memberColumns: ColumnsType<ClassMember> = [
    { title: '姓名', dataIndex: 'name', width: 120, render: (v?: string) => v || '—' },

    {
      title: '手机号 / 登录账号',
      key: 'account',
      width: 170,
      render: (_: unknown, row: ClassMember) => row.phone || row.username || '—',
    },
    { title: '状态', dataIndex: 'status', width: 100, render: (v?: number | null) => <MemberStatus status={v} /> },
    {
      title: '班级归属',
      key: 'classAssign',
      width: 250,
      render: (_: unknown, row: ClassMember) => (
        <Space size={4} wrap>
          <Tag color={row.primary ? 'green' : 'default'}>{row.primary ? '主班' : '兼报'}</Tag>
          <span>{row.primaryDeptName || '未分班'}</span>
          {row.extraDeptNames && row.extraDeptNames.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              兼报：{row.extraDeptNames.join('、')}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {row.classCount ?? 1} 个班</span>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roleNames',
      width: 200,
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
    ...((canMemberUpdate || canMemberDelete || canAssign) && !readOnlyClass
      ? [
          {
            title: '操作',
            key: 'memberOps',
            width: 220,
            render: (_: unknown, row: ClassMember) => (
              <Space size={8} wrap>
                {row.primary && canMemberUpdate && <LinkAction onClick={() => openEditMember(row)}>编辑</LinkAction>}
                {canAssign && row.canAssign && <LinkAction onClick={() => openAssign(row)}>班级归属</LinkAction>}
                {!row.primary && canAssign && (
                  <Popconfirm
                    title={`把「${row.name || row.username || '该学员'}」移出本班？`}
                    description="只解除本班的兼报关系，不删除账号；主班和其他班不受影响。"
                    okText="移出本班"
                    cancelText="取消"
                    onConfirm={() => removeExtraMember(row)}
                  >
                    <LinkAction style={{ color: 'var(--bp-orange)' }}>移出本班</LinkAction>
                  </Popconfirm>
                )}
                {row.primary && canMemberDelete && (
                  <Popconfirm
                    title={`删除学员「${row.name || row.username || '该学员'}」？`}
                    description="账号会被删除，无法再登录；不可恢复。"
                    okText="删除"
                    okButtonProps={{ danger: true }}
                    cancelText="取消"
                    onConfirm={() => openDeleteMember(row)}
                  >
                    <LinkAction style={{ color: 'var(--bp-orange)' }}>删除账号</LinkAction>
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
          justifyContent: embedded ? 'flex-end' : 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: embedded ? 12 : 14,
        }}
      >
        {!embedded && (
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
              CLASS / 班级管理
            </div>
            <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
              班级管理
            </h2>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
              班级是学员的教学单位：维护学员、任课老师；题库/考试/问卷在资源授权里分配
            </div>
          </div>
        )}
        <Space wrap>
          {canList && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openCreateClass(selected?.classKind === 'group' ? selected.id : undefined)}
            >
              新建班级
            </Button>
          )}
          {canDetail && (
            <Badge count={pending.length} size="small" offset={[-2, 2]}>
              <Button icon={<UserAddOutlined />} onClick={openPending}>
                待审核学员
              </Button>
            </Badge>
          )}
          <Button icon={<ReloadOutlined />} loading={treeLoading} onClick={() => void refreshAll()}>
            刷新
          </Button>
        </Space>
      </div>

      {canList && globalRegisterEnabled && !hasOpenRegisterClass && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={tree.length === 0 ? '还没有班级，学员暂时无法注册' : '全局注册已开启，但你的班级还没有开放注册'}
          description={
            tree.length === 0
              ? '先新建教学班，并在班级设置里打开「开放注册」，登录页才会出现注册入口。'
              : '学员登录页不会出现你的班；请选中教学班 → 班级设置 → 打开「开放注册」。'
          }
        />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',

          alignItems: isMobile ? 'flex-start' : 'stretch',
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

          style={{

            width: isMobile ? '100%' : 320,
            flex: isMobile ? '1 1 100%' : '0 0 320px',

            minHeight: isMobile ? 'calc(100dvh - 475px)' : undefined,


            display: isMobile && selectedId ? 'none' : 'flex',
            flexDirection: 'column',
          }}
          styles={{
            body: {
              padding: '10px 8px',

              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              flex: 1,
            },
          }}
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


          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
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
            ) : isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mobileClassList.map(({ node, depth }) =>
                  node.classKind === 'group' ? (
                    <div
                      key={node.id}
                      style={{
                        marginTop: depth ? 6 : 0,
                        paddingLeft: depth * 8,
                        fontSize: 11,
                        letterSpacing: '0.12em',
                        color: 'var(--bp-text-soft)',
                      }}
                    >
                      {node.name}
                    </div>
                  ) : (
                    <button
                      key={node.id}
                      type="button"
                      className={`sk-class-card${selectedId === node.id ? ' is-active' : ''}`}
                      style={{ marginLeft: depth * 8 }}
                      onClick={() => {
                        if (node.accessible !== false) setSelectedId(node.id);
                      }}
                    >

                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 14,
                            fontWeight: 600,
                            textAlign: 'left',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {node.name}
                        </span>
                        <span style={{ color: 'var(--bp-text-soft)', flex: '0 0 auto' }}>›</span>
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 11,
                          color: 'var(--bp-text-soft)',
                        }}
                      >
                        <span>{node.memberCount ?? 0} 人</span>
                        {node.allowRegister && (
                          <span style={{ color: 'var(--bp-orange)' }}>开放注册</span>
                        )}
                      </span>
                    </button>
                  ),
                )}
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

                  if (keys.length > 0) setSelectedId(String(keys[0]));
                }}
              />
            )}
          </div>
        </Card>

        <Card
          className="bp-card bp-corners"
          size="small"
          style={{
            width: isMobile ? '100%' : undefined,
            flex: '1 1 auto',
            minWidth: 0,

            display: isMobile && !selected ? 'none' : undefined,
          }}
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
              {isMobile && selectedId && (
                <Button
                  size="small"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setSelectedId(undefined)}
                  style={{ marginBottom: 8 }}
                >
                  班级列表
                </Button>
              )}
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
              </div>





              <div className="sk-class-tabs">
                <button
                  type="button"
                  className={detailTab === 'members' ? 'is-active' : ''}
                  onClick={() => setDetailTab('members')}
                >
                  成员（{members.length}）
                </button>
                <button
                  type="button"
                  className={detailTab === 'exams' ? 'is-active' : ''}
                  onClick={() => setDetailTab('exams')}
                >
                  试卷
                </button>
              </div>

              {selected.classKind === 'group' && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="info"
                  showIcon
                  title="这是容器班，只做层级"
                  description="容器班不直接收学员、不开放注册、不分配考试/题库；请从左侧选择下级的教学班。"
                />
              )}

              {readOnlyClass && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="info"
                  showIcon
                  title="你对该班级只有查看权限"
                  description="成员名单仍可查看；添加学员、批量导入、编辑和删除需要「可管理」级别的授权。"
                />
              )}

              {detailTab === 'members' && (
              <>
                <Space wrap style={{ marginBottom: 10 }}>
                  {canCreateMember && !readOnlyClass && selected.classKind !== 'group' && (
                    <Button type="primary" icon={<UserAddOutlined />} onClick={openMemberModal}>
                      添加学员
                    </Button>
                  )}
                  {canAssign && !readOnlyClass && selected.classKind !== 'group' && (
                    <Button icon={<UserAddOutlined />} onClick={openAddExisting}>
                      从其他班级添加
                    </Button>
                  )}
                  {canCreateMember && !readOnlyClass && selected.classKind !== 'group' && (
                    <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
                      批量导入
                    </Button>
                  )}
                  {canGrant && (
                    <Button icon={<TeamOutlined />} onClick={openGrantModal}>
                      任课老师
                    </Button>
                  )}
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
              ) : isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {members.length ? members.map((row) => (
                    <div key={row.id || row.username || ''} className="bp-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{row.name || row.username || '—'}</span>
                        <MemberStatus status={row.status} />
                        <div style={{ flex: 1 }} />
                        <Tag color={row.primary ? 'green' : 'default'}>{row.primary ? '主班' : '兼报'}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                        {row.phone || row.username || '—'} · {row.primaryDeptName || '未分班'}
                        {row.extraDeptNames?.length ? ' · 兼报：' + row.extraDeptNames.join('、') : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(row.roleNames ?? []).map((name) => <Tag key={name} color="blue">{name}</Tag>)}
                        <span style={{ fontSize: 11, color: 'var(--bp-hint)' }}>共 {row.classCount ?? 1} 个班 · {row.createAt || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {row.primary && canMemberUpdate && <Button size="small" onClick={() => openEditMember(row)}>编辑</Button>}
                        {canAssign && row.canAssign && <Button size="small" onClick={() => openAssign(row)}>班级归属</Button>}
                        {!row.primary && canAssign && (
                          <Popconfirm title={`把「${row.name || row.username || '该学员'}」移出本班？`} description="只解除本班的兼报关系，不删除账号。" okText="移出本班" cancelText="取消" onConfirm={() => removeExtraMember(row)}>
                            <Button size="small" danger>移出本班</Button>
                          </Popconfirm>
                        )}
                        {row.primary && canMemberDelete && (
                          <Popconfirm title={`删除学员「${row.name || row.username || '该学员'}」？`} description="账号会被删除，无法再登录；不可恢复。" okText="删除账号" cancelText="取消" onConfirm={() => openDeleteMember(row)}>
                            <Button size="small" danger>删除账号</Button>
                          </Popconfirm>
                        )}
                      </div>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这个班级还没有学员" />}
                </div>
              ) : (
                <TableScrollRegion label="班级成员（可横向滚动）">
                  {selectedMemberKeys.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>已选 {selectedMemberKeys.length} 人</span>
                      {canMemberUpdate && <Button size="small" onClick={() => void batchMemberStatus(1)}>批量启用</Button>}
                      {canMemberUpdate && <Button size="small" onClick={() => void batchMemberStatus(0)}>批量停用</Button>}
                      {canAssign && <Button size="small" onClick={() => openBatchAction('transfer')}>批量转移班级</Button>}
                      {canAssign && <Button size="small" onClick={() => openBatchAction('add')}>批量添加到班级</Button>}
                      {canMemberDelete && <Button size="small" danger onClick={() => openBatchAction('delete')}>批量删除账号</Button>}
                    </div>
                  )}
                  <Table<ClassMember>
                    rowKey={(row) => row.id || row.username || ''}
                    size="small"
                    loading={memberLoading}
                    dataSource={members}
                    columns={memberColumns}
                    rowSelection={{
                      selectedRowKeys: selectedMemberKeys,
                      onChange: (keys) => setSelectedMemberKeys(keys as string[]),
                    }}
                    scroll={{ x: 1200 }}
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

              {detailTab === 'exams' && selected.manageable === true && selected.classKind !== 'group' && (
                <ClassResourcesPanel classId={selected.id} manageable />
              )}

              {detailTab === 'exams' && !(selected.manageable === true && selected.classKind !== 'group') && (
                <div style={{ padding: '30px 0' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                        没有该班级的管理权限，看不到这里的考试/问卷分配
                      </span>
                    }
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </div>



      <Modal
        title={'从其他班级添加' + (selected?.name ? '：' + selected.name : '')}
        open={addExistingOpen}
        onCancel={() => setAddExistingOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setAddExistingOpen(false)}>取消</Button>
            <Button
              type="primary"
              loading={addingExisting}
              disabled={candidateSelected.length === 0}
              onClick={() => void submitAddExisting()}
            >
              加入本班（兼报）
              {candidateSelected.length > 0 ? ' · ' + candidateSelected.length + ' 人' : ''}
            </Button>
          </Space>
        }
        width={isMobile ? '100%' : 860}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="把已有学员加入本班作为兼报班"
          description="不改变学员的主班；兼报班能看到本班分配的考试/题库，成绩仍记主班。每人最多 3 个班（1 主班 + 2 兼报）。"
        />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <Select
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 240, flex: '1 1 240px' }}
            placeholder="1. 选择来源班级"
            value={candidateSource}
            options={classOptions.filter((option) => option.value !== selected?.id)}
            onChange={(value: string) => {
              setCandidateSource(value);
              setCandidateSelected([]);
            }}
            aria-label="选择来源班级"
          />
          <Input
            allowClear
            style={{ minWidth: 220, flex: '1 1 220px' }}
            placeholder="2. 按姓名/手机号搜索"
            value={candidateKeyword}
            onChange={(event) => setCandidateKeyword(event.target.value)}
            aria-label="搜索候选学员"
          />
        </div>
        <TableScrollRegion label="候选学员（可横向滚动）">
          <Table<ClassMember>
            rowKey="id"
            size="small"
            loading={candidateLoading}
            dataSource={candidates}
            columns={candidateColumns}
            pagination={false}
            scroll={{ x: 700 }}
            rowSelection={{
              selectedRowKeys: candidateSelected,
              onChange: (keys) => setCandidateSelected(keys.map(String)),
              getCheckboxProps: (row) => ({ disabled: (row.classCount ?? 1) >= 3 }),
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={candidateSource ? '没有可加入的学员' : '先选择来源班级'}
                />
              ),
            }}
          />
        </TableScrollRegion>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--bp-text-soft)' }}>
          已在当前班的学员不会重复出现；已满 3 个班的学员会置灰。
        </div>
      </Modal>

      <Modal
        title={'班级归属' + (assignTarget?.name ? '：' + assignTarget.name : '')}
        open={Boolean(assignTarget)}
        onCancel={closeAssign}
        onOk={() => void submitAssign()}
        confirmLoading={assignSaving}
        okText="保存"
        cancelText="取消"
        width={isMobile ? '94%' : 560}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 14 }}
          title="1 个主班 + 最多 2 个兼报班"
          description="主班决定学籍、资料维护和成绩归属；兼报班能看到该班分配的考试/题库。只能选择你有管理权限的教学班。"
        />
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 6 }}>主班（必选）</div>
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: '100%', marginBottom: 14 }}
          value={assignPrimary}
          placeholder="选择主班"
          options={classOptions}
          onChange={(value: string) => {
            setAssignPrimary(value);
            setAssignExtras((prev) => prev.filter((deptId) => deptId !== value));
          }}
          aria-label="选择主班"
        />
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 6 }}>
          兼报班（最多 2 个，可不选）
        </div>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          style={{ width: '100%', marginBottom: 14 }}
          value={assignExtras}
          placeholder="选择兼报班"
          maxCount={2}
          options={classOptions.filter((option) => option.value !== assignPrimary)}
          onChange={(values: string[]) => setAssignExtras(values)}
          aria-label="选择兼报班"
        />
        {assignTarget && (
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
            当前：主班 {assignTarget.primaryDeptName || '未分班'}
            {assignTarget.extraDeptNames?.length
              ? '；兼报 ' + assignTarget.extraDeptNames.join('、')
              : '；没有兼报班'}
          </div>
        )}
      </Modal>

      <Modal
        title={'添加学员' + (selected?.name ? '：' + selected.name : '')}
        open={memberOpen}
        onCancel={() => setMemberOpen(false)}
        onOk={() => void submitMember()}
        confirmLoading={memberSaving}
        okText="添加"
        cancelText="取消"
        width={isMobile ? '94%' : 520}
        destroyOnHidden
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
        destroyOnHidden
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
        title={
          batchAction === 'delete'
            ? '批量删除学员账号'
            : batchAction === 'transfer'
              ? '批量转移到别的班'
              : '批量添加到别的班'
        }
        open={!!batchAction}
        onCancel={() => setBatchAction(undefined)}
        onOk={() => void submitBatchMemberAction()}
        confirmLoading={batchSaving}
        okText={batchAction === 'delete' ? '确认批量删除' : batchAction === 'transfer' ? '确认转移' : '确认添加'}
        okButtonProps={{ danger: batchAction === 'delete' }}
        cancelText="取消"
        width={isMobile ? '94%' : 480}
        destroyOnHidden
      >
        <p style={{ marginTop: 0 }}>
          已选 <b>{selectedMemberKeys.length}</b> 人。
        </p>
        {batchAction === 'delete' ? (
          <>
            <p style={{ color: 'var(--bp-orange)' }}>
              批量删除会删除学员账号，学员将无法登录，且不可恢复；兼报班关系也会一并清除。
            </p>
            <p>请输入「删除」两个字确认：</p>
            <Input value={batchDeleteInput} onChange={(e) => setBatchDeleteInput(e.target.value)} placeholder="删除" autoComplete="off" />
          </>
        ) : batchAction === 'transfer' ? (
          <>
            <p style={{ color: 'var(--bp-orange)' }}>只转移主班学员；兼报学员会被跳过。转移后原主班不再保留该学员。</p>
            <Select
              showSearch
              placeholder="选择目标班级"
              style={{ width: '100%' }}
              value={batchTarget}
              onChange={setBatchTarget}
              optionFilterProp="label"
              options={targetClassOptions}
            />
          </>
        ) : (
          <>
            <p>把选中的学员加入目标班作为<b>兼报班</b>，原主班不变；每人最多 1 个主班 + 2 个兼报班。</p>
            <Select
              showSearch
              placeholder="选择要添加到的班级"
              style={{ width: '100%' }}
              value={batchTarget}
              onChange={setBatchTarget}
              optionFilterProp="label"
              options={targetClassOptions}
            />
          </>
        )}
      </Modal>

      <Modal
        title="删除学员账号"
        open={!!deleteMemberTarget}
        onCancel={() => setDeleteMemberTarget(null)}
        onOk={() => void removeMember()}
        confirmLoading={deleteMemberSaving}
        okText="确认删除账号"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        width={isMobile ? '94%' : 460}
        destroyOnHidden
      >
        <p style={{ marginTop: 0 }}>
          即将删除学员「{deleteMemberTarget?.name || deleteMemberTarget?.phone || '—'}」的账号，删除后无法登录，且不可恢复。
        </p>
        <p style={{ color: 'var(--bp-orange)' }}>这是第二步确认，请输入该学员的姓名或手机号后继续：</p>
        <Input
          value={deleteMemberInput}
          onChange={(e) => setDeleteMemberInput(e.target.value)}
          placeholder={deleteMemberTarget?.name || deleteMemberTarget?.phone || '姓名或手机号'}
          autoComplete="off"
        />
      </Modal>

      <Modal
        title={'任课老师' + (selected?.name ? '：' + selected.name : '')}
        open={grantOpen}
        onCancel={closeGrantModal}
        footer={null}
        width={isMobile ? '94%' : 680}
        destroyOnHidden
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
          只读：可以查看本班（含下级班）的成员名单；可管理：还能添加、编辑学员。两种级别都不能修改班级设置。
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


      <Modal
        title="待审核学员"
        open={pendingOpen}
        onCancel={() => setPendingOpen(false)}
        footer={null}
        width={isMobile ? '100%' : 820}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="学员自己注册后会出现在这里"
          description="确认班级无误后点「通过」，学员就能用手机号 + 注册时设置的密码登录。需要换班时先改下拉里的班级再通过。"
        />
        {classOptions.length === 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            title="还没有可分配的班级"
            description="请先在左侧新建班级，并在「班级设置 → 开放注册」里打开，学员注册页才会出现这个班。"
          />
        )}
        {isMobile ? (

          pending.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待审核学员" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map((row) => {
                const currentValid = classOptions.some((option) => option.value === row.deptId);
                const picked = pendingDept[row.id] ?? (currentValid ? row.deptId : undefined);
                return (
                  <div key={row.id} className="bp-card" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>
                        {row.name || '(未填姓名)'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--bp-text-soft)', fontVariantNumeric: 'tabular-nums' }}>
                        {row.phone || row.username || '—'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
                      注册时间 {(row as { createAt?: string }).createAt || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                      <Select
                        style={{ flex: 1, minWidth: 0 }}
                        placeholder="选择教学班"
                        value={picked}
                        onChange={(v) => setPendingDept((prev) => ({ ...prev, [row.id]: v }))}
                        options={classOptions}
                      />
                      <Button
                        type="primary"
                        loading={approvingId === row.id}
                        onClick={() => void approvePending(row)}
                      >
                        通过
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <TableScrollRegion label="待审核学员（可横向滚动）">
            <Table<ClassMember>
              rowKey="id"
              size="small"
              loading={pendingLoading}
              dataSource={pending}
              columns={pendingColumns}
              pagination={false}
              scroll={{ x: 720 }}
              locale={{
                emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待审核学员" />,
              }}
            />
          </TableScrollRegion>
        )}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => void loadPending()} loading={pendingLoading}>
            刷新
          </Button>
          <Button type="primary" onClick={() => setPendingOpen(false)}>
            完成
          </Button>
        </div>
      </Modal>

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
