import { useCallback, useEffect, useState } from 'react';
import { Empty, Form, Input, message, Modal, Table, Tag, Typography } from 'antd';
import { getWithPagination, post } from '../../api';
import { pager, TABLE_COMPONENTS } from './table';

/** 与后端 UserBookView 对齐 */
interface UserBookView {
  id: string;
  templateId?: string;
  name?: string;
  wrongTimes?: number;
  note?: string;
  status?: number;
  type?: number;
  createAt?: string;
}

export default function RepoBook() {
  const [rows, setRows] = useState<UserBookView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nameKeyword, setNameKeyword] = useState('');
  const [noteKeyword, setNoteKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<UserBookView | null>(null);
  const [editForm] = Form.useForm<{ note?: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // ponytail: UserBookQuery 没有 note 字段，笔记搜索只能拉全量后前端过滤（个人笔记量小）；
      // 后端补 note 条件后可改成和 name 一样的服务端过滤
      const noteFilter = noteKeyword.trim();
      const res = await getWithPagination<UserBookView>('/api/repo/book/list', {
        current: noteFilter ? 1 : page,
        pageSize: noteFilter ? -1 : pageSize,
        name: nameKeyword,
      });
      if (!noteFilter) {
        setRows(res.data);
        setTotal(res.total);
        return;
      }
      const needle = noteFilter.toLowerCase();
      const matched = res.data.filter((row) => (row.note ?? '').toLowerCase().includes(needle));
      const start = (page - 1) * pageSize;
      setTotal(matched.length);
      setRows(matched.slice(start, start + pageSize));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, nameKeyword, noteKeyword]);

  useEffect(() => {
    void load();
  }, [load]);

  // Modal 关闭时会销毁 Form，等它挂载后再回填，避免 useForm 未连接警告
  useEffect(() => {
    if (editing) {
      editForm.setFieldsValue({ note: editing.note || '' });
    }
  }, [editing, editForm]);

  const submitEdit = async () => {
    if (!editing) return;
    const { note } = await editForm.validateFields();
    try {
      await post('/api/repo/book/update', { id: editing.id, note: note ?? '' });
      message.success('笔记已保存');
      setEditing(null);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const hasFilter = !!nameKeyword || !!noteKeyword;

  return (
    <>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            BOOK / 我的笔记
          </div>
          <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
            错题本
          </h2>
          <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
            练习时做错的题会收进这里；可以补充笔记，标记简单题。
          </div>
        </div>
      </div>

      <hr className="bp-dim" style={{ margin: '0 0 16px' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 条笔记</span>
        <div style={{ flex: 1 }} />
        <Input.Search
          allowClear
          placeholder="搜索题目名称"
          style={{ width: 200 }}
          onSearch={(v) => {
            setNameKeyword(v.trim());
            setPage(1);
          }}
          onChange={(e) => {
            if (!e.target.value) {
              setNameKeyword('');
              setPage(1);
            }
          }}
        />
        <Input.Search
          allowClear
          placeholder="搜索笔记内容"
          style={{ width: 200 }}
          onSearch={(v) => {
            setNoteKeyword(v.trim());
            setPage(1);
          }}
          onChange={(e) => {
            if (!e.target.value) {
              setNoteKeyword('');
              setPage(1);
            }
          }}
        />
      </div>

      <Table<UserBookView>
        rowKey="id"
        size="middle"
        components={TABLE_COMPONENTS}
        loading={loading}
        dataSource={rows}
        scroll={{ x: 960 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={hasFilter ? '没有匹配的笔记' : '练习后错题会出现在这里'}
            />
          ),
        }}
        pagination={pager(page, pageSize, total, setPage, setPageSize, (n) => `共 ${n} 条笔记`)}
        columns={[
          {
            title: '题目',
            dataIndex: 'name',
            render: (_: unknown, row) => <span style={{ fontWeight: 500 }}>{row.name || '(无标题)'}</span>,
          },
          {
            title: '错误次数',
            dataIndex: 'wrongTimes',
            width: 100,
            render: (v) => `${v ?? 0} 次`,
          },
          {
            title: '笔记',
            dataIndex: 'note',
            width: 320,
            render: (v) =>
              v ? (
                <Typography.Paragraph
                  ellipsis={{ rows: 3, expandable: true }}
                  style={{ marginBottom: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {v}
                </Typography.Paragraph>
              ) : (
                '—'
              ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 120,
            render: (v) => (
              <Tag color={v === 1 ? 'blue' : 'default'}>{v === 1 ? '已标记简单' : '未标记'}</Tag>
            ),
          },
          {
            title: '创建时间',
            dataIndex: 'createAt',
            width: 160,
            render: (v) => v || '—',
          },
          {
            title: '操作',
            width: 110,
            render: (_: unknown, row) => (
              <a onClick={() => setEditing(row)}>编辑笔记</a>
            ),
          },
        ]}
      />

      <Modal
        title="编辑笔记"
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        {editing?.name && (
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12 }}>
            {editing.name}
          </div>
        )}
        <Form form={editForm} layout="vertical" preserve={false}>
          <Form.Item name="note" label="笔记内容">
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 10 }}
              maxLength={2000}
              showCount
              placeholder="写下你的理解、易错点…"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
