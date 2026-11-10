import { useCallback, useEffect, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Checkbox,
  Dropdown,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { MenuProps } from 'antd';
import { DeleteOutlined, FolderOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import LinkAction from '../../components/LinkAction';
import { createProject, deleteProject, listProjects, updateProject, updateProjectStatus } from '../../api';
import type { ProjectMode, ProjectView } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import type { ProjectSetting } from '../../schema/project';
import { pager } from '../repo/table';
import BatchSettingModal from './BatchSettingModal';
import ComposeModal from './ComposeModal';
import ProjectTree from './ProjectTree';
import { PERMISSION_CODES } from '../../auth/permission-codes';

type Crumb = { id: string; name: string };
type ProjectRow = ProjectView & { setting?: ProjectSetting };

const MODE_LABEL: Record<ProjectMode, string> = {
  survey: '问卷',
  exam: '考试',
  folder: '文件夹',
};

const MODE_COLOR: Record<ProjectMode, string> = {
  survey: 'blue',
  exam: 'orange',
  folder: 'default',
};

/** 新建考试/问卷时给后端的初始 ProjectSetting，与旧前端一致 */
const DEFAULT_SETTING = {
  status: 0,
  answerSetting: { progressBar: true, autoSave: true },
  submittedSetting: {},
};

const MOBILE_QUERY = '(max-width: 767.98px)';

/** 与 BasicLayout 同款：matchMedia 监听，不做宽度轮询 */
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

/** 学员视图一次取多少条：见 load 里的说明 */
const STUDENT_PAGE_SIZE = 200;
/** 兜底上限，避免授权项目异常多时无限翻页 */
const STUDENT_MAX_PAGES = 10;

/**
 * 学员视图：只有 project:list / project:detail、没有 project:update 的账号（学生 / 只读协作者）。
 *
 * 管理端那一套（新建、回收站、编辑、设置、数据、删除、授权、批量操作）一个都不渲染，
 * 唯一动作是「开始答题」——直接跳公开答题页 /s/:id，这条路不需要任何管理权限，学员不会 403。
 */
function StudentProjectList({
  authorities,
  embedded = false,
}: {
  authorities: string[];
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // 开始答题是独立权限：没有 project:answer 的账号（比如误配的只读协作者）不再看到入口
  const canAnswer = can(authorities, PERMISSION_CODES.projectAnswer);

  const [rows, setRows] = useState<ProjectView[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // 学员视图一次性拉全量后前端分页，所以排序也放前端（服务端分页会跨页错序）
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'createAt'>();
  const [sortDesc, setSortDesc] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * 列表接口只能在服务端按名称/父级/类型过滤，没法排除文件夹；而且后端把文件夹排在
   * 最前面。所以不能用「服务端分页 + 前端丢掉文件夹」：一页 20 条可能全是文件夹，
   * 学员会看到空白页、页码也对不上。这里按 200 条一页把授权范围内的项目取全，
   * 再在前端过滤文件夹、自行分页（练习中心「我的任务」也是这个套路）。
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all: ProjectView[] = [];
      for (let current = 1; current <= STUDENT_MAX_PAGES; current += 1) {
        const res = await listProjects({ current, pageSize: STUDENT_PAGE_SIZE });
        all.push(...res.data);
        // 本页不满 200 条、或已拿到 total 条，都说明没有下一页了
        if (res.data.length < STUDENT_PAGE_SIZE || all.length >= res.total) break;
      }
      setRows(all.filter((row) => row.mode !== 'folder'));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = keyword
    ? rows.filter((row) => (row.name || '').toLowerCase().includes(keyword.toLowerCase()))
    : rows;
  const sorted = (() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = (a.name || '').localeCompare(b.name || '', 'zh-CN');
      else if (sortKey === 'status') cmp = (a.status ?? 0) - (b.status ?? 0);
      else cmp = String(a.createAt || '').localeCompare(String(b.createAt || ''));
      return sortDesc ? -cmp : cmp;
    });
    return arr;
  })();
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  /** 公开答题页：/api/public/projectOutline 用项目 id 就能取题，不需要 project:detail */
  const start = (row: ProjectView) => navigate(`/s/${row.id}`);

  const statusTag = (row: ProjectView) => (
    <Tag color={row.status === 1 ? 'success' : 'default'}>{row.status === 1 ? '已发布' : '未发布'}</Tag>
  );

  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>{keyword ? '没有匹配的结果' : '还没有分配给你的考试'}</span>
          {!keyword && (
            <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
              请联系老师把你的用户组加入考试协作者
            </span>
          )}
        </div>
      }
    />
  );

  return (
    <>
      {!embedded && (
        <>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
              EXAMS / 考试安排
            </div>
            <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
              考试安排
            </h2>
            <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
              这里是被分配给你参加的考试；点「开始答题」直接进入答题页。
            </div>
          </div>

          <hr className="bp-dim" style={{ margin: '0 0 16px' }} />
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {filtered.length} 项</span>
        <div style={{ flex: 1 }} />
        <Input.Search
          allowClear
          placeholder="搜索名称"
          style={{ width: isMobile ? '100%' : 220 }}
          onSearch={(v) => {
            setKeyword(v.trim());
            setPage(1);
          }}
        />
      </div>

      {isMobile ? (
        <>
          <Spin spinning={loading}>
            {paged.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {paged.map((row) => (
                  <div
                    key={row.id}
                    className="bp-card"
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                        }}
                      >
                        {row.name || '(未命名)'}
                      </span>
                      {statusTag(row)}
                    </div>
                    {row.createAt && (
                      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                        创建于 {row.createAt}
                      </div>
                    )}
                    {canAnswer ? (
                      <Button
                        type="primary"
                        style={{ height: 38, paddingInline: 0 }}
                        onClick={() => start(row)}
                      >
                        开始答题
                      </Button>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>未开放作答</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              emptyNode
            )}
          </Spin>
          {filtered.length > pageSize && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Pagination
                simple
                current={page}
                pageSize={pageSize}
                total={filtered.length}
                onChange={(p, s) => {
                  setPage(p);
                  setPageSize(s);
                }}
              />
            </div>
          )}
        </>
      ) : (
        <Table<ProjectView>
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={paged}
          locale={{ emptyText: emptyNode }}
          pagination={pager(page, pageSize, filtered.length, setPage, setPageSize, (n) => `共 ${n} 项`)}
          onChange={(_pagination, _filters, sorter) => {
            const single = Array.isArray(sorter) ? sorter[0] : sorter;
            if (!single || !single.order) {
              setSortKey(undefined);
              setSortDesc(false);
            } else {
              setSortKey(single.field as 'name' | 'status' | 'createAt');
              setSortDesc(single.order === 'descend');
            }
            setPage(1);
          }}
          columns={[
            {
              title: '名称',
              dataIndex: 'name',
              sorter: true,
              sortOrder: sortKey === 'name' ? (sortDesc ? 'descend' : 'ascend') : null,
              render: (_: unknown, row) => row.name || '(未命名)',
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              sorter: true,
              sortOrder: sortKey === 'status' ? (sortDesc ? 'descend' : 'ascend') : null,
              render: (_: unknown, row) => statusTag(row),
            },
            {
              title: '创建时间',
              dataIndex: 'createAt',
              width: 170,
              sorter: true,
              sortOrder: sortKey === 'createAt' ? (sortDesc ? 'descend' : 'ascend') : null,
            },
            {
              title: '操作',
              width: 140,
              render: (_: unknown, row) =>
                canAnswer ? (
                  <Button type="primary" size="small" onClick={() => start(row)}>
                    开始答题
                  </Button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>未开放作答</span>
                ),
            },
          ]}
        />
      )}
    </>
  );
}

/**
 * 管理端 / 老师视图：增删改、批量、回收站、文件夹都还在这里，
 * 但每个动作都按 authorities 逐项渲染，没权限的入口不出现（而不是点了才 403）。
 */
function ManagerProjectList({
  authorities,
  embedded = false,
}: {
  authorities: string[];
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // 统一走 auth/permissions 的 can()：与后端 authorityList / @PreAuthorize 同源
  const canCreate = can(authorities, PERMISSION_CODES.projectCreate);
  const canUpdate = can(authorities, PERMISSION_CODES.projectUpdate);
  const canDelete = can(authorities, PERMISSION_CODES.projectDelete);
  const canPublish = can(authorities, PERMISSION_CODES.projectPublish);
  const canData = can(authorities, PERMISSION_CODES.answerList);
  const canDetail = can(authorities, PERMISSION_CODES.projectDetail);

  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [batchSettingOpen, setBatchSettingOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  /** 新建/删除/重命名后递增，让左侧分类树重新拉 counts */
  const [treeToken, setTreeToken] = useState(0);
  const parentId = crumbs.length ? crumbs[crumbs.length - 1].id : undefined;

  const [createOpen, setCreateOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeName, setComposeName] = useState('');
  const [renaming, setRenaming] = useState<ProjectView | null>(null);
  // 声明式 Modal 的 onOk 不会自动锁按钮：自己控制 loading，防止双击创建两个同名项目/重复改名
  const [creating, setCreating] = useState(false);
  const [renameSaving, setRenameSaving] = useState(false);
  const [createForm] = Form.useForm<{
    name: string;
    mode: 'survey' | 'exam';
    source?: 'blank' | 'compose';
  }>();
  const [renameForm] = Form.useForm<{ name: string }>();
  const createMode = Form.useWatch('mode', createForm);
  const createSource = Form.useWatch('source', createForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProjects({ current: page, pageSize, name: keyword, parentId });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, parentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 翻页/搜索/进文件夹后旧选中项可能已不在当前列表，直接清空避免误操作
  useEffect(() => {
    setSelectedKeys([]);
  }, [page, pageSize, keyword, parentId]);

  const selectedProjects = rows.filter(
    (row) => selectedKeys.includes(row.id) && row.mode !== 'folder',
  );

  const openCreate = () => {
    createForm.setFieldsValue({ name: '', mode: 'exam', source: 'blank' });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (creating) return;
    let v: { name: string; mode: 'survey' | 'exam'; source?: 'blank' | 'compose' };
    try {
      v = await createForm.validateFields();
    } catch {
      return; // 校验提示已经在字段上
    }
    if (v.mode === 'exam' && v.source === 'compose') {
      setCreateOpen(false);
      setComposeName(v.name.trim());
      setComposeOpen(true);
      return;
    }
    setCreating(true);
    try {
      const created = await createProject({
        name: v.name,
        mode: v.mode,
        parentId,
        setting: DEFAULT_SETTING,
        // 先给一份空表，设计器打开时不会拿到 null
        survey: { title: v.name, type: 'Survey', attribute: { mode: v.mode }, children: [] },
      });
      setCreateOpen(false);
      message.success('已创建');
      setTreeToken((token) => token + 1);
      navigate(`/survey/${created.id}/edit`);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const submitRename = async () => {
    if (!renaming || renameSaving) return;
    let name: string;
    try {
      const values = await renameForm.validateFields();
      name = values.name;
    } catch {
      return; // 校验提示已经在字段上
    }
    setRenameSaving(true);
    try {
      await updateProject({ id: renaming.id, name });
      message.success('已重命名');
      // 当前面包屑可能正停在这个文件夹上，同步改名，避免继续显示旧名称
      setCrumbs((prev) => prev.map((crumb) => (crumb.id === renaming.id ? { ...crumb, name } : crumb)));
      setRenaming(null);
      setTreeToken((token) => token + 1);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setRenameSaving(false);
    }
  };

  /** 开启 / 关闭：POST /api/project/status（project:publish），不再借道整包更新 */
  const setStatus = async (row: ProjectView, next: 0 | 1) => {
    try {
      await updateProjectStatus({ id: row.id, status: next });
      message.success(next === 1 ? '已开启' : '已关闭');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const remove = async (row: ProjectView) => {
    try {
      await deleteProject(row.id);
      message.success('已移入回收站');
      setTreeToken((token) => token + 1);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedKeys((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id),
    );
  };

  const batchDelete = async () => {
    if (!selectedKeys.length) return;
    const ids = [...selectedKeys];
    setBatchDeleting(true);
    try {
      // ProjectApi#delete 只按单个 id 删除，前端循环调用
      for (const id of ids) {
        await deleteProject(id);
      }
      message.success(`已删除 ${ids.length} 项`);
      setTreeToken((token) => token + 1);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBatchDeleting(false);
      setSelectedKeys([]);
      await load();
    }
  };

  const enterFolder = (row: ProjectView) => {
    setCrumbs((prev) => [...prev, { id: row.id, name: row.name || '未命名文件夹' }]);
    setPage(1);
  };

  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={keyword ? '没有匹配的结果' : '还没有考试，点右上角「新建」开始'}
    />
  );

  const openRename = (row: ProjectView) => {
    renameForm.setFieldsValue({ name: row.name || '' });
    setRenaming(row);
  };

  /** 复制答题链接：优先 clipboard；非安全上下文/失败时退回 prompt 手动复制 */
  const copyLink = async (row: ProjectView) => {
    const url = `${window.location.origin}/s/${row.id}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt('请手动复制答题链接', url);
        return;
      }
      message.success('已复制答题链接');
    } catch {
      window.prompt('请手动复制答题链接', url);
    }
  };

  const copyLinkLabel = (row: ProjectRow) =>
    row.setting?.answerSetting?.loginRequired === true ? '复制链接（需登录）' : '复制链接';

  /** 行操作收进「更多」下拉：按权限逐项渲染，文件夹只有重命名/删除 */
  const buildOpsMenu = (row: ProjectRow): NonNullable<MenuProps['items']> => {
    const items: NonNullable<MenuProps['items']> = [];
    if (row.mode !== 'folder') {
      if (canDetail) items.push({ key: 'settings', label: '设置' });
      if (canUpdate) items.push({ key: 'edit', label: '编辑' });
      if (canData) items.push({ key: 'data', label: '数据' });
      items.push({ key: 'copy', label: copyLinkLabel(row) });
      if (canPublish) {
        items.push({
          key: 'toggle',
          label: row.status === 1 ? '关闭' : '开启',
          danger: row.status === 1,
        });
      }
    }
    if (canUpdate) items.push({ key: 'rename', label: '重命名' });
    if (canDelete) items.push({ key: 'delete', label: '删除', danger: true });
    return items;
  };

  const handleOps = (row: ProjectRow, key: string) => {
    switch (key) {
      case 'settings':
        navigate(`/survey/${row.id}`);
        break;
      case 'edit':
        navigate(`/survey/${row.id}/edit`);
        break;
      case 'data':
        navigate(`/survey/${row.id}/data`);
        break;
      case 'copy':
        void copyLink(row);
        break;
      case 'toggle':
        if (row.status === 1) {
          Modal.confirm({
            title: '关闭后学员将无法打开答题链接',
            content: '已收集的答卷不受影响，可随时重新开启。',
            okText: '关闭',
            cancelText: '取消',
            onOk: () => setStatus(row, 0),
          });
        } else {
          void setStatus(row, 1);
        }
        break;
      case 'rename':
        openRename(row);
        break;
      case 'delete':
        Modal.confirm({
          title: `删除「${row.name || ''}」？`,
          content: '删除后可在回收站找回。',
          okText: '删除',
          okButtonProps: { danger: true },
          cancelText: '取消',
          onOk: () => remove(row),
        });
        break;
      default:
        break;
    }
  };

  /** 批量操作（批量设置 / 批量删除）至少要有一个权限，否则选择框没有意义 */
  const canBatch = canUpdate || canDelete;

  /** 移动端卡片同样逐项 gate：一个动作都没有时整行按钮不渲染 */
  const mobileHasActions = (row: ProjectRow) =>
    row.mode === 'folder' ? canUpdate || canDelete : canDetail || canPublish || canUpdate || canData;

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ width: isMobile ? '100%' : 220, flex: isMobile ? '1 1 100%' : '0 0 220px', minWidth: 0 }}>
          <ProjectTree
            selectedId={parentId}
            refreshToken={treeToken}
            onSelect={(_id, path) => {
              setCrumbs(path);
              setPage(1);
            }}
          />
        </div>
        <div style={{ flex: '1 1 auto', width: '100%', minWidth: 0 }}>
      <div
        style={{
          marginBottom: embedded ? 12 : 18,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          // embedded 时页头（标题区）隐藏，只留「回收站 / 新建」工具条，靠右排列
          justifyContent: embedded ? 'flex-end' : 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {!embedded && (
          <div style={{ minWidth: 0, flex: isMobile ? '1 1 100%' : '1 1 auto' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
              EXAMS / 考试管理
            </div>
            <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
              我的考试与问卷
            </h2>
            <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
              这里是你创建和参与协作的考试/问卷；题库在「题库中心」，不在此列表。
            </div>
          </div>
        )}
        <Button icon={<DeleteOutlined />} onClick={() => navigate('/project/trash')}>
          回收站
        </Button>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建
          </Button>
        )}
      </div>

      {!embedded && <hr className="bp-dim" style={{ margin: '0 0 16px' }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Breadcrumb
          items={[
            {
              title: (
                <LinkAction onClick={() => {
                  setCrumbs([]);
                  setPage(1);
                }}>
                  全部
                </LinkAction>
              ),
            },
            ...crumbs.map((c, i) => ({
              title:
                i === crumbs.length - 1 ? (
                  c.name
                ) : (
                  <LinkAction onClick={() => {
                    setCrumbs(crumbs.slice(0, i + 1));
                    setPage(1);
                  }}>
                    {c.name}
                  </LinkAction>
                ),
            })),
          ]}
        />
        <div style={{ flex: 1 }} />
        <Input.Search
          allowClear
          placeholder="搜索名称"
          style={{ width: isMobile ? '100%' : 220 }}
          onSearch={(v) => {
            setKeyword(v.trim());
            setPage(1);
          }}
        />
      </div>

      {selectedKeys.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 12,
            padding: '8px 10px',
            border: '1px dashed var(--bp-line)',
          }}
        >
          <span style={{ fontSize: 12 }}>已选中 {selectedKeys.length} 项</span>
          <div style={{ flex: 1 }} />
          {canUpdate && (
            <Button size="small" onClick={() => setBatchSettingOpen(true)}>
              批量设置
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title={`删除选中的 ${selectedKeys.length} 个考试/问卷？`}
              description="可在回收站恢复。"
              okText="删除"
              cancelText="取消"
              onConfirm={() => batchDelete()}
            >
              <Button danger size="small" loading={batchDeleting}>
                批量删除
              </Button>
            </Popconfirm>
          )}
          <Button size="small" onClick={() => setSelectedKeys([])}>
            取消选择
          </Button>
        </div>
      )}

      {isMobile ? (
        <>
          <Spin spinning={loading}>
            {rows.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="bp-card"
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {canBatch && row.mode !== 'folder' && (
                        <Checkbox
                          checked={selectedKeys.includes(row.id)}
                          onChange={(e) => toggleSelected(row.id, e.target.checked)}
                        />
                      )}
                      <LinkAction
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                        }}
                        onClick={() =>
                          row.mode === 'folder'
                            ? enterFolder(row)
                            : navigate(canUpdate ? `/survey/${row.id}/edit` : `/survey/${row.id}`)
                        }
                      >
                        {row.name || '(未命名)'}
                      </LinkAction>
                      <Tag color={row.mode ? MODE_COLOR[row.mode] ?? 'default' : 'default'}>
                        {row.mode ? MODE_LABEL[row.mode] ?? row.mode : '—'}
                      </Tag>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--bp-text-soft)',
                      }}
                    >
                      {row.mode === 'folder' ? (
                        <span>{row.total ?? 0} 项</span>
                      ) : (
                        <>
                          <Tag color={row.status === 1 ? 'success' : 'default'}>
                            {row.status === 1 ? '收集中' : '未发布'}
                          </Tag>
                          <span>{row.total ?? 0} 份答卷</span>
                          <div style={{ flex: 1 }} />
                          <LinkAction onClick={() => void copyLink(row)}>{copyLinkLabel(row)}</LinkAction>
                        </>
                      )}
                    </div>

                    {mobileHasActions(row) && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {row.mode === 'folder' ? (
                          <>
                            {canUpdate && (
                              <Button
                                style={{ flex: 1, height: 38, paddingInline: 0 }}
                                onClick={() => openRename(row)}
                              >
                                重命名
                              </Button>
                            )}
                            {canDelete && (
                              <Popconfirm
                                title={`删除「${row.name || ''}」？`}
                                description="删除后可在回收站找回。"
                                okText="删除"
                                cancelText="取消"
                                onConfirm={() => remove(row)}
                              >
                                <Button danger style={{ flex: 1, height: 38, paddingInline: 0 }}>
                                  删除
                                </Button>
                              </Popconfirm>
                            )}
                          </>
                        ) : (
                          <>
                            {canDetail && (
                              <Button
                                style={{ flex: 1, height: 38, paddingInline: 0 }}
                                onClick={() => navigate(`/survey/${row.id}`)}
                              >
                                设置
                              </Button>
                            )}
                            {canPublish &&
                              (row.status === 1 ? (
                                <Popconfirm
                                  title="关闭后学员将无法打开答题链接"
                                  description="已收集的答卷不受影响，可随时重新开启。"
                                  okText="关闭"
                                  cancelText="取消"
                                  onConfirm={() => setStatus(row, 0)}
                                >
                                  <Button danger style={{ flex: 1, height: 38, paddingInline: 0 }}>
                                    关闭
                                  </Button>
                                </Popconfirm>
                              ) : (
                                <Button
                                  style={{ flex: 1, height: 38, paddingInline: 0 }}
                                  onClick={() => setStatus(row, 1)}
                                >
                                  开启
                                </Button>
                              ))}
                            {canUpdate && (
                              <Button
                                style={{ flex: 1, height: 38, paddingInline: 0 }}
                                onClick={() => navigate(`/survey/${row.id}/edit`)}
                              >
                                编辑
                              </Button>
                            )}
                            {canData && (
                              <Button
                                style={{ flex: 1, height: 38, paddingInline: 0 }}
                                onClick={() => navigate(`/survey/${row.id}/data`)}
                              >
                                数据
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              emptyNode
            )}
          </Spin>
          {rows.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 12,
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 项</span>
              {total > pageSize && (
                <Pagination
                  simple
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(p, s) => {
                    setPage(p);
                    setPageSize(s);
                  }}
                />
              )}
            </div>
          )}
        </>
      ) : (
      <Table<ProjectRow>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 860 }}
        rowSelection={
          canBatch
            ? {
                selectedRowKeys: selectedKeys,
                onChange: (keys) => setSelectedKeys(keys.map(String)),
                getCheckboxProps: (row) => ({ disabled: row.mode === 'folder' }),
              }
            : undefined
        }
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={keyword ? '没有匹配的结果' : '还没有考试，点右上角「新建」开始'}
            />
          ),
        }}
        pagination={pager(page, pageSize, total, setPage, setPageSize, (n) => `共 ${n} 项`)}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            ellipsis: true,
            render: (_: unknown, row) =>
              row.mode === 'folder' ? (
                <Space style={{ cursor: 'pointer', maxWidth: '100%' }} onClick={() => enterFolder(row)}>
                  <FolderOutlined style={{ color: 'var(--bp-text-soft)' }} />
                  <span
                    title={row.name}
                    style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {row.name}
                  </span>
                </Space>
              ) : (
                <LinkAction
                  title={row.name}
                  style={{
                    display: 'inline-block',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'bottom',
                  }}
                  onClick={() => navigate(canUpdate ? `/survey/${row.id}/edit` : `/survey/${row.id}`)}
                >
                  {row.name || '(未命名)'}
                </LinkAction>
              ),
          },
          {
            title: '类型',
            dataIndex: 'mode',
            width: 78,
            render: (mode: ProjectMode) => (
              <Tag color={MODE_COLOR[mode] ?? 'default'}>{MODE_LABEL[mode] ?? mode}</Tag>
            ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 86,
            render: (status: number, row) =>
              row.mode === 'folder' ? (
                <span style={{ color: 'var(--bp-text-soft)' }}>{row.total ?? 0} 项</span>
              ) : (
                <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? '已发布' : '未发布'}</Tag>
              ),
          },
          {
            title: '答卷',
            dataIndex: 'total',
            width: 76,
            render: (v: number, row) => (row.mode === 'folder' ? '—' : `${v ?? 0} 份`),
          },
          {
            title: '创建时间',
            dataIndex: 'createAt',
            width: 150,
          },
          {
            title: '操作',
            width: 84,
            render: (_: unknown, row) => {
              const items = buildOpsMenu(row);
              if (items.length === 0) return '—';
              return (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items,
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      handleOps(row, String(key));
                    },
                  }}
                >
                  <Button size="small">更多</Button>
                </Dropdown>
              );
            },
          },
        ]}
      />
      )}
        </div>
      </div>

      <Modal
        title="新建"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
        confirmLoading={creating}
        okText={createMode === 'exam' && createSource === 'compose' ? '下一步' : '创建'}
        cancelText="取消"
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
            <Input placeholder="例如：2026 年第一季度安全培训考试" maxLength={120} />
          </Form.Item>
          <Form.Item name="mode" label="类型" rules={[{ required: true }]}>
            <Segmented
              options={[
                { label: '考试', value: 'exam' },
                { label: '问卷', value: 'survey' },
              ]}
            />
          </Form.Item>
          {createMode === 'exam' && (
            <Form.Item name="source" label="新建方式">
              <Segmented
                options={[
                  { label: '空白新建', value: 'blank' },
                  { label: '从题库组卷', value: 'compose' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <ComposeModal
        open={composeOpen}
        initialName={composeName}
        onCancel={() => setComposeOpen(false)}
        onCreated={(id) => {
          setComposeOpen(false);
          navigate(`/survey/${id}/edit`);
        }}
      />

      <BatchSettingModal
        open={batchSettingOpen}
        projects={selectedProjects}
        onCancel={() => setBatchSettingOpen(false)}
        onUpdated={() => {
          setBatchSettingOpen(false);
          setSelectedKeys([]);
          void load();
        }}
      />

      <Modal
        title="重命名"
        open={!!renaming}
        onCancel={() => setRenaming(null)}
        onOk={submitRename}
        confirmLoading={renameSaving}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={renameForm} layout="vertical" preserve={false}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
            <Input maxLength={120} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

/**
 * 「我的考试」入口：按权限分成两种视图，权限判断统一走 auth/permissions 的 can()。
 *
 * - 有 project:update（老师 / 管理员）：管理视图（各动作再按权限逐项渲染）；
 * - 没有 project:update、但有 project:list（学员 / 只读协作者）：学员视图，
 *   只有「开始答题」，不出现任何管理入口，避免每点一次都是 403。
 */
export default function ProjectList({ embedded = false }: { embedded?: boolean }) {
  const [authorities, setAuthorities] = useState<string[]>();

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  // 权限没回来之前先给骨架，避免管理视图闪一下再被替换成学员视图
  if (!authorities) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const isManager = can(authorities, PERMISSION_CODES.projectUpdate);
  const canList = can(authorities, PERMISSION_CODES.projectList);

  if (!isManager && canList) {
    return <StudentProjectList authorities={authorities} embedded={embedded} />;
  }

  return <ManagerProjectList authorities={authorities} embedded={embedded} />;
}
