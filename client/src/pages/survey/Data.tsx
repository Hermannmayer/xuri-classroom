import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Drawer, Empty, message, Space, Table, Tag } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { download, getWithPagination } from '../../api';
import type { Answer } from '../../schema/project';
import type { SurveySchema } from '../../schema/types';
import { flattenSchema, type FlatQuestion } from '../../schema/flatten';
import type { AnswerValue } from '../../renderer/types';

const CHOICE = new Set(['Radio', 'Checkbox', 'Select']);
const FILL = new Set(['FillBlank', 'Textarea', 'MultipleBlank', 'HorzBlank']);

/** 把 answer map 里某个题的值转成可读文本 */
function formatAnswer(q: FlatQuestion, value: AnswerValue): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);

  if (Array.isArray(value)) return value.map(String).join('、');

  if (typeof value === 'object') {
    const record = value as Record<string, AnswerValue>;

    if (CHOICE.has(q.type)) {
      const labels = Object.keys(record).map(
        (id) => q.schema.dataSource?.find((o) => o.value === id)?.label ?? id,
      );
      return labels.join('、');
    }

    if (FILL.has(q.type)) {
      return Object.values(record)
        .filter((v) => v !== null && v !== undefined && v !== '')
        .map(String)
        .join('，');
    }

    // 评分/矩阵等：把值拼出来
    return Object.entries(record)
      .map(([k, v]) => (typeof v === 'object' ? `${k}: ${JSON.stringify(v)}` : `${v}`))
      .join('、');
  }

  return String(value);
}

export default function SurveyData() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Answer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Answer>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // pageSize=-1 后端支持取全量，这里按页取
      const res = await getWithPagination<Answer>('/api/answer/list', { projectId: id, current: page, pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const detailQuestions = useMemo(() => {
    if (!detail?.survey) return [];
    return flattenSchema(detail.survey as SurveySchema);
  }, [detail]);

  const exportXlsx = () => {
    download('/api/answer/download', { projectId: id, type: 'answer' }, `答卷-${id}.xlsx`).catch((e: Error) =>
      message.error(e.message),
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/survey/${id}/edit`)} />
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>DATA / 答卷</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            共 {total} 份
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
          刷新
        </Button>
        <Button icon={<DownloadOutlined />} onClick={exportXlsx} disabled={!total}>
          导出 Excel
        </Button>
      </div>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}>
        <Table<Answer>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          locale={{ emptyText: <Empty description="还没有答卷" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (t) => `共 ${t} 条`,
          }}
          columns={[
            {
              title: '提交时间',
              dataIndex: 'createAt',
              width: 180,
              render: (v: string) => <span style={{ fontSize: 12 }}>{v || '—'}</span>,
            },
            {
              title: '答卷人',
              dataIndex: 'createByName',
              width: 140,
              render: (v: string, row) => (
                <span style={{ fontSize: 12 }}>{v || (row.createBy ? row.createBy.slice(0, 8) : '匿名')}</span>
              ),
            },
            {
              title: '状态',
              dataIndex: 'tempSave',
              width: 90,
              render: (v: number) =>
                v === 1 ? <Tag color="success">已提交</Tag> : <Tag color="warning">暂存</Tag>,
            },
            {
              title: '得分',
              dataIndex: 'examScore',
              width: 90,
              render: (v?: number) =>
                typeof v === 'number' && v > 0 ? (
                  <span style={{ color: 'var(--bp-orange)' }}>{v}</span>
                ) : (
                  <span style={{ color: 'var(--bp-text-soft)' }}>—</span>
                ),
            },
            {
              title: '答案摘要',
              key: 'summary',
              render: (_, row) => {
                const questions = row.survey ? flattenSchema(row.survey as SurveySchema) : [];
                const first = questions[0];
                if (!first) return '—';
                const text = formatAnswer(first, (row.answer ?? {})[first.id] as AnswerValue);
                return (
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                    {first.title || first.type}：{text.length > 40 ? `${text.slice(0, 40)}…` : text}
                  </span>
                );
              },
            },
            {
              title: '',
              key: 'ops',
              width: 80,
              render: (_, row) => <a onClick={() => setDetail(row)}>查看</a>,
            },
          ]}
        />
      </Card>

      <Drawer
        title="答卷详情"
        placement="right"
        width={520}
        open={Boolean(detail)}
        onClose={() => setDetail(undefined)}
      >
        {detail && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              提交时间 {detail.createAt || '—'}
              {detail.createByName ? ` · ${detail.createByName}` : ''}
              {typeof detail.examScore === 'number' ? ` · 得分 ${detail.examScore}` : ''}
            </div>
            <hr className="bp-dim" style={{ margin: 0 }} />
            {detailQuestions.map((q, i) => (
              <div key={q.id}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <span className="bp-tag" style={{ marginRight: 6 }}>{i + 1}</span>
                  {q.title || q.type}
                </div>
                <div style={{ fontSize: 13, color: 'var(--bp-text)', paddingLeft: 2 }}>
                  {formatAnswer(q, (detail.answer ?? {})[q.id] as AnswerValue)}
                </div>
              </div>
            ))}
            {detailQuestions.length === 0 && <Empty description="这份答卷没有可展示的题目快照" />}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
