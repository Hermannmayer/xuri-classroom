import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
} from 'antd';
import { DatabaseOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getWithPagination, post } from '../../api';
import { isAdmin, loadAuthorities } from '../../auth/permissions';
import { TABLE_COMPONENTS } from './table';

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

export default function RepoList() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<RepoView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<RepoView | null>(null);
  const [createForm] = Form.useForm<{
    name: string;
    category: string;
    mode: 'exam' | 'survey';
    description?: string;
  }>();
  const [renameForm] = Form.useForm<{ name: string }>();

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
  }, [page, pageSize, keyword]);

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
    const { name } = await renameForm.validateFields();
    try {
      // updateRepo 会先删光旧标签再按 tag 重建，只传 id+name 会把题库标签清空
      await post<void>('/api/repo/update', {
        id: renaming.id,
        name: name.trim(),
        description: renaming.description,
        category: renaming.category,
        mode: renaming.mode,
        tag: renaming.tag ?? [],
        shared: renaming.shared,
        isPractice: renaming.isPractice,
        priority: renaming.priority,
        setting: renaming.setting,
      });
      message.success('已重命名');
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

  return (
    <>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 个题库</span>
        <div style={{ flex: 1 }} />
        <Input.Search
          allowClear
          placeholder="搜索题库名称"
          style={{ width: 220 }}
          onSearch={(v) => {
            setKeyword(v.trim());
            setPage(1);
          }}
        />
      </div>

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
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (n) => `共 ${n} 个题库`,
          onChange: (p, s) => {
            setPage(p);
            setPageSize(s);
          },
        }}
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
                <a
                  onClick={() => {
                    renameForm.setFieldsValue({ name: row.name || '' });
                    setRenaming(row);
                  }}
                >
                  重命名
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
        title="重命名题库"
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
    </>
  );
}
