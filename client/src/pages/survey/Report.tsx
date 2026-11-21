import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, DatePicker, Drawer, Empty, Input, Select, Spin, Table, Tag, message } from 'antd';
import { ReadOutlined, ReloadOutlined, RobotOutlined, SearchOutlined } from '@ant-design/icons';
import { useParams, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
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

const { RangePicker } = DatePicker;







const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';


interface ClassNode {
  id: string;
  name?: string;

  accessible?: boolean;

  classKind?: 'group' | 'teaching';
  children?: ClassNode[];
}

interface ClassOption {
  value: string;

  label: string;

  name: string;
}

/** 班级下拉候选：只列「可访问的叶子班」 */
function flattenClassLeaves(nodes: ClassNode[], path: string[] = []): ClassOption[] {
  const options: ClassOption[] = [];
  for (const node of nodes) {
    const name = node.name || node.id;
    const children = flattenClassLeaves(node.children ?? [], [...path, name]);
    if (children.length > 0) {
      options.push(...children);
      continue;
    }
    if (node.accessible === false || node.classKind === 'group') continue;
    options.push({ value: node.id, label: path.length > 0 ? `${path.join(' / ')} / ${name}` : name, name });
  }
  return options;
}

/** URL 里的时间串 → Dayjs */
function parseTime(raw?: string | null): Dayjs | undefined {
  const text = raw?.trim();
  if (!text) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
  if (!match) {
    const fallback = dayjs(text);
    return fallback.isValid() ? fallback : undefined;
  }
  const [, year, month, day, hour, minute, second] = match;
  const parsed = dayjs(
    new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour ?? 0),
      Number(minute ?? 0),
      Number(second ?? 0),
    ),
  );
  return parsed.isValid() ? parsed : undefined;
}

