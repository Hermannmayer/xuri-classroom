import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Input, Table, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { get } from '../../api';
import TableScrollRegion from '../../components/TableScrollRegion';

interface MyReportRow {
  projectId: string;
  projectName?: string;
  status?: number;
  attempts?: number;
  bestScore?: number | null;
  lastSubmitAt?: string;
}

const fmtTime = (v?: string) => (v ? String(v).slice(0, 16).replace('T', ' ') : '—');

/** 我的成绩：按考试聚合，只能看到自己交过的卷子 */
export default function MyReport() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<MyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await get<MyReportRow[]>('/api/my-report/list');
      setRows(list ?? []);
    } catch (e) {
      message.error((e as Error).message || '读取成绩失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (keyword ? rows.filter((r) => (r.projectName || '').toLowerCase().includes(keyword.toLowerCase())) : rows),
    [rows, keyword],
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索考试名称"
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {filtered.length} 场</span>
      </div>
      <TableScrollRegion label="我的成绩（可横向滚动）">
        <Table<MyReportRow>
          rowKey="projectId"
          size="middle"
          loading={loading}
          dataSource={filtered}
          pagination={{ pageSize: 20, hideOnSinglePage: true, showTotal: (n) => `共 ${n} 场` }}
          locale={{ emptyText: '还没有成绩记录，先去做一场考试' }}
          columns={[
            {
              title: '考试名称',
              dataIndex: 'projectName',
              sorter: (a, b) => (a.projectName || '').localeCompare(b.projectName || '', 'zh-CN'),
              render: (_: unknown, row) => row.projectName || '(未命名)',
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (_: unknown, row) =>
                row.status === 1 ? <Tag color="success">已发布</Tag> : <Tag>未发布</Tag>,
            },
            {
              title: '参加次数',
              dataIndex: 'attempts',
              width: 100,
              sorter: (a, b) => (a.attempts ?? 0) - (b.attempts ?? 0),
            },
            {
              title: '最高分',
              dataIndex: 'bestScore',
              width: 110,
              sorter: (a, b) => (a.bestScore ?? -1) - (b.bestScore ?? -1),
              render: (v: number | null | undefined) => (v === null || v === undefined ? '—' : v),
            },
            {
              title: '最近一次',
              dataIndex: 'lastSubmitAt',
              width: 170,
              sorter: (a, b) => String(a.lastSubmitAt || '').localeCompare(String(b.lastSubmitAt || '')),
              render: (v: string | undefined) => fmtTime(v),
            },
          ]}
        />
      </TableScrollRegion>
    </div>
  );
}
