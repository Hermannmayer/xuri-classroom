import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Empty, Select, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getWithPagination } from '../../api';

interface AuditLog {
  id: string;
  action: string;
  targetId?: string;
  targetName?: string;
  detail?: string;
  ip?: string;
  createBy?: string;
  createAt?: string;
}

const ACTION_LABEL: Record<string, { text: string; color: string }> = {
  EXPORT_REPO: { text: '导出题库', color: 'orange' },
  EXPORT_ANSWER: { text: '导出答卷', color: 'blue' },
  IMPORT_REPO: { text: '导入题库', color: 'default' },
};

/**
 * 系统管理 → 操作日志。
 *
 * 和「导出密码」配套：谁在什么时候把题库/答卷导出去了，这里能查。
 * 只有 system:log:list（默认仅管理员）能看到这个页面。
 */
export default function SystemAudit() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState<string>();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithPagination<AuditLog>('/api/system/audit/list', {
        current: page,
        pageSize,
        action,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, action, message]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>AUDIT / 操作日志</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            导出与导入记录
          </div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
            记录谁在什么时候导出了哪个题库或哪份答卷，用于事后追查。
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Select
          allowClear
          placeholder="按动作筛选"
          style={{ width: 160 }}
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          options={Object.entries(ACTION_LABEL).map(([value, meta]) => ({ value, label: meta.text }))}
        />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()} />
      </div>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)' }}>
        <Table<AuditLog>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          locale={{ emptyText: <Empty description="还没有导出记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          columns={[
            {
              title: '时间',
              dataIndex: 'createAt',
              width: 180,
              render: (v?: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
            },
            {
              title: '动作',
              dataIndex: 'action',
              width: 120,
              render: (v: string) => {
                const meta = ACTION_LABEL[v] ?? { text: v, color: 'default' };
                return <Tag color={meta.color}>{meta.text}</Tag>;
              },
            },
            {
              title: '对象',
              key: 'target',
              render: (_, row) => (
                <span style={{ fontSize: 13 }}>
                  {row.targetName || row.targetId || '—'}
                  {row.detail && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--bp-text-soft)' }}>{row.detail}</span>
                  )}
                </span>
              ),
            },
            {
              title: '操作人',
              dataIndex: 'createBy',
              width: 200,
              render: (v?: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
            },
            {
              title: 'IP',
              dataIndex: 'ip',
              width: 140,
              render: (v?: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