/** 页头口径里的时间：秒位是 0 就省掉，免得标题被一长串 :00 撑开 */
function formatTimeText(value: string): string {
  return value.endsWith(':00') ? value.slice(0, 16) : value;
}

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

  /** 时间范围从 URL 解析（URL 是唯一真源）：刷新页面、把链接发给同事都保持同一口径 */
  const timeRange = useMemo<[Dayjs | null, Dayjs | null] | null>(() => {
    const start = parseTime(searchParams.get('startTime'));
    const end = parseTime(searchParams.get('endTime'));
    return start || end ? [start ?? null, end ?? null] : null;
  }, [searchParams]);
  const startTime = timeRange?.[0]?.format(TIME_FORMAT);
  const endTime = timeRange?.[1]?.format(TIME_FORMAT);
  const hasTimeFilter = Boolean(startTime || endTime);
  const hasFilter = Boolean(classId || hasTimeFilter);

  const [report, setReport] = useState<ReportData>();
  const [answers, setAnswers] = useState<Answer[]>([]);







  const [projectSurvey, setProjectSurvey] = useState<SurveySchema>();
  useEffect(() => {
    let alive = true;

    void get<{ survey?: SurveySchema }>('/api/project', { id })
      .then((project) => {
        if (alive) setProjectSurvey(project?.survey);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id]);
  const [loading, setLoading] = useState(true);




  const [loadedKey, setLoadedKey] = useState('');
  const reqSeq = useRef(0);






  const [listError, setListError] = useState<string>();
  const [search, setSearch] = useState('');


  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [classLoading, setClassLoading] = useState(false);
  const [classError, setClassError] = useState<string>();


  const [authorities, setAuthorities] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const [aiText, setAiText] = useState<string>();
  const [aiError, setAiError] = useState<string>();

  const [aiAsked, setAiAsked] = useState(false);

  const aiKeyRef = useRef('');

  const [recommendOpen, setRecommendOpen] = useState(false);

  const filterKey = `${id}|${classId ?? ''}|${startTime ?? ''}|${endTime ?? ''}`;

  const ready = loadedKey === filterKey;

  /** 答卷列表失败则常驻显示在内容区——不能把「接口挂了」说成「这个口径没有答卷」 */
  const load = useCallback(async () => {
    const seq = ++reqSeq.current;
    const key = `${id}|${classId ?? ''}|${startTime ?? ''}|${endTime ?? ''}`;
    setLoading(true);

    let reportFailure: string | undefined;

    let listFailure: string | undefined;
    const scope = { classId, startTime, endTime, includeAnonymous: true };
    try {
      const [nextReport, page] = await Promise.all([
        (classId ? get<ReportData>(`/api/report/class/${id}`, scope) : get<ReportData>(`/api/report/${id}`, scope)).catch(
          (e: Error) => {
            reportFailure = e.message || '读取报表失败';
            return undefined;
          },
        ),
        getWithPagination<Answer>('/api/answer/list', {
          projectId: id,
          classId,
          startTime,
          endTime,
          includeAnonymous: true,
          current: 1,
          pageSize: -1,
        }).catch((e: Error) => {
          listFailure = e.message || '读取答卷列表失败';
          return { current: 1, pageSize: 0, total: 0, data: [] as Answer[] };
        }),
      ]);
      if (seq !== reqSeq.current) return;
      setReport(nextReport);
      setAnswers(page.data);

      setListError(listFailure);
      setLoadedKey(key);

      if (reportFailure) message.error(reportFailure);
    } catch (e) {
      if (seq !== reqSeq.current) return;

      setLoadedKey(key);
      message.error((e as Error).message);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [id, classId, startTime, endTime]);

  useEffect(() => {
    void load();
  }, [load]);


  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);
  const canUseAi = can(authorities, PERMISSION_CODES.aiUse);

  const canUpdateProject = can(authorities, PERMISSION_CODES.projectUpdate);

  const canListClasses = can(authorities, PERMISSION_CODES.classList);







  useEffect(() => {
    if (!canListClasses) return;
    let alive = true;
    setClassLoading(true);
    setClassError(undefined);
    get<ClassNode[]>('/api/teaching/classes/tree')
      .then((list) => {
        if (alive) setClassOptions(flattenClassLeaves(Array.isArray(list) ? list : []));
      })
      .catch((e) => {
        if (!alive) return;
        setClassOptions([]);
        setClassError((e as Error).message || '读取班级列表失败');
      })
      .finally(() => {
        if (alive) setClassLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [canListClasses]);

  /** 下拉选项：链接里带的班级若不在树里（班级被删 / 只读授权 / 树没拉回来），补一条占位项 */
  const classSelectOptions = useMemo<ClassOption[]>(() => {
    if (!classId || classOptions.some((option) => option.value === classId)) return classOptions;
    const label = className || classId;
    return [{ value: classId, label, name: label }, ...classOptions];
  }, [classOptions, classId, className]);

  /** 只改筛选相关的四个键，其余参数（例如 AI 侧栏带进来的 ?ai=recommend）原样保留 */
  const applyQuery = useCallback(
    (changes: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  /** 选班级：classId 与 className 一起写、一起删 */
  const pickClass = useCallback(
    (nextClassId?: string) => {
      const option = classSelectOptions.find((item) => item.value === nextClassId);
      applyQuery({
        classId: nextClassId,
        className: nextClassId ? (option?.name ?? className ?? nextClassId) : undefined,
      });
    },
    [applyQuery, classSelectOptions, className],
  );

  /** 选时间：两端可能只填一侧（allowEmpty），因此各自独立写入 / 清除 */
  const pickRange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      const [start, end] = dates ?? [];
      applyQuery({
        startTime: start ? start.format(TIME_FORMAT) : undefined,
        endTime: end ? end.format(TIME_FORMAT) : undefined,
      });
    },
    [applyQuery],
  );

  /** 清除筛选：只清这四个键，不动地址栏上的其它参数 */
  const resetFilters = useCallback(() => {
    applyQuery({ classId: undefined, className: undefined, startTime: undefined, endTime: undefined });
  }, [applyQuery]);



  useEffect(() => {
    if (canUseAi && searchParams.get('ai') === 'recommend') setRecommendOpen(true);
  }, [canUseAi, searchParams]);

  /** 关闭抽屉：顺手把 ?ai= 抹掉 */
  const closeRecommend = useCallback(() => {
    setRecommendOpen(false);
    if (searchParams.get('ai') === 'recommend') {
      const next = new URLSearchParams(searchParams);
      next.delete('ai');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  useEffect(() => {
    aiKeyRef.current = '';
    setAiAsked(false);
    setAiText(undefined);
    setAiError(undefined);
    setAiLoading(false);
  }, [id, classId]);

  /** 生成学情总结（同步，3~8 秒） */
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


  const survey = projectSurvey ?? (answers[0]?.survey as SurveySchema | undefined);
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

  /** 逐题指标：全部题一行一条，供「表格 + 抽屉」展示 */
  const itemRows = useMemo(() => {
    const scoredAnswers = answers.filter((a) => typeof a.examScore === 'number');
    const ranked = [...scoredAnswers].sort((a, b) => (b.examScore as number) - (a.examScore as number));
    const groupSize = Math.max(1, Math.round(ranked.length * 0.27));
    const highGroup = ranked.slice(0, groupSize);
    const lowGroup = ranked.slice(Math.max(0, ranked.length - groupSize));
    const rateOf = (group: typeof answers, questionId: string, max: number) => {
      let n = 0;
      let c = 0;
      for (const a of group) {
        const info = a.examInfo as { questionScore?: Record<string, number> } | undefined;
        const got = info?.questionScore?.[questionId];
        if (typeof got !== 'number' || max <= 0) continue;
        n += 1;
        if (got >= max - 0.0001) c += 1;
      }
      return n > 0 ? c / n : null;
    };

    return blocks.map((q) => {
      const max = Number((q.schema as { attribute?: { examScore?: number } }).attribute?.examScore ?? 0);
      let answered = 0;
      let scoredCount = 0;
      let correct = 0;
      let sum = 0;
      for (const answer of answers) {
        const value = (answer.answer ?? {})[q.id];
        const empty =
          value === undefined ||
          value === null ||
          value === '' ||
          (typeof value === 'object' && Object.keys(value as Record<string, unknown>).length === 0);
        if (empty) continue;
        answered += 1;
        const info = answer.examInfo as { questionScore?: Record<string, number> } | undefined;
        const got = info?.questionScore?.[q.id];
        if (typeof got !== 'number' || max <= 0) continue;
        scoredCount += 1;
        sum += got;
        if (got >= max - 0.0001) correct += 1;
      }
      const high = rateOf(highGroup, q.id, max);
      const low = rateOf(lowGroup, q.id, max);
      return {
        id: q.id,
        number: q.number ?? q.index + 1,
        title: q.title || q.type,
        max,
        total: answers.length,
        answered,
        scored: scoredCount,
        wrong: scoredCount - correct,
        blank: answers.length - answered,
        rate: scoredCount > 0 ? (correct / scoredCount) * 100 : null,
        avg: scoredCount > 0 ? sum / scoredCount : null,
        discrimination: high !== null && low !== null ? high - low : null,
      };
    });
  }, [blocks, answers]);

  /** 错题排行：正确率最低 10 题（从 itemRows 里取，口径完全一致） */
  const weakQuestions = useMemo(
    () =>
      [...itemRows]
        .filter((row) => row.scored > 0)
        .sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100))
        .slice(0, 10),
    [itemRows],
  );


  const [detailQid, setDetailQid] = useState<string>();

  /** 分值统计：绝对分数段（按满分自动选桶宽）+ 均分/中位数/标准差/极值/及格率/优秀率 */
  const scoreStats = useMemo(() => {
    const totalScore = questions.reduce(
      (sum, q) => sum + Number((q.schema as { attribute?: { examScore?: number } }).attribute?.examScore ?? 0),
      0,
    );
    const scores = answers.map((a) => a.examScore).filter((v): v is number => typeof v === 'number');
    if (totalScore <= 0 || scores.length === 0) return undefined;

    const sorted = [...scores].sort((a, b) => a - b);
    const sum = scores.reduce((s, v) => s + v, 0);
    const mean = sum / scores.length;
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
    const median =
      sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const passLine = totalScore * 0.6;
    const excellentLine = totalScore * 0.85;

    const bucketSize = totalScore <= 20 ? 5 : totalScore <= 60 ? 10 : 20;
    const bucketCount = Math.max(1, Math.ceil(totalScore / bucketSize));
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const min = i * bucketSize;
      const max = Math.min(totalScore, (i + 1) * bucketSize);
      return { label: `${min}-${Math.round(max)}`, min, max, count: 0 };
    });
    for (const value of scores) {
      const index = Math.min(bucketCount - 1, Math.max(0, Math.floor(value / bucketSize)));
      buckets[index].count += 1;
    }

    return {
      totalScore,
      scored: scores.length,
      mean,
      median,
      std: Math.sqrt(variance),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      pass: scores.filter((v) => v >= passLine).length,
      excellent: scores.filter((v) => v >= excellentLine).length,
      passLine,
      excellentLine,
      buckets,
    };
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


  const totalAnswers = report?.total ?? answers.length;
  const timeText =
    startTime && endTime
      ? `${formatTimeText(startTime)} ~ ${formatTimeText(endTime)}`
      : startTime
        ? `${formatTimeText(startTime)} 起`
        : endTime
          ? `截至 ${formatTimeText(endTime)}`
          : '全部时间';
  const scopeText = [classId ? `班级：${className || classId}` : '全部班级', `时间：${timeText}`].join(' · ');

  return (
    <div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <BackButton label="返回" fallback={'/survey/' + id} style={{ paddingLeft: 0 }} />
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>REPORT / 分析</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            {scopeText} · 共 {totalAnswers} 份答卷 · {blocks.length} 题
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
            title={answers.length === 0 ? '当前筛选下没有答卷，生成学情总结没有意义' : undefined}
            onClick={() => void generateSummary()}
          >
            AI 学情总结
          </Button>
        ) : null}

        {canUseAi ? (
          <Button
            icon={<ReadOutlined />}
            disabled={answers.length === 0}
            title={answers.length === 0 ? '当前筛选下没有答卷，算不出哪些考点最弱' : undefined}
            onClick={() => setRecommendOpen(true)}
          >
            错题重练
          </Button>
        ) : null}
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </div>





      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: '1px dashed var(--bp-line)',
        }}
      >
        <span className="bp-title" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
          FILTER / 筛选
        </span>

        {canListClasses ? (
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="全部班级"
            value={classId}
            loading={classLoading}
            style={{ width: 240 }}
            options={classSelectOptions}
            notFoundContent={classLoading ? '加载中…' : '没有可筛选的班级'}
            onChange={(value?: string) => pickClass(value)}
          />
        ) : null}
        <RangePicker
          showTime
          allowEmpty={[true, true]}
          format={TIME_FORMAT}
          placeholder={['开始时间', '结束时间']}
          value={timeRange}
          style={{ width: 360 }}
          onChange={(dates) => pickRange(dates)}
        />
        {hasFilter ? (
          <Button type="text" size="small" onClick={resetFilters}>
            清除筛选
          </Button>
        ) : null}
        <div style={{ flex: 1 }} />
        {classError ? (
          <span style={{ fontSize: 11, color: 'var(--bp-orange)' }}>班级列表读取失败：{classError}</span>
        ) : hasFilter ? (
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>筛选条件已写进地址栏，可复制分享</span>
        ) : null}
      </div>

      {!ready ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : (
        <Spin spinning={loading} style={{ display: 'block' }}>
          {answers.length === 0 ? (
            listError ? (
              <Card className="bp-corners bp-card">

                <Alert
                  type="error"
                  showIcon
                  title="读取答卷列表失败"
                  description={`${listError}。点右上角「刷新」或「清除筛选」再试一次。`}
                />
              </Card>
            ) : (
              <Card className="bp-corners bp-card">

                <Empty description={hasFilter ? '当前筛选下没有答卷' : '还没有答卷，发布后收集到数据再看'} />
                {hasFilter ? (
                  <div style={{ textAlign: 'center' }}>
                    <Button size="small" onClick={resetFilters}>
                      清除筛选
                    </Button>
                  </div>
                ) : null}
              </Card>
            )
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
                    {hasTimeFilter ? ' · 总结按整班统计，不受时间筛选影响' : ''}
                  </div>
                </Card>
              )}


              <style>{`
                .bp-card { margin-bottom: 10px !important; }
                .ant-card-body { padding: 10px 12px !important; }
              `}</style>


              {daily.entries.length > 0 && (
                <Card
                  className="bp-corners bp-card"
                  title={<span className="bp-title" style={{ fontSize: 12 }}>DAILY / 每日答卷</span>}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {daily.entries.map(([day, count]) => (
                      <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, lineHeight: 1.5 }}>
                        <span style={{ width: 90, color: 'var(--bp-text-soft)' }}>{day}</span>
                        <Bar value={count} max={daily.max} />
                        <span style={{ width: 40, textAlign: 'right' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {scoreStats && (
                <Card
                  className="bp-corners bp-card"
                  title={<span className="bp-title" style={{ fontSize: 12 }}>SCORE / 分值分析</span>}
                >

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    {[
                      { label: '已判分', value: `${scoreStats.scored} 份` },
                      { label: '卷面满分', value: String(scoreStats.totalScore) },
                      { label: '平均分', value: scoreStats.mean.toFixed(1) },
                      { label: '中位数', value: scoreStats.median.toFixed(1) },
                      { label: '标准差', value: scoreStats.std.toFixed(1) },
                      { label: '最高分', value: String(scoreStats.max) },
                      { label: '最低分', value: String(scoreStats.min) },
                      {
                        label: `及格率 ≥${scoreStats.passLine.toFixed(0)}`,
                        value: `${((scoreStats.pass / scoreStats.scored) * 100).toFixed(1)}%`,
                      },
                      {
                        label: `优秀率 ≥${scoreStats.excellentLine.toFixed(0)}`,
                        value: `${((scoreStats.excellent / scoreStats.scored) * 100).toFixed(1)}%`,
                      },
                    ].map((item) => (
                      <div key={item.label} style={{ border: '1px solid var(--bp-line-soft)', padding: '5px 8px' }}>
                        <div style={{ fontSize: 10, color: 'var(--bp-text-soft)', whiteSpace: 'nowrap' }}>{item.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {scoreStats.buckets.map((bucket) => (
                      <div key={bucket.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                        <span style={{ width: 70, color: 'var(--bp-text-soft)' }}>{bucket.label}</span>
                        <Bar value={bucket.count} max={Math.max(1, ...scoreStats.buckets.map((b) => b.count))} />
                        <span style={{ width: 96, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {bucket.count} 人 · {((bucket.count / scoreStats.scored) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {weakQuestions.length > 0 && (
                <Card
                  className="bp-corners bp-card"
                  title={<span className="bp-title" style={{ fontSize: 12 }}>WEAK / 错题排行（正确率最低 10 题）</span>}
                >
                  <Table<any>
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={weakQuestions}

                    scroll={{ x: 620 }}
                    columns={[
                      { title: '#', dataIndex: 'number', width: 54, align: 'right' },
                      {
                        title: '题目',
                        dataIndex: 'title',
                        ellipsis: true,
                        render: (title: string, row: { max: number }) => (
                          <span title={title}>
                            {title}
                            {row.max > 0 ? (
                              <span style={{ color: 'var(--bp-text-soft)', fontSize: 11 }}>　满分 {row.max}</span>
                            ) : null}
                          </span>
                        ),
                      },
                      { title: '答题', dataIndex: 'answered', width: 68, align: 'right' },
                      { title: '答错', dataIndex: 'wrong', width: 68, align: 'right' },
                      {
                        title: '正确率',
                        dataIndex: 'rate',
                        width: 88,
                        align: 'right',
                        sorter: (a: { rate: number | null }, b: { rate: number | null }) =>
                          (a.rate ?? 0) - (b.rate ?? 0),
                        render: (rate: number | null) =>
                          rate === null ? '—' : (
                            <span style={{ color: rate < 60 ? 'var(--bp-orange)' : undefined }}>{rate.toFixed(1)}%</span>
                          ),
                      },
                      {
                        title: '均分',
                        dataIndex: 'avg',
                        width: 74,
                        align: 'right',
                        render: (avg: number | null) => (avg === null ? '—' : avg.toFixed(1)),
                      },
                      {
                        title: '难度',
                        key: 'level',
                        width: 76,
                        render: (_: unknown, row: { rate: number | null }) =>
                          row.rate === null ? (
                            <Tag>—</Tag>
                          ) : row.rate < 60 ? (
                            <Tag color="red">偏难</Tag>
                          ) : row.rate < 85 ? (
                            <Tag color="orange">一般</Tag>
                          ) : (
                            <Tag color="green">简单</Tag>
                          ),
                      },
                    ]}
                  />
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


              {itemRows.length > 0 && (
                <Card
                  className="bp-corners bp-card"
                  title={<span className="bp-title" style={{ fontSize: 12 }}>ITEM / 逐题分析</span>}
                  extra={<span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>点任意行看选项分布</span>}
                >
                  <Table<any>
                    rowKey="id"
                    size="small"
                    bordered
                    pagination={{ pageSize: 20, size: 'small', showSizeChanger: false }}
                    dataSource={itemRows}

                    scroll={{ x: 820 }}
                    onRow={(row: { id: string }) => ({ onClick: () => setDetailQid(row.id), style: { cursor: 'pointer' } })}
                    columns={[
                      { title: '#', dataIndex: 'number', width: 52, align: 'right' },
                      { title: '题目', dataIndex: 'title', ellipsis: true },
                      { title: '答题', dataIndex: 'answered', width: 62, align: 'right' },
                      {
                        title: '答对',
                        key: 'correct',
                        width: 62,
                        align: 'right',
                        render: (_: unknown, row: { scored: number; wrong: number }) => row.scored - row.wrong,
                      },
                      {
                        title: '正确率',
                        dataIndex: 'rate',
                        width: 82,
                        align: 'right',
                        sorter: (a: { rate: number | null }, b: { rate: number | null }) => (a.rate ?? 0) - (b.rate ?? 0),
                        render: (value: number | null) =>
                          value === null ? '—' : <span style={{ color: value < 60 ? 'var(--bp-orange)' : undefined }}>{value.toFixed(1)}%</span>,
                      },
                      {
                        title: '均分',
                        dataIndex: 'avg',
                        width: 66,
                        align: 'right',
                        render: (value: number | null) => (value === null ? '—' : value.toFixed(1)),
                      },
                      {
                        title: '未答',
                        dataIndex: 'blank',
                        width: 62,
                        align: 'right',
                        render: (value: number) => (value > 0 ? <Tag color="orange">{value}</Tag> : 0),
                      },
                      {
                        title: '难度',
                        key: 'level',
                        width: 70,
                        render: (_: unknown, row: { rate: number | null }) =>
                          row.rate === null ? (
                            <Tag>—</Tag>
                          ) : row.rate >= 80 ? (
                            <Tag color="green">易</Tag>
                          ) : row.rate >= 40 ? (
                            <Tag color="orange">中</Tag>
                          ) : (
                            <Tag color="red">难</Tag>
                          ),
                      },
                      {
                        title: '区分度',
                        dataIndex: 'discrimination',
                        width: 76,
                        align: 'right',
                        sorter: (a: { discrimination: number | null }, b: { discrimination: number | null }) =>
                          (a.discrimination ?? -1) - (b.discrimination ?? -1),
                        render: (value: number | null) =>
                          value === null ? '—' : (
                            <span style={{ color: value < 0.2 ? 'var(--bp-orange)' : undefined }}>{value.toFixed(2)}</span>
                          ),
                      },
                    ]}
                  />
                </Card>
              )}

              {blocks.length === 0 && (
                <Card className="bp-corners bp-card">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`没有题干包含「${search.trim()}」的题目`} />
                </Card>
              )}


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
        </Spin>
      )}





      <Drawer
        open={Boolean(detailQid)}
        onClose={() => setDetailQid(undefined)}
        size="min(880px, 96vw)"
        title={
          detailQid
            ? (() => {
                const q = blocks.find((item) => item.id === detailQid);
                return q ? `第 ${q.number ?? q.index + 1} 题 · ${q.title || q.type}` : '题目明细';
              })()
            : '题目明细'
        }
      >
        {detailQid && blocks.some((item) => item.id === detailQid) ? (
          <QuestionBlock q={blocks.find((item) => item.id === detailQid)!} answers={answers} bare defaultOpen />
        ) : null}
      </Drawer>

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
