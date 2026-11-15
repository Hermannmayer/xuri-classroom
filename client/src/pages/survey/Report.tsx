import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Input, Spin, Table, Tag, message } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useParams, useSearchParams } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import { get, getWithPagination } from '../../api';
import type { Answer } from '../../schema/project';
import type { SurveySchema } from '../../schema/types';
import type { FlatQuestion } from '../../schema/flatten';
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

const TYPE_LABEL: Record<string, string> = {
  Radio: '单选题',
  Checkbox: '多选题',
  Select: '下拉题',
  Judge: '判断题',
  FillBlank: '单行文本',
  Textarea: '多行文本',
  MultipleBlank: '多项填空',
  Nps: 'NPS',
  Score: '打分题',
  MatrixRadio: '矩阵单选',
  MatrixCheckbox: '矩阵多选',
  MatrixScore: '矩阵评分',
  MatrixFill: '矩阵填空',
  Rate: '评分题',
  RichText: '富文本',
};

interface QuestionScoreStat {
  answered: number;
  scored: number;
  correct: number;
  rate?: number;
}

function scoreStat(q: FlatQuestion, answers: Answer[]): QuestionScoreStat {
  let answered = 0;
  let scored = 0;
  let correct = 0;
  const max = Number((q.schema as { attribute?: { examScore?: number } }).attribute?.examScore ?? 0);
  for (const answer of answers) {
    const value = (answer.answer ?? {})[q.id];
    if (value === undefined || value === null || value === '') continue;
    answered += 1;
    const info = answer.examInfo as { questionScore?: Record<string, number> } | undefined;
    const score = info?.questionScore?.[q.id];
    if (typeof score === 'number' && max > 0) {
      scored += 1;
      if (score >= max - 0.0001) correct += 1;
    }
  }
  return { answered, scored, correct, rate: scored > 0 ? (correct / scored) * 100 : undefined };
}

export default function SurveyReport() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId') || undefined;
  const className = searchParams.get('className') || undefined;
  const [report, setReport] = useState<ReportData>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, list] = await Promise.all([
        classId
          ? get<ReportData>(`/api/report/class/${id}`, { classId, includeAnonymous: true }).catch(() => undefined)
          : get<ReportData>(`/api/report/${id}`, { includeAnonymous: true }).catch(() => undefined),
        classId
          ? getWithPagination<Answer>('/api/teaching/classes/answers', {
              projectId: id,
              deptId: classId,
              current: 1,
              pageSize: 5000,
            }).catch(() => ({ current: 1, pageSize: 0, total: 0, data: [] as Answer[] }))
          : getWithPagination<Answer>('/api/answer/list', {
              projectId: id,
              current: 1,
              pageSize: -1,
              includeAnonymous: true,
            }).catch(() => ({
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
  }, [id, classId]);

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

  const typeSummary = useMemo(() => {
    const groups = new Map<string, { type: string; label: string; questionCount: number; answered: number; scored: number; correct: number }>();
    for (const q of questions) {
      const stat = scoreStat(q, answers);
      const row = groups.get(q.type) ?? { type: q.type, label: TYPE_LABEL[q.type] || q.type, questionCount: 0, answered: 0, scored: 0, correct: 0 };
      row.questionCount += 1;
      row.answered += stat.answered;
      row.scored += stat.scored;
      row.correct += stat.correct;
      groups.set(q.type, row);
    }
    return [...groups.values()];
  }, [questions, answers]);

  const scoreAnalysis = useMemo(() => {
    const totalScore = questions.reduce((sum, q) => sum + Number((q.schema as { attribute?: { examScore?: number } }).attribute?.examScore ?? 0), 0);
    if (totalScore <= 0) return undefined;
    const buckets = [
      { label: '0–33%', min: 0, max: 33, count: 0 },
      { label: '33–67%', min: 33, max: 67, count: 0 },
      { label: '67–100%', min: 67, max: 100.0001, count: 0 },
    ];
    let scored = 0;
    for (const answer of answers) {
      if (typeof answer.examScore !== 'number') continue;
      const percent = Math.max(0, Math.min(100, (answer.examScore / totalScore) * 100));
      const bucket = buckets.find((item) => percent >= item.min && percent < item.max);
      if (bucket) bucket.count += 1;
      scored += 1;
    }
    return { totalScore, scored, buckets };
  }, [questions, answers]);

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
        <BackButton label="返回" fallback={'/survey/' + id} style={{ paddingLeft: 0 }} />
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>REPORT / 分析</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            {classId ? `班级数据 · ${className || classId} · ` : ''}共 {report?.total ?? answers.length} 份答卷 · {blocks.length} 题
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

          {scoreAnalysis && (
            <Card
              className="bp-corners bp-card"
              title={<span className="bp-title" style={{ fontSize: 12 }}>SCORE / 分值分析</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                  已判分 {scoreAnalysis.scored} 人 · 总分 {scoreAnalysis.totalScore} 分
                </div>
                {scoreAnalysis.buckets.map((bucket) => (
                  <div key={bucket.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ width: 80 }}>{bucket.label}</span>
                    <Bar value={bucket.count} max={Math.max(1, ...scoreAnalysis.buckets.map((b) => b.count))} />
                    <span style={{ width: 100, textAlign: 'right', color: 'var(--bp-text-soft)' }}>
                      {bucket.count} 人 · {scoreAnalysis.scored ? ((bucket.count / scoreAnalysis.scored) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {typeSummary.length > 0 && (
            <Card
              className="bp-corners bp-card"
              title={<span className="bp-title" style={{ fontSize: 12 }}>TYPE / 题型正确率</span>}
            >
              <Table
                rowKey="type"
                size="small"
                pagination={false}
                dataSource={typeSummary}
                columns={[
                  { title: '题型', dataIndex: 'label', render: (label: string) => <Tag>{label}</Tag> },
                  { title: '题数', dataIndex: 'questionCount', width: 70, align: 'right' },
                  { title: '答题人数', dataIndex: 'answered', width: 100, align: 'right' },
                  {
                    title: '已判分',
                    dataIndex: 'scored',
                    width: 90,
                    align: 'right',
                    render: (value: number) => value,
                  },
                  {
                    title: '正确率',
                    key: 'rate',
                    width: 100,
                    align: 'right',
                    render: (_: unknown, row: { scored: number; correct: number }) =>
                      row.scored > 0 ? `${((row.correct / row.scored) * 100).toFixed(1)}%` : '—',
                  },
                ]}
              />
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
