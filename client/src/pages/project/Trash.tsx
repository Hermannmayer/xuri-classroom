import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Empty, message, Popconfirm, Space, Table, Tag } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import LinkAction from '../../components/LinkAction';
import { get, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import type { Project } from '../../schema/project';
import { TABLE_COMPONENTS } from '../repo/table';

/**
 * 项目回收站：软删除的试卷/问卷在这里，可恢复或彻底删除。
 *
 * 注意：后端 `/api/project/trash` 返回的是**数组**（不是分页对象），
 * 之前用 getWithPagination 解析导致 rows 永远是 []，回收站看起来像“没用”。
 * 这里改成直接取数组，分页在前端做。
 */
export default function ProjectTrash() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [authorities, setAuthorities] = useState<string[]>([]);

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  // 逐项按权限渲染，避免「看得见、点了 403」：
  // 恢复走 project:create，彻底删除走 project:delete，两个动作互不牵连
  const canRestore = can(authorities, 'project:create');
  const canDestroy = can(authorities, 'project:delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get<Project[]>('/api/project/trash');
      const list = Array.isArray(res) ? res : [];
      setRows(list);
      setTotal(list.length);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (row: Project) => {
    try {
      // 后端 ProjectServiceImpl 读的是 request.getIds()，单个 id 也要放进数组
      await post('/api/project/restore', { ids: [row.id] });
      message.success('已恢复');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const destroy = async (row: Project) => {
    try {
      await post('/api/project/destroy', { ids: [row.id] });
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
            // 两个动作各自独立渲染；都没有权限时整列不出现
            ...(canRestore || canDestroy
              ? [
                  {
                    title: '操作',
                    key: 'ops',
                    width: canRestore && canDestroy ? 180 : 110,
                    render: (_: unknown, row: Project) => (
                      <Space size={12} wrap={false} style={{ whiteSpace: 'nowrap' }}>
                        {canRestore && <LinkAction onClick={() => restore(row)}>恢复</LinkAction>}
                        {canDestroy && (
                          <Popconfirm
                            title="彻底删除后无法恢复，确认？"
                            okText="彻底删除"
                            okButtonProps={{ danger: true }}
                            cancelText="取消"
                            onConfirm={() => destroy(row)}
                          >
                            <LinkAction style={{ color: 'var(--bp-orange)' }}>彻底删除</LinkAction>
                          </Popconfirm>
                        )}
                      </Space>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>
    </div>
  );
}
