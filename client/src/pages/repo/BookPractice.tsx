import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, message, Modal, Segmented, Slider, Spin, Tag } from 'antd';
import { ArrowLeftOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { get, getWithPagination, post } from '../../api';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import type { AnswerValue } from '../../renderer/types';
import { blankId, blankText, toOptions } from '../../renderer/questions/answers';
import { isEmptyAnswer } from '../../schema/empty';
import { flattenSchema, type FlatQuestion } from '../../schema/flatten';
import { DATA_TYPES, type SurveySchema } from '../../schema/types';
import {
  BOOK_STATUS_MASTERED,
  BOOK_TYPE_FAVORITE,
  bookFilterFromParams,
  bookListParams,
  bookNeedsClientFilter,
  bookRowMatches,
  loadProjectOptions,
  type BookFilter,
  type UserBookView,
} from './Book';

const FONT_KEY = 'sk-font-scale';
/** 单次最多取多少题：每题都要单独取一次完整 schema，太多会拖慢首屏 */
const MAX_QUESTIONS = 100;
/** 取 schema 的并发数，兼顾首屏速度和后端压力 */
const CONCURRENCY = 6;

type Layout = 'single' | 'scroll';
type Verdict = 'correct' | 'wrong' | 'unknown';
type RowVerdict = Verdict | 'unanswered';

const CHOICE_TYPES = new Set<SurveySchema['type']>(['Radio', 'Checkbox', 'Select', 'Judge']);

const VERDICT_LABEL: Record<RowVerdict, string> = {
  correct: '答对',
  wrong: '答错',
  unknown: '未判定',
  unanswered: '未作答',
};

const VERDICT_COLOR: Record<RowVerdict, string | undefined> = {
  correct: 'blue',
  wrong: 'orange',
  unknown: undefined,
  unanswered: undefined,
};

/** 聚合一道错题记录下多道题的判定时用：越靠后越「严重」 */
const VERDICT_RANK: Record<RowVerdict, number> = { unanswered: 0, unknown: 1, correct: 2, wrong: 3 };

/* ---------------------------------------------------------------- 判分 */

/** 题目树里所有会存答案的节点 id（错题本一条记录通常只有 1 道题） */
function questionIdsOf(schema: SurveySchema): string[] {
  if (DATA_TYPES.has(schema.type)) return [schema.id];
  return (schema.children ?? []).flatMap(questionIdsOf);
}

function pickedOptionIds(value: AnswerValue): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>);
}

/**
 * 题库里大量题目是从 Excel 导入的：选项只存在 children 里，dataSource 是空的，
 * 而且这些 Option 子节点没有 type（后端 RepoTemplateExcelParseHelper 造节点时没写 type）。
 * 渲染层（Radio/Checkbox/Judge/Select）只认 dataSource，所以这里按 children 补一份，
 * 否则错题练习会显示「未配置选项」——题目根本没法作答。
 */
function normalizeChoiceSchema(schema: SurveySchema): SurveySchema {
  if (!CHOICE_TYPES.has(schema.type)) return schema;
  if (schema.dataSource?.length) return schema;
  // 选择类题目的 children 就是选项，type 缺省也按 Option 处理
  const options = (schema.children ?? []).filter((child) => !child.type || child.type === 'Option');
  if (!options.length) return schema;
  return { ...schema, dataSource: options.map((child) => ({ label: child.title, value: child.id })) };
}

/**
 * 选择题的正确答案记在选项节点上（children[].attribute.examCorrectAnswer），
 * 与后端 AnswerScoreEvaluator / 题库编辑页同一套约定。
 */
function correctOptionIds(schema: SurveySchema): string[] {
  return (schema.children ?? [])
    .filter((child) => {
      const answer = child.attribute?.examCorrectAnswer;
      return typeof answer === 'string' && answer.trim() !== '';
    })
    .map((child) => child.id);
}

function fillText(schema: SurveySchema, value: AnswerValue): string {
  return blankText(value, blankId(schema)).trim();
}

/** 与后端 AnswerScoreEvaluator 对齐：多答案换行分隔；contain 时包含即算对 */
function textMatches(schema: SurveySchema, expected: string, actual: string): boolean {
  if (!actual) return false;
  const candidates = expected
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!candidates.length) return false;
  if (schema.attribute?.examMatchRule === 'contain') return candidates.some((item) => item.includes(actual));
  // 后端未配置 examMatchRule 时会判 0 分；这里按「完全一致」处理，练习时更符合直觉
  return candidates.some((item) => item === actual);
}

