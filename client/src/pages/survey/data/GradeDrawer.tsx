/** 主观题人工批改抽屉 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Card, Collapse, Drawer, Empty, Input, InputNumber, Space, Spin, Tag, Timeline } from 'antd';
import { CheckOutlined, CloseOutlined, HistoryOutlined, RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { get, getGradeDetail, post, resetGrade, submitGrade } from '../../../api';
import type { GradeDetail, GradeItem } from '../../../api';
import { can, loadAuthorities } from '../../../auth/permissions';
import { PERMISSION_CODES } from '../../../auth/permission-codes';
import type { Answer } from '../../../schema/project';
import { flattenSchema } from '../../../schema/flatten';
import type { AnswerValue } from '../../../renderer/types';
import { formatScore } from '../../../utils/scoring';
import RichTextContent from '../../../components/RichTextContent';
import { EMPTY, flattenText, formatAnswer } from './format';





export type GradableAnswer = Answer & {

  gradeStatus?: string;

  answererName?: string;
};

export interface GradeDrawerProps {
  open: boolean;

  answerId?: string;
  onClose: () => void;

  onChanged?: () => void;
}


const TYPE_LABEL: Record<string, string> = {
  Textarea: '简答题',
  FillBlank: '填空题',
  MultipleBlank: '多空填空',
  HorzBlank: '横排填空',
  MatrixFillBlank: '矩阵填空',
  Radio: '单选题',
  Checkbox: '多选题',
  Select: '下拉选择',
  Judge: '判断题',
  Score: '评分题',
  Nps: 'NPS',
  Cascader: '级联选择',
  Address: '地址',
  Upload: '上传',
  Signature: '签名',
  User: '人员',
  Dept: '部门',
  Barcode: '条码',
  RichText: '图文',
};


const TIMELINE_KEY = 'timeline';


const MAX_QUESTION_PARTS = 4;







interface AuditTimelineRow {

  at?: string | number;
  operator?: string;

  actionName?: string;

  questionId?: string | null;
  before?: unknown;
  after?: unknown;
}


interface TimelineGradeItem {
  questionId?: string | null;

  score?: number | null;
  comment?: string | null;
}


interface TimelineSnapshot {
  examScore?: number | null;
  gradeStatus?: string;
  visible?: boolean;
  items?: TimelineGradeItem[];
}

/** 只有普通对象才算结构化快照：数组 / 字符串 / null 一律不当快照解析 */
function asSnapshot(value: unknown): TimelineSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as TimelineSnapshot;
}

/** 分数文案：null / undefined 是「还没给分」，不能显示成 0 */
const scoreText = (value?: number | null) => (typeof value === 'number' ? formatScore(value) : '未给分');

/** 快照里的 items 按 questionId 建索引，改前改后按题对齐 */
function gradeItemsOf(snapshot?: TimelineSnapshot): Map<string, TimelineGradeItem> {
  const map = new Map<string, TimelineGradeItem>();
  for (const item of snapshot?.items ?? []) {
    if (item && typeof item === 'object' && typeof item.questionId === 'string' && item.questionId) {
      map.set(item.questionId, item);
    }
  }
  return map;
}

/** 操作时间：后端 spring.jackson.date-format=yyyy-MM-dd HH:mm:ss，正常是字符串 */
function fmtAt(value?: string | number): string {
  if (value === null || value === undefined || value === '') return '时间未知';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : String(value);
}

