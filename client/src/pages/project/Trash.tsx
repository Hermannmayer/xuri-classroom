import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Empty, message, Popconfirm, Space, Table, Tag } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getWithPagination, post } from '../../api';
import type { Project } from '../../schema/project';
import { TABLE_COMPONENTS } from '../repo/table';

/** 项目回收站：软删除的试卷/问卷在这里，可恢复或彻底删除 */
export default function ProjectTrash() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithPagination<Project>('/api/project/trash', { current: page, pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (row: Project) => {
    try {
      await post('/api/project/restore', { id: row.id });
      message.success('已恢复');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const destroy = async (row: Project) => {
    try {
      await post('/api/project/destroy', { id: row.id });
      message.success('已彻底删除，无法再恢复');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/project')} />
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>TRASH / 回收站</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            共 {total} 个已删除项目
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}>
        <Table<Project>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          components={TABLE_COMPONENTS}
          locale={{ emptyText: <Empty description="回收站是空的" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (t) => `共 ${t} 条`,
          }}
          columns={[
            { title: '名称', dataIndex: 'name', render: (v: string) => v || '未命名' },
            {
              title: '类型',
              dataIndex: 'mode',
              width: 90,
              render: (v: string) => (v === 'exam' ? <Tag>考试</Tag> : <Tag color="blue">问卷</Tag>),
            },
            { title: '删除时间', dataIndex: 'updateAt', width: 180, render: (v?: string) => v || '—' },
            {
              title: '操作',
              key: 'ops',
              width: 180,
              render: (_, row) => (
                <Space size={12}>
                  <a onClick={() => restore(row)}>恢复</a>
                  <Popconfirm
                    title="彻底删除后无法恢复，确认？"
                    okText="彻底删除"
                    okButtonProps={{ danger: true }}
                    cancelText="取消"
                    onConfirm={() => destroy(row)}
                  >
                    <a style={{ color: 'var(--bp-orange)' }}>彻底删除</a>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
