import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Empty, Input, Spin, Table, Tag, message } from 'antd';
import { ReadOutlined, ReloadOutlined, RobotOutlined, SearchOutlined } from '@ant-design/icons';
import { useParams, useSearchParams } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import { get, getWithPagination, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import type { Answer } from '../../schema/project';
import type { SurveySchema } from '../../schema/types';
import type { FlatQuestion } from '../../schema/flatten';
import { flattenSchema } from '../../schema/flatten';
import { isDataQuestion } from './data/format';
import QuestionBlock, { Bar } from './report/QuestionBlock';
import AiPracticeRecommendDrawer from './ai/AiPracticeRecommendDrawer';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const classId = searchParams.get('classId') || undefined;
  const className = searchParams.get('className') || undefined;
  const [report, setReport] = useState<ReportData>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  /** AI 学情总结（计划 §6.3 ④）：只吃统计数字，不发送学员原始答卷 */
  const [authorities, setAuthorities] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  /** 已生成的总结正文；undefined = 还没生成过 */
  const [aiText, setAiText] = useState<string>();
  const [aiError, setAiError] = useState<string>();
  /** 点过按钮才渲染 AI 卡片，避免页面一打开就空占一块位置 */
  const [aiAsked, setAiAsked] = useState(false);
  /** 当前总结对应的「项目 + 班级」：切走后旧请求的回包不许再覆盖新页面 */
  const aiKeyRef = useRef('');
  /** 错题重练抽屉：除了点按钮，从 AI 侧栏带 ?ai=recommend 进来也要自动展开 */
  const [recommendOpen, setRecommendOpen] = useState(false);

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

  // 权限闸门：没有 ai:use 就不渲染「AI 学情总结」，避免「看得见、点了 403」
  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);
  const canUseAi = can(authorities, PERMISSION_CODES.aiUse);
  // 追加进卷子走 /api/ai/paper/apply，后端还要 project:update；没有就只让预览，别给点了 403 的按钮
  const canUpdateProject = can(authorities, PERMISSION_CODES.projectUpdate);

  // ?ai=recommend 进来就自动展开（AI 侧栏的「错题重练」快捷入口就是这个地址）
  // 要等权限拉回来再判：没有 ai:use 的人不该看到这个抽屉（后端 @PreAuthorize 也是它）
  useEffect(() => {
    if (canUseAi && searchParams.get('ai') === 'recommend') setRecommendOpen(true);
  }, [canUseAi, searchParams]);

  /**
   * 关闭抽屉：顺手把 ?ai= 抹掉。
   *
   * <p>用 replace 而不是 push —— 老师关掉之后按 F5 不该再弹一次；
   * 只删 ai 这一个键，classId / className 这些筛选条件要留着。
   */
  const closeRecommend = useCallback(() => {
    setRecommendOpen(false);
    if (searchParams.get('ai') === 'recommend') {
      const next = new URLSearchParams(searchParams);
      next.delete('ai');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // 换项目 / 换班级：上一份总结跟新数据没关系，顺手作废在途请求（见 aiKeyRef）
  useEffect(() => {
    aiKeyRef.current = '';
    setAiAsked(false);
    setAiText(undefined);
    setAiError(undefined);
    setAiLoading(false);
  }, [id, classId]);

  /**
   * 生成学情总结（同步，3~8 秒）。
   *
   * <p>请求体只带 projectId / classId，统计口径由后端自己取（计划 §6.3 ④，后端 `AiReportSummaryView`）：
   * 「只吃统计数字，不把学员原始答卷发给模型」——隐私与成本双赢。
   * 失败在卡片里给原因 + 重试入口，不弹 toast（重试按钮就在卡片右上角）。
   * 按项目约定这类调用应收敛到 `client/src/api/ai.ts`，那边归 AI 出卷/改题在改，先就地调。
   */
  const generateSummary = useCallback(async () => {
    const key = `${id}|${classId ?? ''}`;
    aiKeyRef.current = key;
    setAiAsked(true);
    setAiLoading(true);
    setAiError(undefined);
    try {
      const result = await post<{ text?: string }>('/api/ai/report/summary', {
        projectId: id,
        classId,
      });
      // 期间切到了别的项目/班级：这份回包作废，不能覆盖新页面的状态
      if (aiKeyRef.current !== key) return;
      setAiText((result?.text ?? '').trim());
    } catch (e) {
      if (aiKeyRef.current !== key) return;
      setAiText(undefined);
      setAiError((e as Error).message || '请求失败');
    } finally {
      if (aiKeyRef.current === key) setAiLoading(false);
    }
  }, [id, classId]);

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

  const overview = useMemo(() => {
    const started = answers.length;
    const submitted = answers.filter((answer) => answer.tempSave === 1).length;
    const anonymous = answers.filter((answer) => answer.isAnonymous).length;
    const durations = answers
      .map((answer) => {
        const info = answer.metaInfo as { answerInfo?: { startTime?: number; endTime?: number } } | undefined;
        const start = info?.answerInfo?.startTime;
        const end = info?.answerInfo?.endTime;
        return typeof start === 'number' && typeof end === 'number' && end > start ? end - start : undefined;
      })
      .filter((value): value is number => typeof value === 'number');
    const averageDuration = durations.length
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : undefined;
    return {
      started,
      submitted,
      anonymous,
      completion: started > 0 ? (submitted / started) * 100 : 0,
      averageDuration,
    };
  }, [answers]);

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
      {/* 工具条多了「AI 学情总结」一个按钮：窄屏时允许换行，不要横向溢出 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
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
        {canUseAi ? (
          <Button
            icon={<RobotOutlined />}
            loading={aiLoading}
            disabled={answers.length === 0}
            title={answers.length === 0 ? '还没有答卷，生成学情总结没有意义' : undefined}
            onClick={() => void generateSummary()}
          >
            AI 学情总结
          </Button>
        ) : null}
        {/* 错题重练：读完报表才能算薄弱考点，所以没答卷时不给点 */}
        {canUseAi ? (
          <Button
            icon={<ReadOutlined />}
            disabled={answers.length === 0}
            title={answers.length === 0 ? '还没有答卷，算不出哪些考点最弱' : undefined}
            onClick={() => setRecommendOpen(true)}
          >
            错题重练
          </Button>
        ) : null}
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
          <Card
            className="bp-corners bp-card"
            title={<span className="bp-title" style={{ fontSize: 12 }}>OVERVIEW / 答卷概览</span>}
          >
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 12 }}>
              <div><div style={{ color: 'var(--bp-text-soft)' }}>已开始</div><div style={{ fontSize: 22, fontWeight: 600 }}>{overview.started}</div></div>
              <div><div style={{ color: 'var(--bp-text-soft)' }}>已提交</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--bp-blue)' }}>{overview.submitted}</div></div>
              <div><div style={{ color: 'var(--bp-text-soft)' }}>完成率</div><div style={{ fontSize: 22, fontWeight: 600 }}>{overview.completion.toFixed(1)}%</div></div>
              <div><div style={{ color: 'var(--bp-text-soft)' }}>匿名答卷</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--bp-orange)' }}>{overview.anonymous}</div></div>
              <div><div style={{ color: 'var(--bp-text-soft)' }}>平均填写时长</div><div style={{ fontSize: 22, fontWeight: 600 }}>{overview.averageDuration == null ? '—' : `${Math.round(overview.averageDuration / 1000)} 秒`}</div></div>
            </div>
          </Card>

          {/* AI 学情总结（计划 §6.3 ④）：点按钮才生成，加载中 / 失败都有明确状态 */}
          {aiAsked && (
            <Card
              className="bp-corners bp-card"
              title={<span className="bp-title" style={{ fontSize: 12 }}>AI / 学情总结</span>}
              extra={
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={aiLoading}
                  onClick={() => void generateSummary()}
                >
                  重新生成
                </Button>
              }
            >
              {aiLoading ? (
                <div style={{ padding: '18px 0', textAlign: 'center' }}>
                  <Spin size="small" />
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--bp-text-soft)' }}>
                    AI 正在根据本页统计数据生成学情总结（约 3~8 秒）…
                  </div>
                </div>
              ) : aiError ? (
                <Alert
                  type="error"
                  showIcon
                  title="学情总结生成失败"
                  description={`${aiError}。可以点右上角「重新生成」再试一次。`}
                />
              ) : aiText ? (
                <div style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{aiText}</div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="这次没有拿到内容，点右上角「重新生成」再试一次"
                />
              )}
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--bp-text-soft)' }}>
                AI 生成，仅供参考 · 只读取本页统计数字，不发送学员答卷
              </div>
            </Card>
          )}

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

      {/*
        错题重练（计划 §6.3 ④）：入口放在页头，也可以从 AI 侧栏带 ?ai=recommend 直接展开。
        生成只是预览，勾了「同时追加到本卷」还要再点一次才会写进卷子。
      */}
      <AiPracticeRecommendDrawer
        open={recommendOpen}
        projectId={id}
        classId={classId}
        classLabel={className}
        canAppend={canUpdateProject}
        onClose={closeRecommend}
      />
    </div>
  );
}