/** 快照被截断 / 写坏时后端返回原文字符串：截短展示，别把整段 JSON 塞进抽屉 */
function snapshotText(value: unknown): string {
  const text = typeof value === 'string' ? value : '';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/** before → after 的差异摘要 */
function changeParts(
  row: AuditTimelineRow,
  labelOf: (questionId?: string | null) => string,
): string[] {
  const before = asSnapshot(row.before);
  const after = asSnapshot(row.after);
  if (!before && !after) {
    const text = snapshotText(row.before) || snapshotText(row.after);
    return [text ? `快照文本：${text}` : '无改前/改后快照'];
  }
  if (before && !after) {

    return ['只有改前快照（没有改后值）'];
  }
  const parts: string[] = [];
  const beforeItems = gradeItemsOf(before);
  const afterItems = gradeItemsOf(after);
  const questionIds = Array.from(new Set([...beforeItems.keys(), ...afterItems.keys()]));
  const shown = questionIds.slice(0, MAX_QUESTION_PARTS);
  for (const questionId of shown) {
    const prev = beforeItems.get(questionId)?.score ?? null;
    const next = afterItems.get(questionId)?.score ?? null;
    if (prev === next) continue;

    const prefix = row.questionId && row.questionId === questionId ? '' : `${labelOf(questionId)} `;
    parts.push(`${prefix}分数 ${scoreText(prev)} → ${scoreText(next)}`);
  }
  if (questionIds.length > shown.length) {

    parts.push(`…共 ${questionIds.length} 题`);
  }
  const prevTotal = before?.examScore;
  const nextTotal = after?.examScore;
  if ((typeof prevTotal === 'number' || typeof nextTotal === 'number') && prevTotal !== nextTotal) {
    parts.push(`总分 ${scoreText(prevTotal)} → ${scoreText(nextTotal)}`);
  }
  if (
    typeof before?.visible === 'boolean' &&
    typeof after?.visible === 'boolean' &&
    before.visible !== after.visible
  ) {
    parts.push(`可查看 ${before.visible ? '是' : '否'} → ${after.visible ? '是' : '否'}`);
  }
  if (parts.length === 0) {

    const hasGradeData =
      questionIds.length > 0 || typeof prevTotal === 'number' || typeof nextTotal === 'number';
    if (!hasGradeData) return ['快照里没有分数信息'];
    const commentChanged = shown.some(
      (questionId) =>
        (beforeItems.get(questionId)?.comment ?? '') !== (afterItems.get(questionId)?.comment ?? ''),
    );
    parts.push(commentChanged ? '评语已修改' : '分数没有变化');
  }
  return parts;
}









interface GradeSuggestion {

  score?: number;

  confidence?: number;

  points?: Array<{ point?: string; hit?: boolean }>;

  reason?: string;
}


interface AiSuggestionState {
  loading?: boolean;
  data?: GradeSuggestion;
  error?: string;
}


const LOW_CONFIDENCE = 0.6;

/** 请求 AI 批改建议（同步，2~5 秒，后端 `AiApi#gradeSuggest`） */
const requestGradeSuggestion = (data: { answerId: string; questionId: string }) =>
  post<GradeSuggestion>('/api/ai/grade/suggest', data);

/** 建议分归一：后端已把分数夹到 0~满分，这里只挡 null / 非法值（取不出来就当「这次没给分」） */
function suggestionScore(value?: number): number | undefined {

  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/** 把握程度文案：0~1 当比例、>=1 当已经是百分数；拿不到就不显示，不猜 */
function suggestionConfidence(value?: number): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  const percent = value <= 1 ? value * 100 : value;
  return `把握 ${Math.round(Math.min(percent, 100))}%`;
}

export default function GradeDrawer({ open, answerId, onClose, onChanged }: GradeDrawerProps) {
  const { message } = App.useApp();
  const [detail, setDetail] = useState<GradeDetail>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const [active, setActive] = useState(0);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const inputRefs = useRef<Array<{ focus: () => void } | null>>([]);

  const [timeline, setTimeline] = useState<AuditTimelineRow[]>();
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string>();

  const [timelineFor, setTimelineFor] = useState<string>();
  const [timelineKeys, setTimelineKeys] = useState<string[]>([]);

  const [aiSuggest, setAiSuggest] = useState<Record<string, AiSuggestionState>>({});

  const [authorities, setAuthorities] = useState<string[]>([]);

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  const load = useCallback(async () => {
    if (!answerId) return;
    setLoading(true);
    try {
      const data = await getGradeDetail(answerId);
      setDetail(data);
      const nextScores: Record<string, number | null> = {};
      const nextComments: Record<string, string> = {};
      for (const item of data.items ?? []) {
        if (!item.editable) continue;

        nextScores[item.questionId] = typeof item.score === 'number' ? item.score : null;
        nextComments[item.questionId] = item.comment ?? '';
      }
      setScores(nextScores);
      setComments(nextComments);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [answerId, message]);

  useEffect(() => {
    if (!open) {

      setDetail(undefined);
      return;
    }
    setActive(0);
    void load();
  }, [open, load]);


  useEffect(() => {
    setTimeline(undefined);
    setTimelineFor(undefined);
    setTimelineError(undefined);
    setTimelineKeys([]);

    setAiSuggest({});
  }, [answerId, open]);

  /** 拉操作记录 */
  const loadTimeline = useCallback(async (id: string) => {
    setTimelineLoading(true);
    setTimelineError(undefined);
    try {
      const rows = await get<AuditTimelineRow[]>('/api/audit/answer-timeline', { answerId: id });
      setTimeline(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setTimeline([]);
      setTimelineError((e as Error).message || '请求失败');
    } finally {
      setTimelineFor(id);
      setTimelineLoading(false);
    }
  }, []);

  /** 展开才拉；收起不动，来回点不会重复请求同一份答卷 */
  const toggleTimeline = (keys: string | string[]) => {
    const next = Array.isArray(keys) ? keys : [keys];
    setTimelineKeys(next);
    if (next.includes(TIMELINE_KEY) && answerId && timelineFor !== answerId) {
      void loadTimeline(answerId);
    }
  };

  /** 批改 / 撤销之后审计里刚多了一条：面板开着就立刻重拉，没开就标记成未加载， */
  const refreshTimeline = useCallback(() => {
    setTimelineFor(undefined);
    if (answerId && timelineKeys.includes(TIMELINE_KEY)) {
      void loadTimeline(answerId);
    }
  }, [answerId, timelineKeys, loadTimeline]);

  const questions = useMemo(() => (detail?.schema ? flattenSchema(detail.schema) : []), [detail]);
  const questionById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  /** 题号索引：时间线里把审计的 questionId 换成人看得懂的「第 N 题」 */
  const numberById = useMemo(() => {
    const map = new Map<string, number>();
    for (const question of questions) {
      if (typeof question.number === 'number') map.set(question.id, question.number);
    }
    return map;
  }, [questions]);
  /** 快照里的题已经不在当前 schema（比如改过卷）时只说「题目」，不把 id 甩给用户 */
  const questionLabel = (questionId?: string | null) => {
    if (!questionId) return '题目';
    const number = numberById.get(questionId);
    return typeof number === 'number' ? `第 ${number} 题` : '题目';
  };
  const items = useMemo(() => detail?.items ?? [], [detail]);
  const editableItems = useMemo(() => items.filter((item) => item.editable), [items]);
  const unanswered = editableItems.filter((item) => typeof scores[item.questionId] !== 'number').length;

  const canUseAi = can(authorities, PERMISSION_CODES.aiUse);

  const move = useCallback(
    (delta: number) => {
      setActive((prev) => {
        if (editableItems.length === 0) return 0;
        return Math.min(Math.max(prev + delta, 0), editableItems.length - 1);
      });
    },
    [editableItems.length],
  );


  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();

      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, move]);


  useEffect(() => {
    if (!open) return;
    cardRefs.current[active]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    inputRefs.current[active]?.focus();
  }, [active, open, editableItems.length]);

  const save = async (options?: { questionId?: string; next?: boolean }) => {
    if (!detail) return;
    const payload = editableItems
      .filter((item) => typeof scores[item.questionId] === 'number')
      .map((item) => ({
        questionId: item.questionId,
        score: scores[item.questionId] as number,
        comment: comments[item.questionId] || undefined,
      }));
    if (payload.length === 0) {
      message.warning('先给至少一道主观题打分');
      return;
    }
    for (const item of editableItems) {
      const value = scores[item.questionId];
      if (typeof value !== 'number') continue;
      if (typeof item.maxScore === 'number' && value > item.maxScore) {
        message.error(`第 ${item.number ?? ''} 题最多 ${item.maxScore} 分`);
        return;
      }
    }
    const index = options?.questionId
      ? editableItems.findIndex((item) => item.questionId === options.questionId)
      : -1;
    setSaving(true);
    try {
      await submitGrade({ answerId: detail.answerId, items: payload, submit: true });
      message.success('已保存');
      await load();
      onChanged?.();

      refreshTimeline();
      if (options?.next && index >= 0) {
        setActive(Math.min(index + 1, Math.max(editableItems.length - 1, 0)));
      }
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const undo = async (item: GradeItem) => {
    if (!detail) return;
    setSaving(true);
    try {
      await resetGrade({ answerId: detail.answerId, questionIds: [item.questionId] });
      message.success('已撤销这道题的批改');
      await load();
      onChanged?.();
      refreshTimeline();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /** 请求某道题的 AI 建议 */
  const askAi = async (item: GradeItem) => {
    if (!detail) return;
    const questionId = item.questionId;
    setAiSuggest((prev) => ({ ...prev, [questionId]: { loading: true } }));
    try {
      const suggestion = await requestGradeSuggestion({ answerId: detail.answerId, questionId });
      setAiSuggest((prev) => ({ ...prev, [questionId]: { data: suggestion ?? {} } }));
    } catch (e) {
      setAiSuggest((prev) => ({
        ...prev,
        [questionId]: { error: (e as Error).message || '请求失败' },
      }));
    }
  };

  /** 采纳建议：**只把分数写进输入框，不调保存接口** */
  const adoptSuggestion = (item: GradeItem, score: number) => {
    const max = typeof item.maxScore === 'number' ? item.maxScore : undefined;
    const clamped = Math.max(0, typeof max === 'number' ? Math.min(score, max) : score);
    setScores((prev) => ({ ...prev, [item.questionId]: clamped }));
    if (clamped !== score) {
      message.warning(`建议分 ${formatScore(score)} 超出本题满分，已按 ${formatScore(clamped)} 分填入`);
      return;
    }
    message.success(`已填入 ${formatScore(clamped)} 分，确认无误后点「保存批改」`);
  };

  /** AI 建议面板：只展示、不改分 */
  const renderAiPanel = (item: GradeItem, ai: AiSuggestionState) => {
    const score = suggestionScore(ai.data?.score);
    const confidence = suggestionConfidence(ai.data?.confidence);
    const points = ai.data?.points ?? [];

    const lowConfidence =
      typeof ai.data?.confidence === 'number' &&
      ai.data.confidence > 0 &&
      ai.data.confidence < LOW_CONFIDENCE;

    const outOfRange =
      typeof score === 'number' && typeof item.maxScore === 'number' && score > item.maxScore;
    return (
      <div
        style={{
          flex: '1 1 100%',
          border: '1px solid var(--bp-orange-line)',
          background: 'var(--bp-orange-weak)',
          borderRadius: 4,
          padding: '8px 10px',
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <b>
            <RobotOutlined /> AI 建议
          </b>
          {ai.loading ? (
            <span style={{ color: 'var(--bp-text-soft)' }}>AI 正在看这道题（2~5 秒）…</span>
          ) : typeof score === 'number' ? (
            <span>
              建议 <b style={{ color: 'var(--bp-orange)' }}>{formatScore(score)}</b> 分
              {typeof item.maxScore === 'number' ? ` / 满分 ${formatScore(item.maxScore)} 分` : ''}
            </span>
          ) : ai.data ? (
            <span style={{ color: 'var(--bp-text-soft)' }}>这次没给出分数，只能参考下面的理由</span>
          ) : null}
          {confidence ? <Tag style={{ marginInlineEnd: 0 }}>{confidence}</Tag> : null}
          <span style={{ flex: 1 }} />
          {!ai.loading && typeof score === 'number' ? (
            <Button size="small" type="primary" onClick={() => adoptSuggestion(item, score)}>
              采纳
            </Button>
          ) : null}
          {ai.error ? (
            <Button size="small" onClick={() => void askAi(item)}>
              重试
            </Button>
          ) : null}
        </div>
        {ai.error ? (
          <div style={{ marginTop: 4, color: 'var(--bp-text-soft)' }}>
            AI 建议暂时拿不到（{ai.error}），不影响手动批改。
          </div>
        ) : null}
        {lowConfidence ? (
          <div style={{ marginTop: 4, color: 'var(--bp-orange)' }}>
            把握不高，建议人工复核——AI 可能漏看采分点。
          </div>
        ) : null}
        {points.length > 0 ? (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {points.map((point, index) => (
              <div key={index} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <span style={{ width: 14, color: point.hit ? 'var(--bp-blue)' : 'var(--bp-text-soft)' }}>
                  {point.hit ? <CheckOutlined /> : <CloseOutlined />}
                </span>
                <span style={{ color: point.hit ? 'var(--bp-text)' : 'var(--bp-text-soft)' }}>
                  {point.point || '未命名的评分点'}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {ai.data?.reason ? <div style={{ marginTop: 6 }}>理由：{ai.data.reason}</div> : null}
        {outOfRange ? (
          <div style={{ marginTop: 4, color: 'var(--bp-orange)' }}>
            建议分超过本题满分，采纳时会按满分截断。
          </div>
        ) : null}
        {ai.data && !ai.error ? (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--bp-text-soft)' }}>
            采纳只是把分数填进上面的输入框，不会自动落分——确认后仍需点「保存批改」。
          </div>
        ) : null}
      </div>
    );
  };

  /** 学员答案：优先用整卷 schema 的题目信息格式化（选项题能还原成选项文字） */
  const answerText = (item: GradeItem) => {
    const question = questionById.get(item.questionId);
    if (question) return formatAnswer(question, item.answer as AnswerValue);
    return flattenText(item.answer) || EMPTY;
  };

  const renderTitle = (item: GradeItem) => {
    const question = questionById.get(item.questionId);
    if (question && (question.schema.attribute?.richTitle || item.richTitle)) {
      return <RichTextContent html={question.title} style={{ fontSize: 13 }} />;
    }
    return (
      <div style={{ fontSize: 13, lineHeight: 1.7 }}>{item.title || item.type || '未命名题目'}</div>
    );
  };

  const title = detail?.answererName
    ? `主观题批改 · ${detail.answererName}`
    : detail?.anonymous
      ? '主观题批改 · 匿名答卷'
      : '主观题批改';

  return (
    <Drawer
      title={title}
      placement="right"
      size="min(720px, 100vw)"
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        detail ? (
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              {unanswered > 0 ? `还有 ${unanswered} 道主观题没给分` : '主观题都已给分'} · 分数框 Enter
              保存并下一题 · ←/→ 切题
            </span>
            <Space>
              <Button onClick={() => move(-1)} disabled={editableItems.length <= 1}>
                上一题
              </Button>
              <Button onClick={() => move(1)} disabled={editableItems.length <= 1}>
                下一题
              </Button>
              <Button type="primary" loading={saving} onClick={() => void save()}>
                保存批改
              </Button>
            </Space>
          </Space>
        ) : null
      }
    >
      <Spin spinning={loading}>
        {!detail ? (
          <Empty description="没有可批改的答卷" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>

            <Card size="small" style={{ background: 'var(--bp-panel-strong)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13 }}>
                <span>
                  客观题 <b>{formatScore(detail.objectiveScore)}</b>
                </span>
                <span>
                  主观题 <b>{formatScore(detail.manualScore)}</b>
                </span>
                <span>
                  合计{' '}
                  <b style={{ color: 'var(--bp-orange)' }}>{formatScore(detail.examScore)}</b>
                </span>
                <span style={{ color: 'var(--bp-text-soft)' }}>
                  满分 {formatScore(detail.totalScore)}
                </span>
                <span style={{ color: 'var(--bp-text-soft)' }}>
                  待批 {detail.pendingCount ?? 0} 题
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 6 }}>
                {detail.answererName || (detail.anonymous ? '匿名' : '未填写姓名')} · 交卷{' '}
                {detail.createAt || EMPTY}
                {typeof detail.attemptNo === 'number'
                  ? ` · 第 ${detail.attemptNo + 1} 次作答`
                  : ''}
                {detail.gradedByName ? ` · 上次批改 ${detail.gradedByName}` : ''}
              </div>
            </Card>

            {items.length === 0 && (
              <Empty
                description="这份答卷没有题目快照，无法批改"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}

            {items.map((item, index) => {
              const editableIndex = item.editable
                ? editableItems.findIndex((x) => x.questionId === item.questionId)
                : -1;
              const graded = typeof item.score === 'number';
              const scored = typeof scores[item.questionId] === 'number';

              const ai = aiSuggest[item.questionId];
              return (
                <div
                  key={item.questionId}
                  ref={
                    editableIndex >= 0
                      ? (node) => {
                          cardRefs.current[editableIndex] = node;
                        }
                      : undefined
                  }
                >
                  <Card
                    size="small"
                    style={
                      editableIndex === active && editableIndex >= 0
                        ? { borderColor: 'var(--bp-orange)' }
                        : undefined
                    }
                  >
                    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                      <div style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="bp-tag">{item.number ?? index + 1}</span>
                        <Tag>{TYPE_LABEL[item.type ?? ''] ?? item.type ?? '题目'}</Tag>
                        {item.editable ? (
                          <Tag color={scored ? 'success' : 'processing'}>
                            {scored ? '已给分' : '待批改'}
                          </Tag>
                        ) : (
                          <Tag>机器判分</Tag>
                        )}

                        {(item as { source?: string }).source === 'ai' && (
                          <Tag color="purple" style={{ marginInlineEnd: 0, fontSize: 10 }}>
                            AI 给分
                          </Tag>
                        )}

                        {item.editable && canUseAi ? (
                          <span style={{ marginLeft: 'auto' }}>
                            <Button
                              size="small"
                              icon={<RobotOutlined />}
                              loading={ai?.loading}
                              title="让 AI 给出建议分与理由（只填分数，不会自动落分）"
                              onClick={() => void askAi(item)}
                            >
                              {ai?.data || ai?.error ? '重新建议' : 'AI 建议'}
                            </Button>
                          </span>
                        ) : null}
                      </div>
                      {renderTitle(item)}
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--bp-text)',
                          whiteSpace: 'pre-wrap',
                          paddingLeft: 2,
                        }}
                      >
                        {answerText(item)}
                      </div>
                      {item.correctAnswer ? (
                        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                          参考答案：{item.correctAnswer}
                        </div>
                      ) : null}
                      {item.analysis ? (
                        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                          解析：{item.analysis}
                        </div>
                      ) : null}
                      {item.editable ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <InputNumber
                            ref={(node) => {
                              inputRefs.current[editableIndex] = node
                                ? { focus: () => node.focus() }
                                : null;
                            }}
                            min={0}
                            max={typeof item.maxScore === 'number' ? item.maxScore : undefined}
                            step={0.5}
                            style={{ width: 130 }}
                            suffix="分"
                            placeholder={`0 ~ ${item.maxScore ?? '满分'}`}
                            value={scores[item.questionId] ?? undefined}
                            onChange={(value) =>
                              setScores((prev) => ({
                                ...prev,
                                [item.questionId]: typeof value === 'number' ? value : null,
                              }))
                            }
                            onPressEnter={() => void save({ questionId: item.questionId, next: true })}
                            onKeyDown={(event) => {

                              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                                event.preventDefault();
                                move(event.key === 'ArrowRight' ? 1 : -1);
                              }
                            }}
                          />
                          <Input.TextArea
                            value={comments[item.questionId] ?? ''}
                            onChange={(event) =>
                              setComments((prev) => ({
                                ...prev,
                                [item.questionId]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                                event.preventDefault();
                                void save({ questionId: item.questionId, next: true });
                              }
                            }}
                            placeholder="评语（可选），Ctrl/⌘ + Enter 保存并下一题"
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            style={{ flex: 1, minWidth: 200 }}
                          />
                          {graded && (
                            <Button type="link" size="small" danger disabled={saving} onClick={() => void undo(item)}>
                              撤销
                            </Button>
                          )}

                          {canUseAi && ai && (ai.loading || ai.data || ai.error)
                            ? renderAiPanel(item, ai)
                            : null}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                          机器分 {formatScore(item.score)} / 满分 {formatScore(item.maxScore)}
                        </div>
                      )}
                    </Space>
                  </Card>
                </div>
              );
            })}


            <Collapse
              ghost
              size="small"
              activeKey={timelineKeys}
              onChange={toggleTimeline}
              items={[
                {
                  key: TIMELINE_KEY,
                  label: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <HistoryOutlined />
                      操作记录
                      {timeline && timeline.length > 0 ? (
                        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                          {timeline.length} 条
                        </span>
                      ) : null}
                    </span>
                  ),
                  children: (
                    <div style={{ fontSize: 12 }}>
                      {timelineLoading ? (
                        <div style={{ padding: '12px 0', textAlign: 'center' }}>
                          <Spin size="small" />
                        </div>
                      ) : timelineError ? (
                        <div style={{ color: 'var(--bp-text-soft)' }}>
                          操作记录暂时读不到（{timelineError}），不影响批改。
                        </div>
                      ) : !timeline || timeline.length === 0 ? (
                        <div style={{ color: 'var(--bp-text-soft)' }}>暂无操作记录</div>
                      ) : (

                        <Timeline
                          items={timeline.map((row, index) => {
                            const parts = changeParts(row, questionLabel);
                            return {
                              key: index,
                              children: (
                                <div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: 8,
                                      flexWrap: 'wrap',
                                      alignItems: 'baseline',
                                    }}
                                  >
                                    <b style={{ fontSize: 12 }}>{row.actionName || '操作'}</b>
                                    <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                                      {fmtAt(row.at)} · {row.operator || '未知操作人'}
                                    </span>
                                    {row.questionId ? (
                                      <Tag style={{ marginInlineEnd: 0 }}>{questionLabel(row.questionId)}</Tag>
                                    ) : null}
                                  </div>
                                  {parts.length > 0 && (
                                    <div style={{ marginTop: 2, color: 'var(--bp-text)' }}>
                                      {parts.join(' · ')}
                                    </div>
                                  )}
                                </div>
                              ),
                            };
                          })}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Spin>
    </Drawer>
  );
}