/**
 * 单题判分。返回 unknown 表示题库没给标准答案（错题本接口会把 examCorrectAnswer 过滤掉），
 * 结果页会提示用户自评，绝不臆造对错。
 */
function gradeAnswer(schema: SurveySchema, value: AnswerValue): Verdict {
  if (CHOICE_TYPES.has(schema.type)) {
    const correct = correctOptionIds(schema);
    if (!correct.length) return 'unknown';
    const picked = pickedOptionIds(value);
    if (!picked.length) return 'wrong';
    if (picked.length !== correct.length) return 'wrong';
    const expected = new Set(correct);
    return picked.every((id) => expected.has(id)) ? 'correct' : 'wrong';
  }

  if (schema.type === 'FillBlank' || schema.type === 'Textarea') {
    const expected = (
      schema.attribute?.examCorrectAnswer ??
      schema.children?.[0]?.attribute?.examCorrectAnswer ??
      ''
    ).trim();
    if (!expected) return 'unknown';
    return textMatches(schema, expected, fillText(schema, value)) ? 'correct' : 'wrong';
  }

  if (schema.type === 'MultipleBlank') {
    // 每个空位各自配了答案才判分，缺一个就整题返回未知
    const blanks = schema.children ?? [];
    const expectedByBlank = blanks.map((child) => (child.attribute?.examCorrectAnswer ?? '').trim());
    if (!blanks.length || expectedByBlank.some((item) => !item)) return 'unknown';
    const answers =
      value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const allCorrect = blanks.every((child, i) => {
      const raw = answers[child.id];
      return typeof raw === 'string' && textMatches(schema, expectedByBlank[i], raw.trim());
    });
    return allCorrect ? 'correct' : 'wrong';
  }

  // 矩阵 / 评分 / NPS 等不在这里判分，交给用户自评
  return 'unknown';
}

/** 结果页展示「你的答案」 */
function answerSummary(schema: SurveySchema, value: AnswerValue): string {
  if (isEmptyAnswer(value, true)) return '未作答';
  if (CHOICE_TYPES.has(schema.type)) {
    const options = toOptions(schema.dataSource);
    const labels = pickedOptionIds(value).map((id) => options.find((option) => option.value === id)?.label ?? id);
    return labels.length ? labels.join('、') : '未作答';
  }
  if (schema.type === 'FillBlank' || schema.type === 'Textarea') return fillText(schema, value) || '未作答';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '已作答';
}

/* ---------------------------------------------------------------- 进度暂存 */

interface SavedProgress {
  values: Record<string, AnswerValue>;
  index: number;
  layout: Layout;
}

const progressKey = (key: string) => `book-practice:${key}`;

function readProgress(key: string): SavedProgress | undefined {
  try {
    const raw = localStorage.getItem(progressKey(key));
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as Partial<SavedProgress>;
    if (!saved || typeof saved !== 'object' || !saved.values) return undefined;
    return {
      values: saved.values,
      index: Number(saved.index) || 0,
      layout: saved.layout === 'scroll' ? 'scroll' : 'single',
    };
  } catch {
    return undefined;
  }
}

function clearProgress(key: string) {
  try {
    localStorage.removeItem(progressKey(key));
  } catch {
    // localStorage 被禁用时忽略
  }
}

/** 顶部筛选摘要：让学员清楚这次练的是哪一批题 */
function filterChips(filter: BookFilter): string[] {
  const chips: string[] = [];
  if (filter.type != null) chips.push(filter.type === BOOK_TYPE_FAVORITE ? '仅收藏' : '仅错题');
  if (filter.wrongTimesMin != null) chips.push(`累计错 ≥ ${filter.wrongTimesMin} 次`);
  if (filter.status != null) chips.push('只看重点');
  if (filter.startDate || filter.endDate) {
    // endDate 传给后端时加了 1 天，展示时减回来
    const end = filter.endDate ? dayjs(filter.endDate).subtract(1, 'day').format('YYYY-MM-DD') : '不限';
    chips.push(`${filter.startDate || '不限'} ~ ${end}`);
  }
  if (filter.name) chips.push(`题目含「${filter.name}」`);
  if (filter.note) chips.push(`笔记含「${filter.note}」`);
  return chips;
}

