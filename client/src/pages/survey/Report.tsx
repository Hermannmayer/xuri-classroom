import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Spin, message } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { get, getWithPagination } from '../../api';
import type { Answer } from '../../schema/project';
import type { SurveySchema } from '../../schema/types';
import { flattenSchema } from '../../schema/flatten';

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

const CHOICE = new Set(['Radio', 'Checkbox', 'Select', 'Judge']);

/** 横向条形：纯 CSS，不引图表库 */
function Bar({ value, max, color = 'var(--bp-blue)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: 8, background: color, transition: 'width 200ms' }} />
    </div>
  );
}

export default function SurveyReport() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

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
  const questions = useMemo(() => (survey ? flattenSchema(survey) : []), [survey]);

  /** 选择题分布：后端报表只给数值型统计，选项分布在前端用答卷算 */
  const distributions = useMemo(() => {
    return questions
      .filter((q) => CHOICE.has(q.type))
      .map((q) => {
        const counts: Record<string, number> = {};
        for (const a of answers) {
          const v = (a.answer ?? {})[q.id];
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            for (const key of Object.keys(v as object)) counts[key] = (counts[key] ?? 0) + 1;
          }
        }
        const rows = (q.schema.dataSource ?? []).map((o) => ({
          label: o.label,
          count: counts[o.value] ?? 0,
        }));
        const max = Math.max(1, ...rows.map((r) => r.count));
        return { q, rows, max };
      });
  }, [questions, answers]);

  const daily = useMemo(() => {
    const entries = Object.entries(report?.dailyCountStat ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return { entries, max };
  }, [report]);

  const numeric = useMemo(() => {
    const stats = report?.statistics ?? {};
    return Object.entries(stats)
      .map(([qId, stat]) => ({ qId, stat, question: questions.find((q) => q.id === qId) }))
      // 后端会把所有题都列进来，没数值的（选择题/填空）过滤掉
      .filter((row) => row.question && (row.stat.average !== undefined || row.stat.sum !== undefined));
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
            共 {report?.total ?? answers.length} 份答卷
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      {answers.length === 0 ? (
        <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}>
          <Empty description="还没有答卷，发布后收集到数据再看" />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 每日答卷趋势 */}
          {daily.entries.length > 0 && (
            <Card
              className="bp-corners"
              style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}
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

          {/* 选择题分布 */}
          {distributions.map(({ q, rows, max }) => (
            <Card
              key={q.id}
              style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}
              title={
                <span style={{ fontSize: 13 }}>
                  <span className="bp-tag" style={{ marginRight: 8 }}>{q.number}</span>
                  {q.title || q.type}
                </span>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map((r) => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ width: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.label}
                    </span>
                    <Bar value={r.count} max={max} color="var(--bp-orange)" />
                    <span style={{ width: 64, textAlign: 'right', color: 'var(--bp-text-soft)' }}>
                      {r.count} 票
                    </span>
                  </div>
                ))}
                {rows.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有选项数据" />}
              </div>
            </Card>
          ))}

          {/* 数值统计 */}
          {numeric.length > 0 && (
            <Card
              className="bp-corners"
              style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}
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
