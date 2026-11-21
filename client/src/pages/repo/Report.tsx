import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Empty, Spin, Table } from 'antd';
import { get, type RepoReportInfo } from '../../api';
import BackButton from '../../components/BackButton';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

/** 题库统计 */
export default function RepoReport() {
  const { repoId = '' } = useParams();
  const [data, setData] = useState<RepoReportInfo>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    get<RepoReportInfo>('/api/repo/report', { repoId })
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [repoId]);

  const typeRows = useMemo(
    () => Object.entries(data?.byType ?? {}).map(([name, count]) => ({ key: name, name, count })),
    [data],
  );
  const diffRows = useMemo(
    () => Object.entries(data?.byDifficulty ?? {}).map(([name, count]) => ({ key: name, name, count })),
    [data],
  );

  const columns = [
    { title: '分类', dataIndex: 'name', ellipsis: true },
    { title: '题数', dataIndex: 'count', width: 80, align: 'right' as const },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <BackButton label="返回" fallback="/repo/index" style={{ paddingLeft: 0 }} />
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>REPO / 统计</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            {data?.repoName || '题库统计'}
          </div>
        </div>
      </div>

      <Spin spinning={loading}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <Card className="bp-corners bp-card" title={<span className="bp-title" style={{ fontSize: 12 }}>概况</span>}>
            <Stat label="题量" value={String(data?.total ?? 0)} />
            <Stat label="练习次数" value={String(data?.practice?.count ?? 0)} />
            <Stat label="练习人数" value={String(data?.practice?.students ?? 0)} />
            <Stat
              label="平均得分"
              value={data?.practice?.avgScore == null ? '—' : data.practice.avgScore.toFixed(1)}
            />
          </Card>
          <Card className="bp-corners bp-card" title={<span className="bp-title" style={{ fontSize: 12 }}>题型分布</span>}>
            <Table
              rowKey="key"
              size="small"
              bordered
              pagination={false}
              columns={columns}
              dataSource={typeRows}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无题目" /> }}
            />
          </Card>
          <Card className="bp-corners bp-card" title={<span className="bp-title" style={{ fontSize: 12 }}>难度分布</span>}>
            <Table
              rowKey="key"
              size="small"
              bordered
              pagination={false}
              columns={columns}
              dataSource={diffRows}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="题目还没标难度" /> }}
            />
          </Card>
        </div>

        {(data?.practice?.count ?? 0) === 0 && !loading ? (
          <Card className="bp-corners bp-card">
            <Empty description="还没有人练过这个题库：练习记录出现后，这里会显示练习次数、人数与平均得分" />
          </Card>
        ) : null}
      </Spin>
    </div>
  );
}