/**
 * 错题本练习页：按列表页带过来的筛选条件取题，逐题取完整 schema 交给 SchemaRenderer。
 * 这是学员自测，不写后端练习记录，也不改题目任何内容。
 */
export default function BookPractice() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const searchKey = search.toString();
  const filter = useMemo(() => bookFilterFromParams(new URLSearchParams(searchKey)), [searchKey]);
  /** scope=project 表示「只练本场考试的错题」，只在标题/标签上做区分，取数逻辑完全一致 */
  const scope = search.get('scope') || 'filter';
  const projectNameParam = search.get('projectName') || '';
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});

  // 练习页可能被外部链接直接打开（只带 projectId），名字没带就查一次列表补上
  useEffect(() => {
    if (!filter.projectId || projectNameParam) return;
    let alive = true;
    void loadProjectOptions().then((list) => {
      if (!alive) return;
      const map: Record<string, string> = {};
      for (const project of list) map[project.id] = project.name;
      setProjectNames(map);
    });
    return () => {
      alive = false;
    };
  }, [filter.projectId, projectNameParam]);

  const projectLabel = (id?: string) => {
    if (!id) return '';
    if (projectNames[id]) return projectNames[id];
    if (projectNameParam) return projectNameParam;
    return `考试 ${id.slice(0, 6)}`;
  };

  const [items, setItems] = useState<Array<{ row: UserBookView; schema: SurveySchema }>>([]);
  const [skipped, setSkipped] = useState(0);
  const [truncated, setTruncated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string>();

  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<Layout>('single');
  const [phase, setPhase] = useState<'answer' | 'result'>('answer');
  const [mastered, setMastered] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem(FONT_KEY)) || 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    setItems([]);
    setSkipped(0);
    setTruncated(0);
    setValues({});
    setIndex(0);
    setLayout('single');
    setPhase('answer');
    setMastered(new Set());
    setProgressText('');

    const load = async () => {
      try {
        const res = await getWithPagination<UserBookView>('/api/repo/book/list', {
          current: 1,
          pageSize: -1,
          ...bookListParams(filter),
        });
        let rows = bookNeedsClientFilter(filter) ? res.data.filter((row) => bookRowMatches(row, filter)) : res.data;

        const idParam = new URLSearchParams(searchKey).get('ids');
        if (idParam) {
          const wanted = new Set(idParam.split(',').filter(Boolean));
          rows = rows.filter((row) => wanted.has(row.id));
        }

        // 同一道题可能同时有「错题」和「收藏」两条记录，练习时按 templateId 去重
        const seen = new Set<string>();
        rows = rows.filter((row) => {
          const key = row.templateId || row.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (rows.length > MAX_QUESTIONS) {
          if (!cancelled) setTruncated(rows.length - MAX_QUESTIONS);
          rows = rows.slice(0, MAX_QUESTIONS);
        }

        if (!rows.length) {
          if (!cancelled) setLoading(false);
          return;
        }
        if (!cancelled) setProgressText(`0 / ${rows.length}`);

        const collected: Array<{ row: UserBookView; schema: SurveySchema }> = [];
        let skipCount = 0;
        let cursor = 0;
        let done = 0;
        const worker = async () => {
          while (!cancelled) {
            const i = cursor;
            cursor += 1;
            if (i >= rows.length) return;
            try {
              // withAnswer=1：练习结果页要判分，必须拿到标准答案。
              // 后端只对「本人错题本里的题」放行，不会因此泄漏整个题库。
              const raw = await get<SurveySchema>('/api/repo/book/question', {
                id: rows[i].id,
                withAnswer: 1,
              });
              const schema = raw ? normalizeChoiceSchema(raw) : undefined;
              if (schema && questionIdsOf(schema).length) collected.push({ row: rows[i], schema });
              else skipCount += 1;
            } catch {
              // 单题失败不影响整轮，最后统一提示跳过数
              skipCount += 1;
            }
            done += 1;
            if (!cancelled) setProgressText(`${done} / ${rows.length}`);
          }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, () => worker()));
        if (cancelled) return;

        // 并行返回顺序不定，按列表原顺序还原
        const order = new Map(rows.map((row, i) => [row.id, i]));
        collected.sort((a, b) => (order.get(a.row.id) ?? 0) - (order.get(b.row.id) ?? 0));

        setItems(collected);
        setSkipped(skipCount);
        setMastered(
          new Set(
            collected.filter((item) => (item.row.status ?? 0) === BOOK_STATUS_MASTERED).map((item) => item.row.id),
          ),
        );

        const saved = readProgress(searchKey);
        if (saved) {
          const known = new Set(collected.flatMap((item) => questionIdsOf(item.schema)));
          const restored: Record<string, AnswerValue> = {};
          for (const [qid, value] of Object.entries(saved.values)) {
            if (known.has(qid)) restored[qid] = value;
          }
          setValues(restored);
          setLayout(saved.layout);
          setIndex(Math.max(0, saved.index));
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || '加载错题失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [searchKey, filter]);

  const root = useMemo<SurveySchema | undefined>(() => {
    if (!items.length) return undefined;
    return {
      id: 'book-practice',
      title: '错题练习',
      type: 'Survey',
      attribute: {},
      children: items.map((item) => item.schema),
    };
  }, [items]);

  const flat = useMemo(() => (root ? flattenSchema(root) : []), [root]);

  // 题目 id → 错题本记录 id：结果页要按记录做「标记已掌握」
  const rowIdByQuestion = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      for (const qid of questionIdsOf(item.schema)) map.set(qid, item.row.id);
    }
    return map;
  }, [items]);

  const questionsByRow = useMemo(() => {
    const map = new Map<string, FlatQuestion[]>();
    for (const q of flat) {
      const rowId = rowIdByQuestion.get(q.id);
      if (!rowId) continue;
      const list = map.get(rowId) ?? [];
      list.push(q);
      map.set(rowId, list);
    }
    return map;
  }, [flat, rowIdByQuestion]);

  const answeredCount = useMemo(
    () => flat.filter((q) => !isEmptyAnswer(values[q.id], true)).length,
    [flat, values],
  );

  const rowVerdicts = useMemo(() => {
    const acc = new Map<string, RowVerdict>();
    for (const q of flat) {
      const rowId = rowIdByQuestion.get(q.id);
      if (!rowId) continue;
      const answered = !isEmptyAnswer(values[q.id], true);
      const verdict: RowVerdict = answered ? gradeAnswer(q.schema, values[q.id]) : 'unanswered';
      const prev = acc.get(rowId);
      if (prev === undefined || VERDICT_RANK[verdict] > VERDICT_RANK[prev]) acc.set(rowId, verdict);
    }
    return acc;
  }, [flat, values, rowIdByQuestion]);

  const stats = useMemo(() => {
    const counts = { total: items.length, answered: 0, correct: 0, wrong: 0, unknown: 0, unanswered: 0 };
    for (const item of items) {
      const verdict = rowVerdicts.get(item.row.id) ?? 'unanswered';
      if (verdict === 'unanswered') counts.unanswered += 1;
      else {
        counts.answered += 1;
        if (verdict === 'correct') counts.correct += 1;
        else if (verdict === 'wrong') counts.wrong += 1;
        else counts.unknown += 1;
      }
    }
    return counts;
  }, [items, rowVerdicts]);

  // 作答进度写回 localStorage；结束练习后清掉，下次进来是新的
  useEffect(() => {
    if (loading || phase !== 'answer' || !items.length) return;
    try {
      localStorage.setItem(progressKey(searchKey), JSON.stringify({ values, index, layout }));
    } catch {
      // localStorage 满/被禁用不影响答题
    }
  }, [loading, phase, items.length, values, index, layout, searchKey]);

  const setFont = (value: number) => {
    setFontScale(value);
    try {
      localStorage.setItem(FONT_KEY, String(value));
    } catch {
      // 忽略存储异常
    }
  };

  const qIndex = Math.min(index, Math.max(flat.length - 1, 0));
  const pageSchema = flat[qIndex] ? { ...(root as SurveySchema), children: [flat[qIndex].schema] } : undefined;

  const finish = () => {
    const go = () => {
      setPhase('result');
      clearProgress(searchKey);
    };
    const unanswered = flat.length - answeredCount;
    if (unanswered > 0) {
      Modal.confirm({
        title: `还有 ${unanswered} 道题没作答`,
        content: '现在结束练习并查看结果吗？未作答的题会计入结果。',
        okText: '结束练习',
        cancelText: '继续作答',
        onOk: go,
      });
      return;
    }
    go();
  };

  const restart = () => {
    setValues({});
    setIndex(0);
    setPhase('answer');
    clearProgress(searchKey);
  };

  /** 标记已掌握：POST /api/repo/book/update { id, status: 1 }，不自动删除记录 */
  const markMastered = async (rowId: string) => {
    try {
      await post('/api/repo/book/update', { id: rowId, status: BOOK_STATUS_MASTERED });
      setMastered((prev) => new Set(prev).add(rowId));
      message.success('已标记为「已掌握」，记录仍留在错题本');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const markAllCorrect = async () => {
    const targets = items.filter(
      (item) => rowVerdicts.get(item.row.id) === 'correct' && !mastered.has(item.row.id),
    );
    if (!targets.length) return;
    setBusy(true);
    let done = 0;
    for (const item of targets) {
      try {
        await post('/api/repo/book/update', { id: item.row.id, status: BOOK_STATUS_MASTERED });
        done += 1;
        setMastered((prev) => new Set(prev).add(item.row.id));
      } catch {
        // 单条失败继续
      }
    }
    setBusy(false);
    if (done) message.success(`已把 ${done} 道答对的题标记为已掌握`);
    else message.error('标记失败，请稍后重试');
  };

  const goBack = () => navigate('/repo/book');

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bp-text-soft)' }}>
          正在取题 {progressText ? `${progressText} 道` : '…'}
        </div>
      </div>
    );
  }

  if (error || !root || !flat.length) {
    return (
      <div className="bp-card" style={{ padding: 30 }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error || '没有符合条件的错题可练'}>
          <Button onClick={goBack}>返回错题本</Button>
        </Empty>
      </div>
    );
  }

  // 「来源考试」排在最前面：本场考试错题练习时一眼能看出练的是哪一场
  const chips = [
    ...(filter.projectId ? [`来源考试：${projectLabel(filter.projectId)}`] : []),
    ...filterChips(filter),
  ];
  const scopeLabel = scope === 'project' ? '本场考试错题' : '错题本';
  const restoredNote = skipped > 0 ? `有 ${skipped} 道题读取失败或题型不支持，已跳过` : '';
  const truncatedNote = truncated > 0 ? `错题较多，本次只练前 ${MAX_QUESTIONS} 题（另有 ${truncated} 题未取）` : '';

  return (
    <div className="sk-answer" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div
        className="bp-card"
        style={{
          padding: 14,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} />
        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
          <div className="bp-title" style={{ fontSize: 16 }}>
            错题练习
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--bp-text-soft)',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <Tag color="orange">{phase === 'result' ? '练习结果' : scopeLabel}</Tag>
            {chips.length ? (
              chips.map((chip) => (
                <span key={chip} style={{ border: '1px solid var(--bp-line-soft)', padding: '0 6px', lineHeight: '16px' }}>
                  {chip}
                </span>
              ))
            ) : (
              <span>全部错题</span>
            )}
            <span>
              ·{' '}
              {phase === 'result'
                ? `共 ${stats.total} 题`
                : layout === 'single'
                  ? `第 ${qIndex + 1} / ${flat.length} 题`
                  : `已答 ${answeredCount} / ${flat.length} 题`}
            </span>
          </div>
        </div>
        {phase === 'answer' && (
          <>
            <Segmented
              value={layout}
              onChange={(value) => setLayout(value as Layout)}
              options={[
                { label: '一页一题', value: 'single' },
                { label: '瀑布流', value: 'scroll' },
              ]}
            />
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--bp-text-soft)' }}
            >
              <span>字号</span>
              <Slider
                min={0.9}
                max={2}
                step={0.05}
                value={fontScale}
                onChange={setFont}
                style={{ width: 100, margin: 0 }}
              />
            </div>
          </>
        )}
      </div>

      {(restoredNote || truncatedNote) && (
        <div style={{ fontSize: 11, color: 'var(--bp-orange)', marginBottom: 10 }}>
          {[restoredNote, truncatedNote].filter(Boolean).join('；')}
        </div>
      )}

      {phase === 'answer' ? (
        <>
          <div className="bp-card" style={{ padding: 18, minHeight: 260, zoom: fontScale }}>
            {layout === 'single' && pageSchema ? (
              <SchemaRenderer
                schema={pageSchema}
                values={values}
                onChange={(qId, value) => setValues((prev) => ({ ...prev, [qId]: value }))}
                mode="answer"
                numberOffset={qIndex}
              />
            ) : (
              <SchemaRenderer
                schema={root}
                values={values}
                onChange={(qId, value) => setValues((prev) => ({ ...prev, [qId]: value }))}
                mode="answer"
              />
            )}
          </div>

          {layout === 'single' && (
            <div className="bp-card" style={{ padding: 12, marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
                答题卡 · 已答 {answeredCount} / {flat.length}
              </div>
              <div style={{ maxHeight: 168, overflowY: 'auto' }}>
                <div className="sk-sheet">
                  {flat.map((q, i) => {
                    const cls = [
                      !isEmptyAnswer(values[q.id], true) ? 'answered' : '',
                      i === qIndex ? 'current' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <button key={q.id} type="button" className={cls} title={q.title} onClick={() => setIndex(i)}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 14,
              flexWrap: 'wrap',
            }}
          >
            {layout === 'single' && (
              <>
                <Button
                  icon={<LeftOutlined />}
                  disabled={qIndex <= 0}
                  onClick={() => setIndex(Math.max(0, qIndex - 1))}
                >
                  上一题
                </Button>
                <Button
                  icon={<RightOutlined />}
                  iconPosition="end"
                  disabled={qIndex >= flat.length - 1}
                  onClick={() => setIndex(Math.min(flat.length - 1, qIndex + 1))}
                >
                  下一题
                </Button>
              </>
            )}
            <Button type="primary" onClick={finish}>
              完成练习
            </Button>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
              gap: 10,
              marginBottom: 14,
            }}
          >
            {[
              { label: '总题数', value: stats.total, color: 'var(--bp-text)' },
              { label: '已作答', value: stats.answered, color: 'var(--bp-text)' },
              { label: '答对', value: stats.correct, color: 'var(--bp-blue)' },
              { label: '答错', value: stats.wrong, color: 'var(--bp-orange)' },
              { label: '未判定', value: stats.unknown, color: 'var(--bp-text-soft)' },
              { label: '未作答', value: stats.unanswered, color: 'var(--bp-text-soft)' },
            ].map((cell) => (
              <div key={cell.label} style={{ border: '1px solid var(--bp-line-soft)', padding: '10px 12px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)' }}>{cell.label}</div>
                <div style={{ fontSize: 22, color: cell.color, marginTop: 4 }}>{cell.value}</div>
              </div>
            ))}
          </div>

          <div className="bp-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9, marginBottom: 6 }}>
              答对的题可以标记为「已掌握」，标记后记录仍留在错题本；需要彻底移除请回列表用批量删除。
              本次练习只做自测，不写入练习记录。
            </div>
            {stats.unknown > 0 && (
              <div style={{ fontSize: 11, color: 'var(--bp-orange)', marginBottom: 6 }}>
                有 {stats.unknown} 道题题库没有提供标准答案，标记为「未判定」，请对照题目自行判断。
              </div>
            )}
            <hr className="bp-dim" style={{ margin: '10px 0' }} />
            {items.map((item, i) => {
              const verdict = rowVerdicts.get(item.row.id) ?? 'unanswered';
              const questions = questionsByRow.get(item.row.id) ?? [];
              const first = questions[0];
              const isMastered = mastered.has(item.row.id);
              const canMark = !isMastered && (verdict === 'correct' || verdict === 'unknown');
              return (
                <div
                  key={item.row.id}
                  style={{
                    borderTop: i === 0 ? undefined : '1px dashed var(--bp-line-soft)',
                    padding: '10px 0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="bp-tag">{i + 1}</span>
                  <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                      {first?.title || item.row.name || '(无标题)'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 3 }}>
                      你的答案：{first ? answerSummary(first.schema, values[first.id]) : '—'}
                      {isMastered ? ' · 已标记掌握' : ''}
                    </div>
                  </div>
                  <Tag color={VERDICT_COLOR[verdict]}>{VERDICT_LABEL[verdict]}</Tag>
                  <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                    {canMark && <a onClick={() => void markMastered(item.row.id)}>标记已掌握</a>}
                    <a
                      onClick={() => {
                        setIndex(Math.min(questions[0]?.index ?? i, Math.max(flat.length - 1, 0)));
                        setPhase('answer');
                      }}
                    >
                      回到这题
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 14,
              flexWrap: 'wrap',
            }}
          >
            {stats.correct > 0 && (
              <Button loading={busy} onClick={() => void markAllCorrect()}>
                答对的全部标为已掌握
              </Button>
            )}
            <Button onClick={restart}>再练一遍</Button>
            <Button type="primary" onClick={goBack}>
              返回错题本
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
