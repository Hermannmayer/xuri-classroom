import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import { AppstoreOutlined, DatabaseOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import LinkAction from '../../components/LinkAction';
import TableScrollRegion from '../../components/TableScrollRegion';
import { getWithPagination, post } from '../../api';
import { loadAuthorities } from '../../auth/permissions';
import { pager, TABLE_COMPONENTS } from './table';
import GrantModal from './GrantModal';
import RepoGroups from './RepoGroups';

/** 与后端 RepoView 对齐（只取列表要用的字段） */
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
  // 声明式 Modal 的 onOk 不会自动锁按钮：自己控制 loading，防止双击创建两个题库/重复保存
  const [creating, setCreating] = useState(false);
  const [renameSaving, setRenameSaving] = useState(false);
  const [granting, setGranting] = useState<RepoView | null>(null);
  const [randomRepo, setRandomRepo] = useState<RepoView | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [randomForm] = Form.useForm<Record<string, number>>();
  const [createForm] = Form.useForm<{
    name: string;
    category: string;
    mode: 'exam' | 'survey';
    description?: string;
  }>();
  const [renameForm] = Form.useForm<{ name: string; category?: string; tag?: string; description?: string }>();

  const [authorities, setAuthorities] = useState<string[]>([]);
  useEffect(() => {
    void loadAuthorities().then((a) => setAuthorities(a));
  }, []);

  // permissions.ts 的 can() 会按域前缀放行（学员的 repo:list 会被当成 repo:*），
  // 这里按「精确权限 / 域通配符 / ROLE_admin」判断，避免学员拿到管理操作。
  const hasPermission = (permission: string) =>
    authorities.includes('ROLE_admin') ||
    authorities.includes(permission) ||
    authorities.includes(`${permission.split(':')[0]}:*`);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchGrantIds, setBatchGrantIds] = useState<string[]>([]);
  // 排序统一受控：antd 只要有一列给了 sortOrder，整张表就按受控处理，
  // 所以 5 个可排序列必须都由同一个状态驱动，否则没给 sortOrder 的列点了没反应。
  // name 走服务端（跨页正确、按拼音排）；其余四列在前端对当前页排序。
  const [sortKey, setSortKey] = useState<string>();
  const [sortDesc, setSortDesc] = useState(false);
  const sortOrderOf = (key: string) => (sortKey === key ? (sortDesc ? 'descend' : 'ascend') : null);

  /**
   * 非「名称」列的排序在本地做：这些字段后端没有排序参数。
   * 汉字统一用 localeCompare('zh-CN') 走拼音序，和名称列（后端 GBK 排序）保持一致。
   */
  const sortedRows = useMemo(() => {
    if (!sortKey || sortKey === 'name') return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'category':
          return (a.category || '').localeCompare(b.category || '', 'zh-CN');
        case 'mode':
          return (a.mode || '').localeCompare(b.mode || '', 'zh-CN');
        case 'total':
          return (a.total ?? 0) - (b.total ?? 0);
        case 'tag':
          return (a.tag || []).join(',').localeCompare((b.tag || []).join(','), 'zh-CN');
        default:
          return 0;
      }
    });
    return sortDesc ? arr.reverse() : arr;
  }, [rows, sortKey, sortDesc]);
  const canCreate = hasPermission('repo:create');
  // 批量授权走 repo:grant；兼容老数据：有 repo:update 的也能看到入口
  const canGrant = hasPermission('repo:grant') || hasPermission('repo:update');
  const canDetail = hasPermission('repo:detail');
  const canUpdate = hasPermission('repo:update');
  const canDelete = hasPermission('repo:delete');

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
        // 学员没有 repo:create 时只看「自己/被授权/共享」的题库；否则后端会返回 0 条
        memberOnly: canCreate ? undefined : true,
        sortBy: sortKey === 'name' ? 'name' : undefined,
        sortDesc: sortKey === 'name' ? sortDesc : undefined,
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

  const openCreate = () => {
    createForm.setFieldsValue({ name: '', category: '', mode: 'exam', description: '' });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (creating) return;
    let v: { name: string; category: string; mode: 'exam' | 'survey'; description?: string };
    try {
      v = await createForm.validateFields();
    } catch {
      return; // 校验提示已经在字段上
    }
    setCreating(true);
    try {
      await post<void>('/api/repo/create', {
        name: v.name.trim(),
        category: v.category.trim(),
        mode: v.mode,
        description: v.description?.trim() || undefined,
      });
      setCreateOpen(false);
      message.success('已创建题库');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const submitRename = async () => {
    if (!renaming || renameSaving) return;
    let values: { name: string; category?: string; tag?: string; description?: string };
    try {
      values = await renameForm.validateFields();
    } catch {
      return; // 校验提示已经在字段上
    }
    const { name, category, tag, description } = values;
    setRenameSaving(true);
    try {
      // updateRepo 会先删光旧标签再按 tag 重建，只传 id+name 会把题库标签清空
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
      });
      message.success('已保存');
      setRenaming(null);
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
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const enter = (row: RepoView) => {
    navigate(`/repo/${row.id}/questions/normal`, { state: { repoName: row.name } });
  };

  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={keyword ? '没有匹配的结果' : canCreate ? '还没有题库，点右上角「新建题库」开始' : '还没有可浏览的题库'}
    />
  );

  const openRename = (row: RepoView) => {
    renameForm.setFieldsValue({
      name: row.name || '',
      category: row.category,
      tag: (row.tag || []).join(','),
      description: row.description,
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
          <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
            {canCreate
              ? '管理题目与 Excel 导入导出；练习记录在「我的练习」。'
              : '浏览题库题目；练习记录在「我的练习」。'}
          </div>
        </div>
        <Button icon={<AppstoreOutlined />} onClick={() => setGroupsOpen(true)}>
          按分类浏览
        </Button>
        {canGrant && selectedIds.length > 0 && (
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
        <Select
          allowClear
          placeholder="全部分类"
          style={{ width: 160 }}
          value={categoryFilter}
          onChange={(v) => {
            setPage(1);
            setCategoryFilter(v);
          }}
          options={[...new Set(rows.map((r) => r.category).filter(Boolean))].map((c) => ({ value: c as string, label: c as string }))}
        />
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
                      <LinkAction
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                        }}
                        onClick={() => { if (canDetail) enter(row); }}
                      >
                        {row.name || '(未命名题库)'}
                      </LinkAction>
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

                    <div style={{ display: 'flex', gap: 8 }}>
                      {canDetail && (
                        <Button
                          style={{ flex: 1, height: 38, paddingInline: 0 }}
                          onClick={() => enter(row)}
                        >
                          题目
                        </Button>
                      )}
                      {canUpdate && (
                        <Button
                          style={{ flex: 1, height: 38, paddingInline: 0 }}
                          onClick={() => setGranting(row)}
                        >
                          授权
                        </Button>
                      )}
                      {canUpdate && (
                        <Button
                          style={{ flex: 1, height: 38, paddingInline: 0 }}
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
                          <Button danger style={{ flex: 1, height: 38, paddingInline: 0 }}>
                            删除
                          </Button>
                        </Popconfirm>
                      )}
                    </div>

                    {!canCreate && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button
                          type="primary"
                          style={{ flex: '1 1 100px', height: 38, paddingInline: 0 }}
                          onClick={() => startPractice(row, 'full')}
                        >
                          开始练习
                        </Button>
                        <Button
                          style={{ flex: '1 1 100px', height: 38, paddingInline: 0 }}
                          onClick={() => openRandom(row)}
                        >
                          随机练习
                        </Button>
                        {hasPracticeProgress(row.id) && (
                          <Button
                            style={{ flex: '1 1 100px', height: 38, paddingInline: 0 }}
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
        rowSelection={canGrant ? { selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys as string[]) } : undefined}
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
        dataSource={sortedRows}
        scroll={{ x: 860 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={keyword ? '没有匹配的结果' : canCreate ? '还没有题库，点右上角「新建题库」开始' : '还没有可浏览的题库'}
            />
          ),
        }}
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
                  <LinkAction onClick={() => { if (canDetail) enter(row); }}>{row.name || '(未命名题库)'}</LinkAction>
                </Space>
                {row.description && (
                  <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.65)', marginTop: 2 }}>
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
          ...(canDetail || canUpdate || canDelete
            ? [
                {
                  title: '操作',
                  width: canUpdate || canDelete ? 200 : 280,
                  render: (_: unknown, row: RepoView) => (
                    <Space size={4}>
                      {canDetail && <LinkAction onClick={() => enter(row)}>题目</LinkAction>}
                      {!canCreate && <LinkAction onClick={() => startPractice(row, 'full')}>开始练习</LinkAction>}
                      {!canCreate && <LinkAction onClick={() => openRandom(row)}>随机练习</LinkAction>}
                      {!canCreate && hasPracticeProgress(row.id) && (
                        <LinkAction onClick={() => startPractice(row, 'resume')}>继续练习</LinkAction>
                      )}
                      {canUpdate && <LinkAction onClick={() => setGranting(row)}>授权</LinkAction>}
                      {canUpdate && (
                        <LinkAction
                          onClick={() => {
                            renameForm.setFieldsValue({
                              name: row.name || '',
                              category: row.category,
                              tag: (row.tag || []).join(','),
                              description: row.description,
                            });
                            setRenaming(row);
                          }}
                        >
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
                          <LinkAction style={{ color: 'var(--bp-orange)' }}>删除</LinkAction>
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

      <Modal
        title={`随机练习${randomRepo?.name ? `：${randomRepo.name}` : ''}`}
        open={Boolean(randomRepo)}
        onCancel={() => setRandomRepo(null)}
        onOk={submitRandom}
        okText="开始随机练习"
        cancelText="取消"
        width={520}
        destroyOnClose
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
        destroyOnClose
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
            extra="后端要求分类必填；练习题库会按分类分组展示"
          >
            <Input placeholder="例如：安全生产" maxLength={60} />
          </Form.Item>
          <Form.Item name="mode" label="类型">
            <Segmented
              options={[
                { label: '考试', value: 'exam' },
                { label: '问卷', value: 'survey' },
              ]}
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
        destroyOnClose
      >
        <Form form={renameForm} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, whitespace: true, message: '请填写名称' }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="category" label="分类" extra="例如：保育员 / 养老护理员 / 育婴员">
            <Input maxLength={60} placeholder="按专业或课程分类" />
          </Form.Item>
          <Form.Item name="tag" label="标签" extra="多个标签用英文逗号分隔">
            <Input maxLength={200} placeholder="例如：三级,重点,2025" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
      <RepoGroups
        open={groupsOpen}
        repos={rows}
        onClose={() => setGroupsOpen(false)}
        onEdit={(repo) => {
          setGroupsOpen(false);
          renameForm.setFieldsValue({
            name: repo.name || '',
            category: repo.category,
            description: (repo as RepoView).description,
          });
          setRenaming(repo as RepoView);
        }}
      />
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
        // 授权/取消后刷新列表：题库的可见范围变了，列表里的「已授权」状态也要跟着变
        onChanged={() => void load()}
      />
    </>
  );
}