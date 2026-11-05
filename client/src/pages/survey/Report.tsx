import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Input, Spin, message } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { get, getWithPagination } from '../../api';
import type { Answer } from '../../schema/project';
import type { SurveySchema } from '../../schema/types';
import { flattenSchema } from '../../schema/flatten';
import { isDataQuestion } from './data/format';
import QuestionBlock, { Bar } from './report/QuestionBlock';

interface ReportStat {
  min?: number;
  max?: number;
  average?: number;
  sum?: number;
  total?: number;
}

interface ReportData {
  total?: number;
  statistics?: Record<string, ReportStat>;
  dailyCountStat?: Record<string, number>;
}

export default function SurveyReport() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, list] = await Promise.all([
        get<ReportData>(`/api/report/${id}`).catch(() => undefined),
        getWithPagination<Answer>('/api/answer/list', { projectId: id, current: 1, pageSize: -1 }).catch(() => ({
          current: 1,
          pageSize: 0,
          total: 0,
          data: [] as Answer[],
        })),
      ]);
      setReport(r);
      setAnswers(list.data);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 问卷结构取最新一份答卷的快照（没有答卷时报表就是空的） */
  const survey = answers[0]?.survey as SurveySchema | undefined;
  const questions = useMemo(
    () => (survey ? flattenSchema(survey).filter(isDataQuestion) : []),
    [survey],
  );

  /** 顶部搜索按题干过滤题目区块 */
  const blocks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return keyword ? questions.filter((q) => (q.title ?? '').toLowerCase().includes(keyword)) : questions;
  }, [questions, search]);

  const daily = useMemo(() => {
    const entries = Object.entries(report?.dailyCountStat ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return { entries, max };
  }, [report]);

  const numeric = useMemo(() => {
    const stats = report?.statistics ?? {};
    return (
      Object.entries(stats)
        .map(([qId, stat]) => ({ qId, stat, question: questions.find((q) => q.id === qId) }))
        // 后端会给所有题都建一条记录，只有真正取到数字的才有 average
        .filter((row) => row.question && row.stat.average !== undefined)
    );
  }, [report, questions]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/survey/${id}/edit`)} />
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>REPORT / 分析</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            共 {report?.total ?? answers.length} 份答卷 · {blocks.length} 题
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索题目"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 200 }}
        />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      {answers.length === 0 ? (
        <Card className="bp-corners bp-card">
          <Empty description="还没有答卷，发布后收集到数据再看" />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 每日答卷趋势 */}
          {daily.entries.length > 0 && (
            <Card
              className="bp-corners bp-card"
              title={<span className="bp-title" style={{ fontSize: 12 }}>DAILY / 每日答卷</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {daily.entries.map(([day, count]) => (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ width: 90, color: 'var(--bp-text-soft)' }}>{day}</span>
                    <Bar value={count} max={daily.max} />
                    <span style={{ width: 40, textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 每题一个区块：图表三态 + 选项明细表 */}
          {blocks.map((q) => (
            <QuestionBlock key={q.id} q={q} answers={answers} />
          ))}

          {blocks.length === 0 && (
            <Card className="bp-corners bp-card">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`没有题干包含「${search.trim()}」的题目`} />
            </Card>
          )}

          {/* 数值统计 */}
          {numeric.length > 0 && (
            <Card
              className="bp-corners bp-card"
              title={<span className="bp-title" style={{ fontSize: 12 }}>NUMERIC / 数值统计</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                {numeric.map(({ qId, stat, question }) => (
                  <div key={qId} style={{ display: 'flex', gap: 16 }}>
                    <span style={{ flex: 1 }}>{question?.title || question?.type}</span>
                    <span style={{ color: 'var(--bp-text-soft)' }}>
                      均 {stat.average ?? '—'} / 最小 {stat.min ?? '—'} / 最大 {stat.max ?? '—'} / 合计 {stat.sum ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
