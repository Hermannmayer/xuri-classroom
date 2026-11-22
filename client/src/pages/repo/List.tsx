import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  AutoComplete,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
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
import { DatabaseOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import LinkAction from '../../components/LinkAction';
import MobileBatchBar from '../../components/MobileBatchBar';
import TableScrollRegion from '../../components/TableScrollRegion';
import { get, getWithPagination, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import { pager, TABLE_COMPONENTS } from './table';
import GrantModal from './GrantModal';
import RepoCategoryTree from './RepoCategoryTree';
import BatchRepoCategoryModal from './BatchRepoCategoryModal';
import RepoExportModal, { type RepoExportTarget } from './RepoExportModal';
import { PERMISSION_CODES } from '../../auth/permission-codes';


interface RepoView {
  id: string;
  name?: string;
  description?: string;
  mode?: string;
  tag?: string[];
  priority?: number;
  setting?: string;
  total?: number;
  shared?: boolean;
  category?: string;
  isPractice?: boolean;

  openStartAt?: string;
  openEndAt?: string;
}

const MODE_LABEL: Record<string, string> = {
  exam: '考试',
  survey: '问卷',
};

const PRACTICE_TYPE_LABEL: Record<string, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  Textarea: '简答',
};

const MOBILE_QUERY = '(max-width: 767.98px)';


const NOWRAP: CSSProperties = { whiteSpace: 'nowrap' };

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

export default function RepoList() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [rows, setRows] = useState<RepoView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<RepoView | null>(null);

  const [creating, setCreating] = useState(false);
  const [renameSaving, setRenameSaving] = useState(false);
  const [granting, setGranting] = useState<RepoView | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<RepoExportTarget | null>(null);
  const [randomRepo, setRandomRepo] = useState<RepoView | null>(null);

  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);

  const [treeToken, setTreeToken] = useState(0);
  const [randomForm] = Form.useForm<Record<string, number>>();
  const [createForm] = Form.useForm<{
    name: string;
    category: string;
    mode: 'exam' | 'survey';
    description?: string;
    window?: [Dayjs | null, Dayjs | null];
  }>();
  const [renameForm] = Form.useForm<{
    name: string;
    category?: string;
    tag?: string;
    description?: string;
    window?: [Dayjs | null, Dayjs | null];
  }>();

  const [authorities, setAuthorities] = useState<string[]>([]);
  useEffect(() => {
    void loadAuthorities().then((a) => setAuthorities(a));
  }, []);

  // 统一走 permissions.ts 的 can()：它已经处理了「学员专属权限不给管理员兜底」， 这里再手写一遍 ROLE_admin 放行会把 repo:practice 又放回来。
  const hasPermission = (permission: string) => can(authorities, permission);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchGrantIds, setBatchGrantIds] = useState<string[]>([]);



  const [sortKey, setSortKey] = useState<string>();
  const [sortDesc, setSortDesc] = useState(false);
  const sortOrderOf = (key: string) => (sortKey === key ? (sortDesc ? 'descend' : 'ascend') : null);

  const canCreate = hasPermission(PERMISSION_CODES.repoCreate);

  const canGrant = hasPermission(PERMISSION_CODES.repoGrant);
  const canDetail = hasPermission(PERMISSION_CODES.repoDetail);

  const canExport = hasPermission(PERMISSION_CODES.repoExport);




  const canOpen = canDetail || hasPermission(PERMISSION_CODES.repoQuestionsRead);
  const canUpdate = hasPermission(PERMISSION_CODES.repoUpdate);
  const canDelete = hasPermission(PERMISSION_CODES.repoDelete);



  const canPractice = hasPermission(PERMISSION_CODES.repoPractice);

  const canReport = hasPermission(PERMISSION_CODES.repoReport);

  // 操作列宽度按「实际会渲染的动作」估算（中文 18px/字 + 24px 间距）： 没有练习入口约 260，有练习入口约 380，保证「开始练习」不会被挤成两行。
  const actionWidth = (() => {
    const labels = [
      canOpen ? '题目' : '',
      canReport ? '统计' : '',
      canPractice ? '开始练习' : '',
      canPractice ? '随机练习' : '',
      canPractice ? '继续练习' : '',
      canExport ? '导出' : '',
      canGrant ? '授权' : '',
      canUpdate ? '编辑' : '',
      canDelete ? '删除' : '',
    ].filter(Boolean);
    if (labels.length === 0) return 0;
    return labels.reduce((sum, label) => sum + label.length * 18 + 24, 24);
  })();

  const scrollX = 800 + actionWidth;

  const hasPracticeProgress = (id: string) => {
    try {
      return Boolean(localStorage.getItem(`practice:${id}`));
    } catch {
      return false;
    }
  };

  const startPractice = (row: RepoView, mode: 'full' | 'resume') => {
    navigate(`/exercise/practice/${row.id}?mode=${mode}`, { state: { repoName: row.name } });
  };

  const openRandom = (row: RepoView) => {
    setRandomRepo(row);
  };

  const submitRandom = async () => {
    if (!randomRepo) return;
    const values = await randomForm.validateFields();
    const counts = ['Radio', 'Checkbox', 'Judge', 'FillBlank', 'Textarea']
      .map((type) => ({ type, count: Number(values[type] ?? 0) }))
      .filter((item) => item.count > 0)
      .map((item) => `${item.type}:${item.count}`)
      .join(',');
    if (!counts) {
      message.warning('请至少选择题型并填写题数');
      return;
    }
    const row = randomRepo;
    setRandomRepo(null);
    navigate(`/exercise/practice/${row.id}?mode=random&counts=${encodeURIComponent(counts)}`, {
      state: { repoName: row.name },
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithPagination<RepoView>('/api/repo/list', {
        current: page,
        pageSize,
        name: keyword,

        category: categoryFilter || undefined,

        memberOnly: canCreate ? undefined : true,

        sortBy: sortKey || undefined,
        sortDesc: sortKey ? sortDesc : undefined,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, categoryFilter, canCreate, sortKey, sortDesc]);

  useEffect(() => {
    void load();
  }, [load]);


  useEffect(() => {
    get<{ name?: string; path?: string }[]>('/api/repo/categories')
      .then((list) =>
        setCategoryOptions(
          (Array.isArray(list) ? list : [])
            // 「未分类」的 path 为空，不能当作可提交的分类值
            .filter((item) => Boolean((item.path || '').trim()))
            .map((item) => {
              const value = (item.path || '').trim();
              return { value, label: item.name || value };
            }),
        ),
      )
      .catch(() => setCategoryOptions([]));
  }, [treeToken]);

  const openCreate = () => {
    createForm.setFieldsValue({ name: '', category: '', mode: 'exam', description: '', window: undefined });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (creating) return;
    let v: {
      name: string;
      category: string;
      mode: 'exam' | 'survey';
      description?: string;
      window?: [Dayjs | null, Dayjs | null];
    };
    try {
      v = await createForm.validateFields();
    } catch {
      return;
    }
    setCreating(true);
    try {
      await post<void>('/api/repo/create', {
        name: v.name.trim(),
        category: v.category.trim(),
        mode: v.mode,
        description: v.description?.trim() || undefined,

        openStartAt: v.window?.[0]?.valueOf() ?? null,
        openEndAt: v.window?.[1]?.valueOf() ?? null,
      });
      setCreateOpen(false);
      message.success('已创建题库');
      setTreeToken((token) => token + 1);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const submitRename = async () => {
    if (!renaming || renameSaving) return;
    let values: {
      name: string;
      category?: string;
      tag?: string;
      description?: string;
      window?: [Dayjs | null, Dayjs | null];
    };
    try {
      values = await renameForm.validateFields();
    } catch {
      return;
    }
    const { name, category, tag, description } = values;
    setRenameSaving(true);
    try {

      await post<void>('/api/repo/update', {
        id: renaming.id,
        name: name.trim(),
        description: description ?? renaming.description,
        category: category ?? renaming.category,
        tag: tag ? tag.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : (renaming.tag ?? []),
        mode: renaming.mode,
        shared: renaming.shared,
        isPractice: renaming.isPractice,
        priority: renaming.priority,
        setting: renaming.setting,

        openStartAt: values.window?.[0]?.valueOf() ?? null,
        openEndAt: values.window?.[1]?.valueOf() ?? null,
      });
      message.success('已保存');
      setRenaming(null);
      setTreeToken((token) => token + 1);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setRenameSaving(false);
    }
  };

  const remove = async (row: RepoView) => {
    try {
      await post<void>('/api/repo/delete', { id: row.id });
      message.success('已删除题库');
      setTreeToken((token) => token + 1);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  /** 题库名称与「题目」入口统一走这里：没有 canOpen 时名称退化成纯文本，不给出无效点击 */
  const openRepo = (row: RepoView) => {
    if (!canOpen) return;

    const query = row.name ? `?repoName=${encodeURIComponent(row.name)}` : '';
    navigate(`/repo/${row.id}/questions/normal${query}`, { state: { repoName: row.name } });
  };


  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        keyword || categoryFilter ? (
          '没有匹配的结果'
        ) : canCreate ? (
          '还没有题库，点右上角「新建题库」开始'
        ) : (
          <div style={{ lineHeight: 1.9 }}>
            还没有可浏览的题库
            <br />
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              仅显示你创建、被授权或共享的题库
            </span>
          </div>
        )
      }
    />
  );

  const openRename = (row: RepoView) => {
    renameForm.setFieldsValue({
      name: row.name || '',
      category: row.category,
      tag: (row.tag || []).join(','),
      description: row.description,
      window:
        row.openStartAt || row.openEndAt
          ? [
              row.openStartAt ? dayjs(row.openStartAt) : null,
              row.openEndAt ? dayjs(row.openEndAt) : null,
            ]
          : undefined,
    });
    setRenaming(row);
  };

  return (
    <>
      <div
        style={{
          marginBottom: 18,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: isMobile ? '1 1 100%' : '1 1 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            REPO / 题库中心
          </div>
          <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
            {canCreate ? '我的题库' : '题库浏览'}
          </h2>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
            {canCreate
              ? '管理题目与 Excel 导入导出；练习记录在「我的练习」。'
              : '浏览题库题目；练习记录在「我的练习」。'}
          </div>
        </div>
        {!isMobile && canUpdate && selectedIds.length > 0 && (
          <Button onClick={() => setMoveOpen(true)}>移动到分类（{selectedIds.length}）</Button>
        )}
        {!isMobile && canGrant && selectedIds.length > 0 && (
          <Button icon={<TeamOutlined />} onClick={() => setBatchGrantIds(selectedIds)}>
            批量授权（{selectedIds.length}）
          </Button>
        )}
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建题库
          </Button>
        )}
      </div>

      <hr className="bp-dim" style={{ margin: '0 0 16px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 个题库</span>
        <div style={{ flex: 1 }} />
        <Input.Search
          allowClear
          placeholder="搜索题库名称"
          style={{ width: isMobile ? '100%' : 220 }}
          onSearch={(v) => {
            setKeyword(v.trim());
            setPage(1);
          }}
        />
      </div>


      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ width: isMobile ? '100%' : 220, flex: isMobile ? '1 1 100%' : '0 0 220px', minWidth: 0 }}>
          <RepoCategoryTree
            selectedPath={categoryFilter}
            refreshToken={treeToken}
            canCreate={canCreate}
            onSelect={(path) => {
              setCategoryFilter(path);
              setPage(1);
            }}
            onCreated={() => setTreeToken((token) => token + 1)}
          />
        </div>
        <div style={{ flex: '1 1 auto', width: '100%', minWidth: 0 }}>
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
                      {(canGrant || canUpdate) && (
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id),
                            )
                          }
                        />
                      )}
                      {canOpen ? (
                        <LinkAction
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 14,
                          }}
                          onClick={() => openRepo(row)}
                        >
                          {row.name || '(未命名题库)'}
                        </LinkAction>
                      ) : (
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
                          {row.name || '(未命名题库)'}
                        </span>
                      )}
                      <Tag color={row.mode === 'exam' ? 'orange' : 'blue'}>
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
                      <span>{row.category || '未分类'}</span>
                      <span>{row.total ?? 0} 题</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {canOpen && (
                        <Button
                          style={{
                            flex: 1,
                            minWidth: 96,
                            height: 38,
                            paddingInline: 0,
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => openRepo(row)}
                        >
                          题目
                        </Button>
                      )}
                      {canExport && (
                        <Button
                          style={{
                            flex: 1,
                            minWidth: 96,
                            height: 38,
                            paddingInline: 0,
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => setExportTarget({ id: row.id, name: row.name, total: row.total })}
                        >
                          导出
                        </Button>
                      )}
                      {canGrant && (
                        <Button
                          style={{
                            flex: 1,
                            minWidth: 96,
                            height: 38,
                            paddingInline: 0,
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => setGranting(row)}
                        >
                          授权
                        </Button>
                      )}
                      {canUpdate && (
                        <Button
                          style={{
                            flex: 1,
                            minWidth: 96,
                            height: 38,
                            paddingInline: 0,
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => openRename(row)}
                        >
                          编辑
                        </Button>
                      )}
                      {canDelete && (
                        <Popconfirm
                          title={`删除「${row.name || '未命名题库'}」？`}
                          description="题库里的题目会一起删除，且不可恢复。"
                          okText="删除"
                          cancelText="取消"
                          onConfirm={() => remove(row)}
                        >
                          <Button
                            danger
                            style={{
                              flex: 1,
                              minWidth: 96,
                              height: 38,
                              paddingInline: 0,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      )}
                    </div>

                    {canPractice && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button
                          type="primary"
                          style={{ flex: '1 1 100px', height: 38, paddingInline: 0, whiteSpace: 'nowrap' }}
                          onClick={() => navigate('/repo/' + row.id + '/practice')}
                        >
                          开始练习
                        </Button>
                        <Button
                          style={{ flex: '1 1 100px', height: 38, paddingInline: 0, whiteSpace: 'nowrap' }}
                          onClick={() => openRandom(row)}
                        >
                          随机练习
                        </Button>
                        {hasPracticeProgress(row.id) && (
                          <Button
                            style={{ flex: '1 1 100px', height: 38, paddingInline: 0, whiteSpace: 'nowrap' }}
                            onClick={() => startPractice(row, 'resume')}
                          >
                            继续练习
                          </Button>
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
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 个题库</span>
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
      <TableScrollRegion label="题库列表（可横向滚动）">
      <Table<RepoView>
        rowKey="id"
        rowSelection={
          canGrant || canUpdate
            ? { selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys as string[]) }
            : undefined
        }
        onChange={(_pagination, _filters, sorter) => {
          const single = Array.isArray(sorter) ? sorter[0] : sorter;
          const key = single && (single.field || single.columnKey) ? String(single.field ?? single.columnKey) : '';
          if (!single || !single.order || !key) {
            setSortKey(undefined);
            setSortDesc(false);
          } else {
            setSortKey(key);
            setSortDesc(single.order === 'descend');
          }
          setPage(1);
        }}
        size="middle"
        components={TABLE_COMPONENTS}
        loading={loading}
        dataSource={rows}
        scroll={{ x: scrollX }}
        locale={{ emptyText: emptyNode }}
        pagination={pager(page, pageSize, total, setPage, setPageSize, (n) => `共 ${n} 个题库`)}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            sorter: true,
            sortOrder: sortOrderOf('name'),
            render: (_: unknown, row) => (
              <div>
                <Space size={6}>
                  <DatabaseOutlined style={{ color: 'var(--bp-text-soft)' }} />
                  {canOpen ? (
                    <LinkAction onClick={() => openRepo(row)}>{row.name || '(未命名题库)'}</LinkAction>
                  ) : (
                    <span>{row.name || '(未命名题库)'}</span>
                  )}
                </Space>
                {row.description && (
                  <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 2 }}>
                    {row.description}
                  </div>
                )}
              </div>
            ),
          },
          {
            title: '分类',
            dataIndex: 'category',
            width: 140,
            sorter: true,
            sortOrder: sortOrderOf('category'),
            render: (v) => v || '—',
          },
          {
            title: '类型',
            dataIndex: 'mode',
            width: 170,
            sorter: true,
            sortOrder: sortOrderOf('mode'),
            render: (mode, row) => (
              <Space size={4} wrap>
                <Tag color={mode === 'exam' ? 'orange' : 'blue'}>
                  {mode ? MODE_LABEL[mode] ?? mode : '—'}
                </Tag>
                {row.isPractice && <Tag>练习库</Tag>}
                {row.shared && <Tag>共享</Tag>}
              </Space>
            ),
          },
          {
            title: '题量',
            dataIndex: 'total',
            width: 90,
            sorter: true,
            sortOrder: sortOrderOf('total'),
            render: (v) => `${v ?? 0} 题`,
          },
          {
            title: '标签',
            dataIndex: 'tag',
            width: 180,
            sorter: true,
            sortOrder: sortOrderOf('tag'),
            render: (_: unknown, row) =>
              row.tag?.length ? (
                <Space size={4} wrap>
                  {row.tag.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </Space>
              ) : (
                '—'
              ),
          },
          ...(canOpen || canPractice || canExport || canGrant || canUpdate || canDelete
            ? [
                {
                  title: '操作',

                  width: actionWidth,
                  render: (_: unknown, row: RepoView) => (
                    <Space size={4}>
                      {canOpen && (
                        <LinkAction style={NOWRAP} onClick={() => openRepo(row)}>
                          题目
                        </LinkAction>
                      )}
                      {canReport && (
                        <LinkAction style={NOWRAP} onClick={() => navigate('/repo/' + row.id + '/report')}>
                          统计
                        </LinkAction>
                      )}
                      {canExport && (
                        <LinkAction
                          style={NOWRAP}
                          onClick={() => setExportTarget({ id: row.id, name: row.name, total: row.total })}
                        >
                          导出
                        </LinkAction>
                      )}
                      {canPractice && (
                        <LinkAction style={NOWRAP} onClick={() => navigate('/repo/' + row.id + '/practice')}>
                          开始练习
                        </LinkAction>
                      )}
                      {canPractice && (
                        <LinkAction style={NOWRAP} onClick={() => openRandom(row)}>
                          随机练习
                        </LinkAction>
                      )}
                      {canPractice && hasPracticeProgress(row.id) && (
                        <LinkAction style={NOWRAP} onClick={() => startPractice(row, 'resume')}>
                          继续练习
                        </LinkAction>
                      )}
                      {canGrant && (
                        <LinkAction style={NOWRAP} onClick={() => setGranting(row)}>
                          授权
                        </LinkAction>
                      )}
                      {canUpdate && (
                        <LinkAction style={NOWRAP} onClick={() => openRename(row)}>
                          编辑
                        </LinkAction>
                      )}
                      {canDelete && (
                        <Popconfirm
                          title={`删除「${row.name || '未命名题库'}」？`}
                          description="题库里的题目会一起删除，且不可恢复。"
                          okText="删除"
                          cancelText="取消"
                          onConfirm={() => remove(row)}
                        >
                          <LinkAction style={{ ...NOWRAP, color: 'var(--bp-orange)' }}>删除</LinkAction>
                        </Popconfirm>
                      )}
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
      </TableScrollRegion>
      )}
        </div>
      </div>

      <Modal
        title={`随机练习${randomRepo?.name ? `：${randomRepo.name}` : ''}`}
        open={Boolean(randomRepo)}
        onCancel={() => setRandomRepo(null)}
        onOk={submitRandom}
        okText="开始随机练习"
        cancelText="取消"
        width={520}
        destroyOnHidden
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12 }}>
          选择题型并填写题数，题数为 0 的题型不会抽取。
        </div>
        <Form
          form={randomForm}
          layout="vertical"
          preserve={false}
          initialValues={{ Radio: 0, Checkbox: 0, Judge: 0, FillBlank: 0, Textarea: 0 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {Object.entries(PRACTICE_TYPE_LABEL).map(([type, label]) => (
              <Form.Item key={type} name={type} label={label}>
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            ))}
          </div>
        </Form>
      </Modal>

      <Modal
        title="新建题库"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, whitespace: true, message: '请填写题库名称' }]}
          >
            <Input placeholder="例如：安全生产题库" maxLength={120} />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, whitespace: true, message: '请填写题库分类' }]}
            extra="后端要求分类必填；可从左侧分类树选择，也可自由输入"
          >
            <AutoComplete
              allowClear
              options={categoryOptions}
              placeholder="例如：安全生产 / 安全生产/基础"
            />
          </Form.Item>
          <Form.Item name="mode" label="类型">
            <Segmented
              options={[
                { label: '考试', value: 'exam' },
                { label: '问卷', value: 'survey' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="window"
            label="全局开放时间"
            extra="班级窗口必须落在全局开放时间内；全局窗口是硬上限，班级老师只能收紧；留空=不限"
          >
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              allowEmpty={[true, true]}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑题库"
        open={!!renaming}
        onCancel={() => setRenaming(null)}
        onOk={submitRename}
        confirmLoading={renameSaving}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={renameForm} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, whitespace: true, message: '请填写名称' }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="category" label="分类" extra="可从左侧分类树选择，也可自由输入">
            <AutoComplete
              allowClear
              options={categoryOptions}
              placeholder="例如：保育员 / 养老护理员 / 育婴员"
            />
          </Form.Item>
          <Form.Item name="tag" label="标签" extra="多个标签用英文逗号分隔">
            <Input maxLength={200} placeholder="例如：三级,重点,2025" />
          </Form.Item>
          <Form.Item
            name="window"
            label="全局开放时间"
            extra="班级窗口必须落在全局开放时间内；全局窗口是硬上限，班级老师只能收紧；留空=不限"
          >
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              allowEmpty={[true, true]}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
      <GrantModal
        repoIds={batchGrantIds}
        open={batchGrantIds.length > 0}
        onClose={() => setBatchGrantIds([])}
        onChanged={() => {
          setBatchGrantIds([]);
          setSelectedIds([]);
          void load();
        }}
      />
      <GrantModal
        repoId={granting?.id}
        repoName={granting?.name}
        open={Boolean(granting)}
        onClose={() => setGranting(null)}

        onChanged={() => void load()}
      />
      <BatchRepoCategoryModal
        open={moveOpen}
        ids={selectedIds}
        onCancel={() => setMoveOpen(false)}
        onDone={() => {
          setMoveOpen(false);
          setSelectedIds([]);
          setTreeToken((token) => token + 1);
          void load();
        }}
      />
      <RepoExportModal target={exportTarget} onClose={() => setExportTarget(null)} />

      {isMobile && (canGrant || canUpdate) && (
        <MobileBatchBar
          allIds={rows.map((row) => row.id)}
          selected={selectedIds}
          onChange={setSelectedIds}
          unit="个"
          actions={
            <>
              {canUpdate && (
                <Button size="small" onClick={() => setMoveOpen(true)}>
                  移动到分类
                </Button>
              )}
              {canGrant && (
                <Button size="small" onClick={() => setBatchGrantIds(selectedIds)}>
                  批量授权
                </Button>
              )}
            </>
          }
        />
      )}
    </>
  );
}