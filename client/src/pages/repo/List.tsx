import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Empty,
  Form,
  Input,
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
import { DatabaseOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getWithPagination, post } from '../../api';
import { isAdmin, loadAuthorities } from '../../auth/permissions';
import { pager, TABLE_COMPONENTS } from './table';
import GrantModal from './GrantModal';

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
  const [granting, setGranting] = useState<RepoView | null>(null);
  const [createForm] = Form.useForm<{
    name: string;
    category: string;
    mode: 'exam' | 'survey';
    description?: string;
  }>();
  const [renameForm] = Form.useForm<{ name: string; category?: string; tag?: string; description?: string }>();

  const isAdminRef = useRef(false);
  useEffect(() => {
    void loadAuthorities().then((a) => {
      isAdminRef.current = isAdmin(a);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithPagination<RepoView>('/api/repo/list', {
        current: page,
        pageSize,
        name: keyword,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    createForm.setFieldsValue({ name: '', category: '', mode: 'exam', description: '' });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const v = await createForm.validateFields();
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
    }
  };

  const submitRename = async () => {
    if (!renaming) return;
    const { name, category, tag, description } = await renameForm.validateFields();
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
      description={keyword ? '没有匹配的结果' : '还没有题库，点右上角「新建题库」开始'}
    />
  );

  const openRename = (row: RepoView) => {
    renameForm.setFieldsValue({ name: row.name || '' });
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
            我的题库
          </h2>
          <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
            管理题目与 Excel 导入导出；练习记录在「我的练习」。
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建题库
        </Button>
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
                      <a
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                        }}
                        onClick={() => enter(row)}
                      >
                        {row.name || '(未命名题库)'}
                      </a>
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
                      <Button
                        style={{ flex: 1, height: 38, paddingInline: 0 }}
                        onClick={() => enter(row)}
                      >
                        题目
                      </Button>
                      <Button
                        style={{ flex: 1, height: 38, paddingInline: 0 }}
                        onClick={() => setGranting(row)}
                      >
                        授权
                      </Button>
                      <Button
                        style={{ flex: 1, height: 38, paddingInline: 0 }}
                        onClick={() => openRename(row)}
                      >
                        编辑
                      </Button>
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
                    </div>
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
      <Table<RepoView>
        rowKey="id"
        size="middle"
        components={TABLE_COMPONENTS}
        loading={loading}
        dataSource={rows}
        scroll={{ x: 860 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={keyword ? '没有匹配的结果' : '还没有题库，点右上角「新建题库」开始'}
            />
          ),
        }}
        pagination={pager(page, pageSize, total, setPage, setPageSize, (n) => `共 ${n} 个题库`)}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            render: (_: unknown, row) => (
              <div>
                <Space size={6}>
                  <DatabaseOutlined style={{ color: 'var(--bp-text-soft)' }} />
                  <a onClick={() => enter(row)}>{row.name || '(未命名题库)'}</a>
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
            render: (v) => v || '—',
          },
          {
            title: '类型',
            dataIndex: 'mode',
            width: 170,
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
            render: (v) => `${v ?? 0} 题`,
          },
          {
            title: '标签',
            dataIndex: 'tag',
            width: 180,
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
          {
            title: '操作',
            width: 200,
            render: (_: unknown, row) => (
              <Space size={4}>
                <a onClick={() => enter(row)}>题目</a>
                <a onClick={() => setGranting(row)}>授权</a>
                <a
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
                </a>
                <Popconfirm
                  title={`删除「${row.name || '未命名题库'}」？`}
                  description="题库里的题目会一起删除，且不可恢复。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => remove(row)}
                >
                  <a style={{ color: 'var(--bp-orange)' }}>删除</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      )}

      <Modal
        title="新建题库"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
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
        </Form>
      </Modal>
      <GrantModal
        repoId={granting?.id}
        repoName={granting?.name}
        open={Boolean(granting)}
        onClose={() => setGranting(null)}
      />
    </>
  );
}
