import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { Alert, App, Button, Drawer, Input, message, Slider, Spin } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, FlagFilled, FlagOutlined, MenuOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ApiError, get, post } from '../../api';
import { COPY_PROTECT_EVENT } from '../../components/CopyGuard';
import type { AnswerValue } from '../../renderer/types';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import {
  QuestionFavoriteContext,
  QuestionMarkContext,
  type QuestionFavoriteApi,
  type QuestionMarkApi,
} from '../../renderer/questions/shared';
import { isEmptyAnswer } from '../../schema/empty';
import { flattenSchema } from '../../schema/flatten';
import { evaluateVisible } from '../../schema/rules/engine';
import { evaluateJump, parseJumpRule, type JumpRuleConfig } from '../../schema/rules/jump';
import {
  CALCULATE_TARGET_TYPES,
  calculateValue,
  parseCalculateRule,
  type CalculateRuleConfig,
} from '../../schema/rules/calculate';
import { blankId } from '../../renderer/questions/answers';
import type { PublicQuestionOutline, PublicAnswerView, PublicProjectView } from '../../schema/project';
import type { SurveySchema } from '../../schema/types';
import {
  installAnswerStorageCleanup,
  readAnswerId,
  readDraft,
  readMarks,
  removeAnswerId,
  removeDraft,
  writeAnswerId,
  writeDraft,
  writeMarks,
} from '../../utils/answerStorage';
import { buildView, QuestionCard } from './ExamResult';
import AnonymousAnswersDrawer from './AnonymousAnswersDrawer';
import '../../styles/answer.css';


const ERROR_ANSWER_CHANGE_DISABLED = 4020;
/** 把一道题的答案摊成纯文本（填空题是 { 空位id: 文本 }，兜底把对象里的字符串拼起来） */
function answerPlainText(value: AnswerValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => answerPlainText(item as AnswerValue)).filter(Boolean).join(' ');
  if (typeof value !== 'object') return String(value);
  return Object.values(value as Record<string, unknown>)
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter(Boolean)
    .join(' ');
}

function formFieldIds(p?: PublicProjectView): string[] {
  return (p?.survey?.children ?? []).map((c) => c.id);
}

async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}


/** 计算结果换成答案形状：填空写第一个空位，其余题型写字符串 */
function calculatedAnswer(schema: SurveySchema, result: number): AnswerValue {
  const text = String(result);
  const id = blankId(schema);
  return schema.type === 'FillBlank' && id ? { [id]: text } : text;
}

const FONT_MIN = 0.9;
const FONT_MAX = 2;
const FONT_KEY = 'sk-font-scale';

const ANSWERER_NAME_KEY = 'sk-answerer-name';

/** 从整棵树里摘出单道题（一页一题时用） */
export function pickQuestionNode(root: SurveySchema, id: string): SurveySchema | undefined {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const hit = pickQuestionNode(child, id);
    if (hit) return hit;
  }
  return undefined;
}


/** 探测登录态（决定要不要显示「返回上一级」） */
async function fetchLoggedIn(): Promise<boolean> {
  try {
    const res = await fetch('/api/currentUser', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401) return false;
    const json = (await res.json()) as { code?: number; data?: { authorityList?: string[] } };
    return json.code === 200 && (json.data?.authorityList?.length ?? 0) > 0;
  } catch {
    return false;
  }
}


const PRACTICE_CHOICE_TYPES: ReadonlySet<string> = new Set(['Radio', 'Checkbox', 'Select', 'Judge']);

/** 练习模式：已选中的选项 id（值形如 { 选项id: true }） */
function pickedOptionIds(value: AnswerValue): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, picked]) => picked === true || picked === 1 || (typeof picked === 'string' && picked !== ''))
    .map(([optionId]) => optionId);
}

/** 练习模式：标准答案文本 */
function practiceCorrectText(schema: SurveySchema): string {
  if (PRACTICE_CHOICE_TYPES.has(schema.type)) {
    return (schema.children ?? [])
      .filter((child) => Boolean((child.attribute?.examCorrectAnswer ?? '').trim()))
      .map(
        (child) =>
          schema.dataSource?.find((option) => option.value === child.id)?.label ?? child.title ?? child.id,
      )
      .join('、');
  }
  return (schema.attribute?.examCorrectAnswer ?? schema.children?.[0]?.attribute?.examCorrectAnswer ?? '').trim();
}

/** 练习模式即时判题：true=对 / false=错 / null=没作答或没有标准答案 */
function practiceVerdict(schema: SurveySchema, value: AnswerValue): boolean | null {
  if (isEmptyAnswer(value)) return null;
  if (PRACTICE_CHOICE_TYPES.has(schema.type)) {
    const correct = (schema.children ?? [])
      .filter((child) => Boolean((child.attribute?.examCorrectAnswer ?? '').trim()))
      .map((child) => child.id);
    if (!correct.length) return null;
    const picked = pickedOptionIds(value);
    if (!picked.length) return null;
    const expected = new Set(correct);
    return picked.length === correct.length && picked.every((id) => expected.has(id));
  }
  if (schema.type === 'FillBlank' || schema.type === 'Textarea') {
    const expected = practiceCorrectText(schema);
    if (!expected) return null;
    const actual = typeof value === 'string' ? value.trim() : '';
    if (!actual) return null;
    const candidates = expected
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    return schema.attribute?.examMatchRule === 'contain'
      ? candidates.some((item) => item.includes(actual))
      : candidates.some((item) => item === actual);
  }
  return null;
}

/** 练习模式：题下即时判题反馈（✓/✕ + 正确答案 + 解析），只读，不写 answer */
function PracticeFeedback({
  schema,
  value,
  touched,
  timedOut = false,
}: {
  schema: SurveySchema;
  value: AnswerValue;
  touched: boolean;
  timedOut?: boolean;
}) {

  if (!timedOut && !PRACTICE_CHOICE_TYPES.has(schema.type) && !touched) return null;
  const verdict = practiceVerdict(schema, value);
  if (verdict === null && !timedOut) return null;
  const correctText = practiceCorrectText(schema);
  const analysis = (schema.attribute?.examAnalysis ?? '').trim();
  const ok = verdict === true;
  const header = timedOut ? '✕ 本题超时（按 0 分计）' : ok ? '✓ 回答正确' : '✕ 回答错误';
  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 4,
        padding: '8px 12px',
        border: '1px solid var(--bp-line-soft)',
        borderLeft: `3px solid ${ok ? 'var(--bp-blue)' : 'var(--bp-orange)'}`,
        background: ok ? 'var(--bp-blue-weak)' : 'var(--bp-orange-tint)',
        borderRadius: 0,
        fontSize: 13,
        lineHeight: 1.8,
      }}
    >
      <div style={{ color: ok ? 'var(--bp-blue)' : 'var(--bp-orange)', letterSpacing: '0.04em' }}>{header}</div>
      {!ok && correctText && <div style={{ marginTop: 2 }}>正确答案：{correctText}</div>}
      {analysis && <div style={{ marginTop: 2, fontSize: 12, color: 'var(--bp-text-soft)' }}>解析：{analysis}</div>}
    </div>
  );
}

export default function PublicAnswer() {
  const { id = '', answerId: routeAnswerId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();





  const previewMode = searchParams.get('preview') === '1';

  const classToken = searchParams.get('classToken') || undefined;

  const freshAttempt = searchParams.get('fresh') === '1';
  const { modal } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<PublicProjectView>();
  const [questionCache, setQuestionCache] = useState<Record<string, SurveySchema>>({});
  const [questionLoading, setQuestionLoading] = useState<Record<string, boolean>>({});
  const [questionErrors, setQuestionErrors] = useState<Record<string, boolean>>({});
  const questionCacheRef = useRef<Record<string, SurveySchema>>({});
  const questionPendingRef = useRef<Map<string, Promise<SurveySchema>>>(new Map());
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [displays, setDisplays] = useState<Record<string, boolean>>({});
  const [jumpEndId, setJumpEndId] = useState<string>();
  const [needPassword, setNeedPassword] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [fatal, setFatal] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PublicAnswerView>();
  const [resultSurvey, setResultSurvey] = useState<SurveySchema>();
  const [answerId, setAnswerId] = useState<string>();
  /** 题目标记（只存本地，见 marksKey 注释）：{ 题目 id: true } */
  const [marks, setMarks] = useState<Record<string, boolean>>(() => readMarks(id));
  /** 当前用户收藏的题目 id；登录后拉一次，按钮状态即时更新 */
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const [fontScale, setFontScale] = useState<number>(() => Number(localStorage.getItem(FONT_KEY)) || 1);

  const [answererName, setAnswererName] = useState<string>(() => {
    try {
      return localStorage.getItem(ANSWERER_NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [answersOpen, setAnswersOpen] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);
  const [remainMs, setRemainMs] = useState<number>();
  const [switchCount, setSwitchCount] = useState(0);

  const [startedAt, setStartedAt] = useState<number>();
  /** 每秒滴答：驱动「最早交卷」倒计时显示 */
  const [clock, setClock] = useState(() => Date.now());

  const [examLocked, setExamLocked] = useState(false);

  const [passRemainMs, setPassRemainMs] = useState(0);

  const [passLockedQuestion, setPassLockedQuestion] = useState<string | null>(null);

  const [redirectLeft, setRedirectLeft] = useState<number | null>(null);

  const passTimesRef = useRef<Record<string, number>>({});

  const passTimeoutsRef = useRef<string[]>([]);

  const passDeadlineRef = useRef(0);

  const passSettledRef = useRef<string | null>(null);

  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  });

  const [practiceTouched, setPracticeTouched] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const submittedRef = useRef(false);

  const submittingRef = useRef(false);

  const submittedOnceRef = useRef(false);

  const applyProject = useCallback((data: PublicProjectView) => {
    const fields = formFieldIds(data);
    if (fields.includes('extraPassword')) {
      setNeedPassword(true);
      return;
    }
    if (fields.includes('username')) {
      setNeedLogin(true);
      return;
    }
    setProject(data);
    setNeedPassword(false);
    setNeedLogin(false);

    setStartedAt(Date.now());
    setExamLocked(false);
    if (freshAttempt) {

      setAnswerId(undefined);
      setValues({});
      setSwitchCount(0);
      return;
    }
    if (data.answerId) {
      setAnswerId(data.answerId);
      writeAnswerId(id, data.answerId);
    } else {
      setAnswerId(undefined);
      removeAnswerId(id);
    }
    if (data.answer) setValues(data.answer as Record<string, AnswerValue>);

    const meta = (data as PublicProjectView & { metaInfo?: { switchScreenTimes?: number } }).metaInfo;
    setSwitchCount(meta?.switchScreenTimes ?? 0);
  }, [id, freshAttempt]);

  const load = useCallback(async () => {

    submittedRef.current = false;
    submittedOnceRef.current = false;
    setLoading(true);
    setFatal(undefined);
    questionCacheRef.current = {};
    questionPendingRef.current.clear();
    setQuestionCache({});
    setQuestionLoading({});
    setQuestionErrors({});
    setPracticeTouched({});

    passTimesRef.current = {};
    passTimeoutsRef.current = [];
    passSettledRef.current = null;
    setPassLockedQuestion(null);
    try {
      if (freshAttempt) {

        removeAnswerId(id);
        removeDraft(id);
      }

      const savedId = freshAttempt ? undefined : (routeAnswerId ?? readAnswerId(id) ?? undefined);
      applyProject(
        await post<PublicProjectView>('/api/public/projectOutline', {
          id,
          answerId: savedId,
          classToken,
          preview: previewMode,
        }),
      );
    } catch (e) {
      setFatal((e as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, routeAnswerId, applyProject, freshAttempt, classToken, previewMode]);


  useEffect(() => {
    if (!project || result) return;
    if (project.answer) return;

    const draft = readDraft(id);
    const draftValues = draft?.values as Record<string, AnswerValue> | undefined;
    if (draftValues && Object.keys(draftValues).length > 0) {
      setValues(draftValues);
      message.info('已恢复上次未提交的答案');
    }
  }, [project, id, result]);


  useEffect(() => {
    if (!project || result) return;
    if (project.setting?.answerSetting?.autoSave === false) return;
    if (Object.keys(values).length === 0) return;
    const timer = window.setTimeout(() => {
      writeDraft(id, values);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [values, project, result, id]);










  useEffect(() => {
    if (!project || result) return;
    if (project.setting?.answerSetting?.autoSave === false) return;
    if (Object.keys(values).length === 0) return;
    const timer = window.setTimeout(async () => {
      try {
        await post('/api/public/tempSaveAnswer', {
          projectId: id,
          classToken,
          tempSave: 0,
          answer: values,
          tempAnswer: values,
          survey: project.survey,
        });
      } catch {
        // 暂存失败不打扰用户，本地草稿仍然在
      }
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [values, project, result, id]);

  useEffect(() => {
    void load();
  }, [load]);






  useEffect(() => installAnswerStorageCleanup(), []);





  useEffect(() => {
    let alive = true;
    void fetchLoggedIn().then((ok) => {
      if (alive) setLoggedIn(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loggedIn !== true) return;
    let alive = true;
    void get<string[]>('/api/repo/book/favorites')
      .then((ids) => {
        if (alive) setFavorites(new Set(ids ?? []));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [loggedIn]);

  const toggleFavorite = useCallback(
    async (schema: SurveySchema) => {
      if (loggedIn !== true) {
        message.warning('登录后才能收藏题目');
        return;
      }
      try {
        const next = await post<boolean>('/api/repo/book/favorite', {
          templateId: schema.id,
          name: schema.title,
          projectId: project?.mode === 'exam' ? id : undefined,
        });
        setFavorites((prev) => {
          const copy = new Set(prev);
          if (next) copy.add(schema.id);
          else copy.delete(schema.id);
          return copy;
        });
        message.success(next ? '已收藏，可在练习册里继续做' : '已取消收藏');
      } catch (e) {
        message.error((e as Error).message || '收藏失败');
      }
    },
    [loggedIn, project?.mode, id],
  );

  /** 标记每次变化都写回本地；清空时把 key 一起删掉，别留空对象 */
  const toggleMark = useCallback(
    (qId: string) => {
      const next = { ...marks };
      if (next[qId]) delete next[qId];
      else next[qId] = true;
      setMarks(next);
      writeMarks(id, next);
    },
    [marks, id],
  );


  const marksProjectRef = useRef(id);
  useEffect(() => {
    if (marksProjectRef.current === id) return;
    marksProjectRef.current = id;
    setMarks(readMarks(id));
  }, [id]);

  const submitPassword = async () => {
    setLoading(true);
    try {
      applyProject(
        await post<PublicProjectView>('/api/public/validateProjectOutline', {
          id,
          classToken,
          answer: { extraPassword: { extraPassword: password } },
        }),
      );
      setPassword('');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };


  const exerciseMode = project?.setting?.examSetting?.exerciseMode === true;

  const showProgress = project?.setting?.answerSetting?.progressBar !== false;
  const showSheet = project?.setting?.answerSetting?.answerSheetVisible !== false;

  const passMode = project?.setting?.examSetting?.passMode === true;
  const passModePerSeconds = project?.setting?.examSetting?.passModePerSeconds;

  const onePage = Boolean(project?.setting?.answerSetting?.onePageOneQuestion) || passMode;
  const autoNextRef = useRef<number | undefined>(undefined);
  const autoNext = project?.setting?.answerSetting?.autoNextAfterAnswer === true && !exerciseMode && !passMode;

  useEffect(() => () => window.clearTimeout(autoNextRef.current), []);

  const showQuestionNumber = project?.setting?.answerSetting?.questionNumber !== false;

  const copyEnabled = project?.setting?.answerSetting?.copyEnabled !== false;

  const redirectUrl = project?.setting?.submittedSetting?.redirectUrl?.trim() || '';
  const safeRedirectUrl = useMemo(() => {
    if (!redirectUrl) return undefined;
    try {
      const url = new URL(redirectUrl, location.origin);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
    } catch {
      return undefined;
    }
  }, [redirectUrl]);

  const wrongPracticeEnabled = project?.setting?.examSetting?.randomSurveyWrong === true;





  useEffect(() => {
    if (!project || copyEnabled) return;
    let systemValue: boolean | undefined;
    window.dispatchEvent(new CustomEvent(COPY_PROTECT_EVENT, { detail: { copyProtected: true } }));
    void fetch('/api/system', { credentials: 'include' })
      .then((res) => res.json())
      .then((body: { data?: { setting?: { copyProtected?: boolean } } }) => {
        systemValue = body?.data?.setting?.copyProtected !== false;
      })
      .catch(() => {

        systemValue = true;
      });
    return () => {
      window.dispatchEvent(
        new CustomEvent(COPY_PROTECT_EVENT, { detail: { copyProtected: systemValue ?? true } }),
      );
    };
  }, [project, copyEnabled]);


  useEffect(() => {
    if (!result || !safeRedirectUrl) {
      setRedirectLeft(null);
      return;
    }
    setRedirectLeft(3);
    const timer = window.setInterval(() => {
      setRedirectLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(timer);
          window.location.href = safeRedirectUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [result, safeRedirectUrl]);
  /** 填空/简答类在失焦后才判题 */
  const markPracticeTouched = (qId: string) => {
    setPracticeTouched((prev) => (prev[qId] ? prev : { ...prev, [qId]: true }));
  };

  const canGoBack = loggedIn === true;

  /** 从「我的答卷」里选一条：考试走现有成绩单路由，问卷走答题页的 answerId 路由 */
  const openPickedAnswer = (pickedId: string) => {
    setAnswersOpen(false);
    if (project?.mode === 'exam') navigate(`/s/${id}/exam-result/${pickedId}`);
    else navigate(`/s/${id}/${pickedId}`);
  };
  const flatQuestions = useMemo(() => {
    if (project?.survey?.children?.length) return flattenSchema(project.survey);
    return (project?.outline ?? []).map((item: PublicQuestionOutline, index) => {
      const schema: SurveySchema =
        questionCache[item.id] ?? {
          id: item.id,
          title: `第 ${item.number} 题`,
          type: item.type,
          attribute: { required: item.required },
          children: [],
        };
      return {
        id: item.id,
        title: schema.title || `第 ${item.number} 题`,
        type: item.type,
        schema,
        index,
        number: item.number,
      };
    });
  }, [project, questionCache]);

  /** 每题的跳转规则；旧 JSON / 损坏值解析失败时按未配置处理 */
  const jumpRules = useMemo(() => {
    const rules = new Map<string, JumpRuleConfig>();
    for (const question of flatQuestions) {
      const rule = parseJumpRule(question.schema.attribute?.jumpRule);
      if (rule) rules.set(question.id, rule);
    }
    return rules;
  }, [flatQuestions]);

  /** 每题的计算规则；来源含本题或与他人互相引用时跳过，避免来回写值 */
  const calculateRules = useMemo(() => {
    const byId = new Map<string, CalculateRuleConfig>();
    for (const question of flatQuestions) {
      const rule = parseCalculateRule(question.schema.attribute?.calculate);
      if (rule && rule.questionIds.length) byId.set(question.id, rule);
    }
    const dependsOn = (sourceId: string, targetId: string, seen: Set<string>): boolean => {
      if (sourceId === targetId) return true;
      if (seen.has(sourceId)) return false;
      seen.add(sourceId);
      const source = byId.get(sourceId);
      return source ? source.questionIds.some((id) => dependsOn(id, targetId, seen)) : false;
    };
    const list: { id: string; schema: SurveySchema; rule: CalculateRuleConfig }[] = [];
    for (const question of flatQuestions) {
      const rule = byId.get(question.id);
      if (!rule || !CALCULATE_TARGET_TYPES.has(question.type)) continue;
      const questionIds = rule.questionIds.filter((sourceId) => {
        const keep = !dependsOn(sourceId, question.id, new Set());
        if (!keep) console.warn('计算规则的来源题目存在自引用或循环引用，已跳过：' + sourceId);
        return keep;
      });
      if (!questionIds.length) continue;
      list.push({ id: question.id, schema: question.schema, rule: { ...rule, questionIds } });
    }
    return list;
  }, [flatQuestions]);

  const loadQuestion = useCallback(
    async (questionId: string): Promise<SurveySchema | undefined> => {
      if (!project) return undefined;
      const cached = questionCacheRef.current[questionId];
      if (cached) return cached;
      const pending = questionPendingRef.current.get(questionId);
      if (pending) return pending;
      setQuestionLoading((prev) => ({ ...prev, [questionId]: true }));
      const request = post<SurveySchema>('/api/public/question', {
        id,
        answerId,
        questionId,
        classToken,
        preview: previewMode,
      });
      questionPendingRef.current.set(questionId, request);
      try {
        const schema = await request;
        questionCacheRef.current = { ...questionCacheRef.current, [questionId]: schema };
        setQuestionCache(questionCacheRef.current);
        setQuestionErrors((prev) => ({ ...prev, [questionId]: false }));
        return schema;
      } catch (error) {
        setQuestionErrors((prev) => ({ ...prev, [questionId]: true }));
        message.error((error as Error).message || '题目加载失败，请重试');
        return undefined;
      } finally {
        questionPendingRef.current.delete(questionId);
        setQuestionLoading((prev) => ({ ...prev, [questionId]: false }));
      }
    },
    [id, answerId, project, message, previewMode],
  );

  const visibleQuestions = useMemo(() => {
    const list = flatQuestions.filter((q) => displays[q.id] !== false);
    if (!jumpEndId) return list;
    const cut = list.findIndex((q) => q.id === jumpEndId);
    return cut < 0 ? list : list.slice(0, cut + 1);
  }, [flatQuestions, displays, jumpEndId]);
  const total = visibleQuestions.length;
  const currentIndex = Math.min(page, Math.max(total - 1, 0));
  const currentQuestion = visibleQuestions[currentIndex];

  const orderOf = useMemo(() => new Map(flatQuestions.map((q, index) => [q.id, index])), [flatQuestions]);

  const ruleTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of flatQuestions) map[q.id] = q.title;
    return map;
  }, [flatQuestions]);

  /** 跳转结果：end 表示结束答题，targetId 是下一道可见题；规则不成立或目标不合法时退回默认下一题 */
  const jumpStep = (qId: string): { end: boolean; targetId?: string } => {
    const index = visibleQuestions.findIndex((q) => q.id === qId);
    const fallback = { end: false, targetId: index < 0 ? undefined : visibleQuestions[index + 1]?.id };
    const rule = jumpRules.get(qId);
    if (!rule) return fallback;
    const jump = evaluateJump(rule, { values: valuesRef.current, titles: ruleTitles });
    if (!jump) return fallback;
    if (jump.end) return { end: true };
    const from = orderOf.get(qId) ?? -1;
    const target = orderOf.get(jump.targetQuestionId ?? '') ?? -1;
    if (target <= from) return fallback;
    const next = visibleQuestions.find((q) => (orderOf.get(q.id) ?? -1) >= target);
    return next ? { end: false, targetId: next.id } : { end: true };
  };

  useEffect(() => {
    if (!project || result || !visibleQuestions.length) return;
    const targets = (onePage
      ? [visibleQuestions[currentIndex]?.id, visibleQuestions[currentIndex + 1]?.id].filter(
          (questionId): questionId is string => Boolean(questionId),
        )
      : visibleQuestions.map((question) => question.id))
      .filter((questionId) => !questionCacheRef.current[questionId] && !questionErrors[questionId]);
    void mapWithConcurrency(targets, onePage ? 2 : 6, async (questionId) => {
      await loadQuestion(questionId);
    });
  }, [project, result, onePage, currentIndex, visibleQuestions, questionErrors, loadQuestion]);

  /** 标记数量只按当前可见题算：被规则隐藏的题不显示在答题卡上，也不该计数 */
  const markedCount = useMemo(
    () => visibleQuestions.filter((q) => marks[q.id]).length,
    [visibleQuestions, marks],
  );
  /** 注入给 QuestionFrame 的标记能力：一页一题时由底部操作条负责，不给卡片加按钮 */
  const markApi = useMemo<QuestionMarkApi>(
    () => ({
      isMarked: (qId: string) => Boolean(marks[qId]),
      toggle: toggleMark,
    }),
    [marks, toggleMark],
  );
  const favoriteApi = useMemo<QuestionFavoriteApi>(
    () => ({
      enabled: loggedIn === true && project?.setting?.examSetting?.favoriteEnabled !== false,
      showInline: !onePage,
      isFavorite: (qId: string) => favorites.has(qId),
      toggleFavorite: (schema) => void toggleFavorite(schema),
    }),
    [loggedIn, project?.setting?.examSetting?.favoriteEnabled, onePage, favorites, toggleFavorite],
  );


  useEffect(() => {
    const rules: Record<string, string | undefined> = {};
    const titles: Record<string, string> = {};
    for (const q of flatQuestions) {
      titles[q.id] = q.title;
      if (q.schema.attribute?.visibleRule) rules[q.id] = q.schema.attribute.visibleRule;
    }
    setDisplays(evaluateVisible(rules, { values, titles }));
  }, [flatQuestions, values]);

  /** 来源题变化时重算：先算 next，只有目标值真的变了才写回，来源全为空时清空 */
  useEffect(() => {
    if (!calculateRules.length || result) return;
    setValues((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const item of calculateRules) {
        const computed = calculateValue(item.rule, (questionId) => prev[questionId]);
        const value = computed === undefined ? undefined : calculatedAnswer(item.schema, computed);
        if (value === undefined) {
          if (next[item.id] !== undefined) {
            delete next[item.id];
            changed = true;
          }
          continue;
        }
        if (JSON.stringify(next[item.id] ?? null) !== JSON.stringify(value)) {
          next[item.id] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [values, calculateRules, result]);

  const answered = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const q of visibleQuestions) map[q.id] = !isEmptyAnswer(values[q.id]);
    return map;
  }, [visibleQuestions, values]);

  const unansweredRequired = visibleQuestions.filter(
    (q) => q.schema.attribute?.required && !answered[q.id],
  );


  useEffect(() => {
    if (onePage) return;
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const rest = el.scrollHeight - el.scrollTop - el.clientHeight;
      setNearBottom(rest < 160);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [onePage, values, visibleQuestions.length]);

  /** 答题人姓名改动：同步写 localStorage，刷新/断网续答时不丢 */
  const changeAnswererName = (next: string) => {
    setAnswererName(next);
    try {
      localStorage.setItem(ANSWERER_NAME_KEY, next);
    } catch {
      // 隐私模式/配额满：存不下就算了，不影响交卷
    }
  };

  const changeFont = (value: number) => {
    setFontScale(value);
    localStorage.setItem(FONT_KEY, String(value));
  };

  /** A- / A+ 按档走，老年人不用精确拖滑块 */
  const bumpFont = (delta: number) => {
    const next = Math.min(FONT_MAX, Math.max(FONT_MIN, Number((fontScale + delta).toFixed(2))));
    changeFont(next);
  };

  /** 交卷用的整卷 schema */
  const resolveSubmissionSurvey = useCallback(async (): Promise<SurveySchema> => {
    const shell: SurveySchema = project?.survey ?? {
      id: project?.id ?? id,
      title: project?.name ?? '',
      type: 'Survey',
      attribute: {},
    };
    const cached = flatQuestions
      .map((question) => questionCacheRef.current[question.id])
      .filter((schema): schema is SurveySchema => Boolean(schema));
    if (cached.length === flatQuestions.length && cached.length > 0) {
      return { ...shell, children: cached };
    }
    try {
      const full = await post<PublicProjectView>('/api/public/loadProject', { id, answerId, classToken });
      if (full?.survey?.children?.length) return full.survey;
    } catch {
      // 拿不到整卷就退回缓存，交卷本身不受影响
    }
    return { ...shell, children: cached };
  }, [answerId, flatQuestions, id, project]);

  /** 提交答卷 */
  const doSubmit = async (mode: 'manual' | 'auto') => {
    if (!project || submittingRef.current) return;
    if (mode === 'auto' && submittedRef.current) return;


    const nameRequiredNow = Boolean(project.setting?.answerSetting?.answererNameRequired);
    if (mode === 'manual' && nameRequiredNow && loggedIn !== true) {


      const fromQuestion = nameQuestion ? answerPlainText(values[nameQuestion.id]).trim() : '';
      const fromInput = nameQuestion ? '' : answererName.trim();
      if (!fromQuestion && !fromInput) {
        message.warning(nameQuestion ? `请先填写「${nameQuestion.title}」再交卷` : '请先填写答题人姓名，再交卷');
        return;
      }
    }
    submittingRef.current = true;
    if (mode === 'auto') submittedRef.current = true;
    setSubmitting(true);
    try {

      const submissionSurvey = await resolveSubmissionSurvey();

      if (passMode && currentQuestion && passModePerSeconds && passTimesRef.current[currentQuestion.id] === undefined) {
        const left = Math.max(0, passDeadlineRef.current - Date.now());
        passTimesRef.current[currentQuestion.id] = Math.max(
          0,
          Math.min(passModePerSeconds, Math.round((passModePerSeconds * 1000 - left) / 1000)),
        );
      }
      const res = await post<PublicAnswerView>('/api/public/saveAnswer', {
        projectId: id,
        classToken,
        id: answerId,


        answererName: (nameQuestion
          ? answerPlainText(values[nameQuestion.id]).trim()
          : answererName.trim()) || undefined,
        answer: values,
        survey: submissionSurvey,

        freshAttempt: freshAttempt && !answerId,

        metaInfo: passMode
          ? { passModeTimes: passTimesRef.current, passModeTimeouts: passTimeoutsRef.current }
          : undefined,
      });
      if (res?.answerId) {
        setAnswerId(res.answerId);
        writeAnswerId(id, res.answerId);
      }
      submittedOnceRef.current = true;
      setResultSurvey(submissionSurvey);
      setResult(res);
      removeDraft(id);

      setMarks({});
      writeMarks(id, {});
      message.success('已提交');
    } catch (e) {
      submittedRef.current = false;
      if (e instanceof ApiError && e.code === ERROR_ANSWER_CHANGE_DISABLED) {

        message.error({
          content: '提交失败：这份问卷未开启「允许修改答案」，已有答卷无法再次保存。请联系问卷发布者。',
          duration: 5,
        });
      } else {
        message.error((e as Error).message || '提交失败，请稍后重试');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };





  const doSubmitRef = useRef(doSubmit);
  useEffect(() => {
    doSubmitRef.current = doSubmit;
  });


  const minSubmitMinutes = project?.setting?.examSetting?.minSubmitMinutes;

  const switchLimit = project?.setting?.examSetting?.maxSwitchScreenTimes;
  const minWaitLeft = () => {
    if (!minSubmitMinutes || !startedAt) return 0;
    return Math.max(0, startedAt + minSubmitMinutes * 60_000 - Date.now());
  };

  const minWaitMs =
    minSubmitMinutes && startedAt ? Math.max(0, startedAt + minSubmitMinutes * 60_000 - clock) : 0;
  useEffect(() => {
    if (!minSubmitMinutes) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [minSubmitMinutes]);


  useEffect(() => {
    const minutes = project?.setting?.examSetting?.maxSubmitMinutes;
    if (!minutes) return;
    const deadline = Date.now() + minutes * 60_000;
    const tick = () => {
      const left = deadline - Date.now();
      setRemainMs(left);
      if (left <= 0) {
        window.clearInterval(timer);
        if (!submittedRef.current) {
          message.warning('答题时间到，已自动交卷');
          void doSubmitRef.current('auto');
        }
      }
    };
    const timer = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.setting?.examSetting?.maxSubmitMinutes]);





  useEffect(() => {
    const limit = project?.setting?.examSetting?.maxSwitchScreenTimes;
    if (limit === undefined || limit === null) return;

    /** 达到上限：明确提示第几次切屏 → 自动交卷 → 锁定，后续 visibilitychange 不再重复触发 */
    const hitLimit = (times: number) => {
      setSwitchCount(times);
      setExamLocked(true);
      message.error({
        content: `第 ${times} 次切屏，已达「最多允许切屏 ${limit} 次」的限制，已按规则自动交卷。`,
        duration: 6,
      });
      void doSubmitRef.current('auto');
    };

    const onVisibility = () => {
      if (!document.hidden || submittedRef.current) return;
      void (async () => {
        let times = 0;
        try {
          const counted = await post<number>('/api/public/exam/switch-screen', { projectId: id, answerId });
          times = typeof counted === 'number' && counted > 0 ? counted : 0;
        } catch {
          times = 0;
        }
        if (!times) {

          setSwitchCount((prev) => {
            const next = prev + 1;
            if (next >= limit) hitLimit(next);
            else message.warning(`已切屏 ${next}/${limit} 次，达到将自动交卷`);
            return next;
          });
          return;
        }
        if (times >= limit) {
          hitLimit(times);
          return;
        }
        setSwitchCount(times);
        message.warning(`已切屏 ${times}/${limit} 次，达到将自动交卷`);
      })();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.setting?.examSetting?.maxSwitchScreenTimes, id, answerId]);

  /** 跳到指定题：一页一题切页，滚动模式滚到题目 */
  const goToQuestion = (qId: string) => {
    const index = visibleQuestions.findIndex((q) => q.id === qId);
    if (index < 0) return;
    if (onePage) {
      setPage(index);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.querySelector(`[data-qid="${qId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  /** 按跳转规则推进：命中结束答题则截断后续题，命中题目则由 goToQuestion 切页或滚动过去；没有下一道题时不动 */
  const advanceFrom = (qId: string) => {
    const step = jumpStep(qId);
    if (step.end) {
      setJumpEndId(qId);
      return;
    }
    if (step.targetId) goToQuestion(step.targetId);
  };

  /** 提交：必填没填直接拦下并跳过去；填全了才出二次确认 */
  const confirmSubmit = () => {
    if (previewMode) {
      message.info('预览模式不能交卷；要实际作答请用正式链接打开。');
      return;
    }

    if (examLocked) {
      message.error('本次作答已按规则自动交卷，不能再修改或重新提交');
      return;
    }

    const waitMs = minWaitLeft();
    if (waitMs > 0 && minSubmitMinutes) {
      const totalSec = Math.ceil(waitMs / 1000);
      const mm = Math.floor(totalSec / 60);
      const ss = totalSec % 60;
      message.warning({
        content: `需答满 ${minSubmitMinutes} 分钟才能交卷，还剩 ${mm} 分 ${String(ss).padStart(2, '0')} 秒`,
        duration: 4,
      });
      return;
    }



    if (submittedOnceRef.current && !project?.setting?.submittedSetting?.enableUpdate) {
      message.error('你已提交过这份问卷，且发布方未开启「允许修改答案」');
      return;
    }
    if (unansweredRequired.length) {
      const first = unansweredRequired[0];
      const no = visibleQuestions.findIndex((q) => q.id === first.id) + 1;
      message.error({
        content: `还有 ${unansweredRequired.length} 道必填题没填，已跳到第 ${no} 题「${first.title || first.type}」`,
        duration: 3,
      });
      goToQuestion(first.id);
      return;
    }
    modal.confirm({
      title: '确认提交这份答卷？',
      content: '提交后不可再修改（除非问卷允许修改答案）。',
      okText: '确认提交',
      cancelText: '再检查一下',

      onOk: () => doSubmit('manual'),
    });
  };


  const modifyAnswer = () => {
    submittedRef.current = false;
    setResultSurvey(undefined);
    setResult(undefined);
  };


  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/home');
  };

  const jumpTo = (index: number) => {
    window.clearTimeout(autoNextRef.current);
    if (passMode && index !== currentIndex) return;
    setJumpEndId(undefined);
    setPage(index);
    setSheetOpen(false);
    contentRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** 闯关模式切到指定题：翻页后回到页首 */
  const goToPage = (qId: string) => {
    const index = visibleQuestions.findIndex((q) => q.id === qId);
    if (index < 0) return;
    setPage(index);
    setSheetOpen(false);
    contentRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** 闯关模式推进：跳转规则优先，没有下一题就自动交卷 */
  const passAdvance = (questionId: string) => {
    const step = jumpStep(questionId);
    if (step.end) {
      setJumpEndId(questionId);
      return;
    }
    if (step.targetId) {
      goToPage(step.targetId);
      return;
    }
    void doSubmitRef.current('auto');
  };

  /** 闯关模式：结算当前题（答完 / 超时）→ 记录用时 → 前进；已经是最后一题则自动交卷 */
  const finishPassQuestion = (timedOut: boolean) => {
    if (!passMode || !currentQuestion) return;
    const questionId = currentQuestion.id;
    if (passSettledRef.current === questionId) return;
    passSettledRef.current = questionId;
    const limit = passModePerSeconds ?? 0;
    const left = Math.max(0, passDeadlineRef.current - Date.now());

    const answeredNow = !isEmptyAnswer(valuesRef.current[questionId]);
    const isTimeout = timedOut && !answeredNow;

    const spent =
      isTimeout || !limit
        ? limit
        : Math.max(0, Math.min(limit - 1, Math.floor((limit * 1000 - left) / 1000)));
    if (limit > 0) passTimesRef.current[questionId] = spent;
    if (isTimeout) {
      passTimeoutsRef.current = [...passTimeoutsRef.current, questionId];
      message.warning(
        currentIndex >= total - 1 ? '本题作答时间到，已自动交卷' : '本题作答时间到，已锁定并跳到下一题',
      );
      if (exerciseMode) {
        setPassLockedQuestion(questionId);
        window.setTimeout(() => {
          setPassLockedQuestion(null);
          passAdvance(questionId);
        }, 1600);
        return;
      }
    }
    passAdvance(questionId);
  };


  useEffect(() => {
    if (!passMode || !passModePerSeconds || !currentQuestion) return;
    const limitMs = passModePerSeconds * 1000;
    passDeadlineRef.current = Date.now() + limitMs;
    passSettledRef.current = null;
    setPassRemainMs(limitMs);
    const timer = window.setInterval(() => {
      const left = passDeadlineRef.current - Date.now();
      setPassRemainMs(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(timer);
        finishPassQuestion(true);
      }
    }, 250);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passMode, passModePerSeconds, currentQuestion?.id]);

  const advanceAfterAnswer = (qId: string) => {
    if (!autoNext || examLocked) return;
    advanceFrom(qId);
  };

  const scheduleAutoNext = (qId: string, delay: number) => {
    if (!autoNext) return;
    window.clearTimeout(autoNextRef.current);
    autoNextRef.current = window.setTimeout(() => {
      if (isEmptyAnswer(valuesRef.current[qId])) return;
      advanceAfterAnswer(qId);
    }, delay);
  };

  const handleAutoNextBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!autoNext) return;
    const related = event.relatedTarget as HTMLElement | null;
    if (related?.closest('button, a, input, textarea, select, [role="button"]')) return;
    const qid = (event.target as HTMLElement).closest('[data-qid]')?.getAttribute('data-qid');
    if (!qid || isEmptyAnswer(valuesRef.current[qid])) return;
    advanceAfterAnswer(qid);
  };

  /** 答题写入：改答案后解除「按跳转规则结束」的截断，重新求值 */
  const handleChange = (qId: string, v: AnswerValue) => {
    setJumpEndId(undefined);
    setValues((prev) => ({ ...prev, [qId]: v }));
    if (!passMode) {
      if (autoNext && !isEmptyAnswer(v)) {
        const question = visibleQuestions.find((item) => item.id === qId);
        if (question && (!onePage || qId === currentQuestion?.id)) {
          if (question.type === 'Radio' || question.type === 'Judge' || question.type === 'Select') {
            scheduleAutoNext(qId, 350);
          } else if (question.type === 'Checkbox') {
            scheduleAutoNext(qId, 900);
          }
        }
      }
      return;
    }
    const type = currentQuestion?.type;
    const singleChoice = type === 'Radio' || type === 'Judge' || type === 'Select';
    if (qId === currentQuestion?.id && singleChoice && !isEmptyAnswer(v)) {
      window.setTimeout(() => finishPassQuestion(false), exerciseMode ? 1200 : 350);
    }
  };

  /** 闯关模式：填空题失焦时，最后一题也自动交卷（非最后一题等用户点「下一题」） */
  const handlePassBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!passMode || !currentQuestion) return;
    const target = event.target as HTMLElement | null;
    const qid = target?.closest('[data-qid]')?.getAttribute('data-qid');
    if (qid !== currentQuestion.id || currentIndex < total - 1) return;
    if (isEmptyAnswer(values[currentQuestion.id])) return;
    finishPassQuestion(false);
  };

  const Sheet = (
    <div className="sk-sheet">
      {visibleQuestions.map((q, i) => {
        const cls = [
          answered[q.id] ? 'answered' : '',
          i === currentIndex && onePage ? 'current' : '',
          !answered[q.id] && q.schema.attribute?.required ? 'missing' : '',
          marks[q.id] ? 'marked' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={q.id}
            className={cls}
            onClick={() => jumpTo(i)}
            disabled={passMode && i !== currentIndex}
            title={passMode && i !== currentIndex ? `${q.title}（闯关模式不能跳题）` : q.title}
          >
            {i + 1}
            {marks[q.id] && <span className="sk-sheet-mark" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (fatal) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: 16 }}>
        <Alert type="warning" showIcon title="无法打开这份问卷" description={fatal} />
      </div>
    );
  }

  if (needPassword) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto', padding: 16 }}>
        <div style={{ border: '1px solid var(--bp-line)', background: 'var(--bp-panel)', padding: 24 }}>
          <div className="bp-title" style={{ fontSize: 14, marginBottom: 12 }}>
            需要密码
          </div>
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入答题密码"
            onPressEnter={submitPassword}
          />
          <Button type="primary" block style={{ marginTop: 12 }} onClick={submitPassword}>
            进入
          </Button>
        </div>
      </div>
    );
  }

  if (needLogin) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: 16 }}>
        <Alert
          type="info"
          showIcon
          title="需要登录后作答"
          description="这份问卷要求登录，请先登录再回到这个链接。"
          action={
            <Button size="small" type="primary" href={`/user/login?redirect=${encodeURIComponent(location.pathname)}`}>
              去登录
            </Button>
          }
        />
      </div>
    );
  }

  if (!project) return null;

  if (result) {
    const html = project.submittedHtml || project.setting?.submittedSetting?.contentHtml;
    const showAnalysis = Boolean(project.setting?.submittedSetting?.answerAnalysis);


    const analysisSurvey = resultSurvey ?? project.survey;
    const analysisViews =
      showAnalysis && analysisSurvey
        ? flattenSchema(analysisSurvey).map((q) => buildView(q, values[q.id]))
        : [];

    return (
      <div style={{ maxWidth: 780, margin: '48px auto', padding: 16 }}>
        <AnonymousAnswersDrawer
          open={answersOpen}
          projectId={id}
          projectName={project.name}
          loggedIn={loggedIn === true}
          onClose={() => setAnswersOpen(false)}
          onPick={openPickedAnswer}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, color: 'var(--bp-orange)' }}>✓</div>
          <div className="bp-title" style={{ fontSize: 18, margin: '12px 0' }}>
            已提交
          </div>
          {html ? (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
          ) : (
            <div style={{ color: 'var(--bp-text-soft)', fontSize: 13 }}>感谢你的填写。</div>
          )}
          {typeof result.examScore === 'number' && (
            <div style={{ marginTop: 12, fontSize: 15 }}>
              得分：<span style={{ color: 'var(--bp-orange)' }}>{result.examScore}</span>
            </div>
          )}
          {project.setting?.submittedSetting?.enableUpdate && (
            <Button style={{ marginTop: 16, marginRight: 8 }} onClick={modifyAnswer}>
              修改答案
            </Button>
          )}
          <Button style={{ marginTop: 16, marginRight: 8 }} onClick={() => setAnswersOpen(true)}>
            我的答卷
          </Button>

          {wrongPracticeEnabled && (
            <Button
              style={{ marginTop: 16 }}
              onClick={() =>
                navigate(
                  `/repo/book/practice?scope=project&projectId=${encodeURIComponent(id)}&projectName=${encodeURIComponent(project.name ?? '')}`,
                )
              }
            >
              练本场错题
            </Button>
          )}

          {safeRedirectUrl && redirectLeft !== null && (
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--bp-text-soft)' }}>
              <div>
                {redirectLeft > 0 ? `${redirectLeft} 秒后自动前往发布方设置的页面…` : '正在跳转…'}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    window.location.href = safeRedirectUrl;
                  }}
                >
                  立即前往
                </Button>
                <Button size="small" onClick={() => setRedirectLeft(null)}>
                  留在本页
                </Button>
              </div>
            </div>
          )}
        </div>

        {analysisViews.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div
              className="bp-title"
              style={{ fontSize: 12, marginBottom: 10, letterSpacing: '0.16em' }}
            >
              ANALYSIS / 答案解析
            </div>
            {analysisViews.map((view) => (
              <QuestionCard key={view.q.id} view={view} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const loadedVisibleSchemas = visibleQuestions
    .map((question) => questionCache[question.id])
    .filter((schema): schema is SurveySchema => Boolean(schema));
  const currentSchema = currentQuestion ? questionCache[currentQuestion.id] : undefined;
  const schemaForCanvas: SurveySchema = {
    ...(project.survey ?? { id: project.id, title: project.name ?? '', type: 'Survey', attribute: {} }),
    children: onePage ? (currentSchema ? [currentSchema] : []) : loadedVisibleSchemas,
  };
  const loadedCount = visibleQuestions.filter((question) => Boolean(questionCache[question.id])).length;
  const missingVisibleQuestions = visibleQuestions.filter((question) => !questionCache[question.id]);
  const loadingVisibleQuestions = missingVisibleQuestions.filter((question) => questionLoading[question.id]);
  const failedVisibleQuestions = missingVisibleQuestions.filter((question) => questionErrors[question.id]);

  const showSubmit = onePage ? currentIndex >= total - 1 : nearBottom;

  const jumpEnded = Boolean(jumpEndId) && visibleQuestions.some((question) => question.id === jumpEndId);

  const nameRequired = Boolean(project?.setting?.answerSetting?.answererNameRequired);

  const nameQuestion = flatQuestions.find(
    (q) => (q.type === 'FillBlank' || q.type === 'Textarea') && /姓名|名字/.test(q.title ?? ''),
  );






  const showAnswererName = !nameQuestion && loggedIn !== true;

  return (
    <div
      className="sk-answer"
      style={{
        minHeight: '100vh',
        paddingBottom: 96,
        backgroundImage: project.survey?.attribute?.backgroundImage
          ? `url(${project.survey.attribute.backgroundImage})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {project.survey?.attribute?.headerImage && (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '12px 16px 0' }}>
          <img
            src={project.survey.attribute.headerImage}
            alt="页眉"
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
          />
        </div>
      )}
      <AnonymousAnswersDrawer
        open={answersOpen}
        projectId={id}
        projectName={project.name}
        loggedIn={loggedIn === true}
        onClose={() => setAnswersOpen(false)}
        onPick={openPickedAnswer}
      />


      {!showQuestionNumber && <style>{'.sk-answer .bp-tag{display:none!important}'}</style>}
      {previewMode && (
        <div
          style={{
            maxWidth: 1080,
            margin: '10px auto 0',
            padding: '8px 14px',
            border: '1px dashed var(--bp-orange)',
            background: 'var(--bp-orange-weak)',
            color: 'var(--bp-orange)',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          预览模式：这是发布方视角的效果预览，作答不会保存，也不能交卷。
        </div>
      )}


      <div className="sk-answer-top">
        {canGoBack && (
          <Button
            size="small"
            className="sk-answer-back"
            icon={<ArrowLeftOutlined />}
            onClick={goBack}
            title="返回上一级"
            aria-label="返回上一级"
          >
            <span className="sk-answer-back-label">返回上一级</span>
          </Button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>SURVEY / 答题</div>
          <div
            className="bp-title"
            style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {project.name}
          </div>
        </div>
        <Button
          size="small"
          className="sk-answer-back"
          icon={<FileTextOutlined />}
          onClick={() => setAnswersOpen(true)}
          title="我的答卷"
          aria-label="我的答卷"
        >
          <span className="sk-answer-back-label">我的答卷</span>
        </Button>
        {remainMs !== undefined && (
          <span
            title="剩余答题时间"
            style={{
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
              color: remainMs < 60_000 ? 'var(--bp-orange)' : 'var(--bp-text-soft)',
              letterSpacing: '0.05em',
            }}
          >
            {(() => {
              const total = Math.max(0, Math.floor(remainMs / 1000));
              return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
            })()}
          </span>
        )}
        {switchCount > 0 && (
          <span style={{ fontSize: 11, color: 'var(--bp-orange)' }} title="已切屏次数">
            切屏 {switchCount}
            {switchLimit !== undefined && switchLimit !== null ? ` / ${switchLimit}` : ''}
          </span>
        )}
        {minWaitMs > 0 && (
          <span
            title={`需答满 ${minSubmitMinutes} 分钟才能交卷`}
            style={{
              fontSize: 11,
              color: 'var(--bp-text-soft)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.03em',
            }}
          >
            最早交卷{' '}
            {(() => {
              const total = Math.ceil(minWaitMs / 1000);
              return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
            })()}
          </span>
        )}
        {passMode && passModePerSeconds ? (
          <span
            title="本题剩余作答时间（到点自动锁题并进入下一题）"
            style={{
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
              color: passRemainMs <= 10_000 ? 'var(--bp-orange)' : 'var(--bp-text-soft)',
              letterSpacing: '0.05em',
            }}
          >
            本题{' '}
            {(() => {
              const total = Math.max(0, Math.ceil(passRemainMs / 1000));
              return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
            })()}
          </span>
        ) : null}
        <div className="sk-font-ctl">
          <Button size="small" className="sk-font-btn" onClick={() => bumpFont(-0.15)}>
            A-
          </Button>
          <Slider
            min={FONT_MIN}
            max={FONT_MAX}
            step={0.05}
            value={fontScale}
            onChange={changeFont}
            className="sk-font-slider"
            ariaLabelForHandle="字号"
            tooltip={{ formatter: (v) => `${Number(v).toFixed(2)}×` }}
          />
          <Button size="small" className="sk-font-btn" onClick={() => bumpFont(0.15)}>
            A+
          </Button>
        </div>
        {showSheet && (
          <Button size="small" icon={<MenuOutlined />} onClick={() => setSheetOpen(true)} className="sk-answer-sheet-btn">
            答题卡
          </Button>
        )}
      </div>



      {showAnswererName && (
      <div
        className="sk-answer-name"
        style={{
          maxWidth: 1080,
          margin: '10px auto 0',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--bp-text-soft)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          答题人
          {nameRequired ? <span style={{ color: 'var(--bp-orange)', marginLeft: 2 }}>*</span> : null}
        </span>
        <Input
          size="small"
          value={answererName}
          maxLength={64}
          style={{ maxWidth: 260 }}
          placeholder={nameRequired ? '请填写姓名（必填）' : '姓名（选填，会显示在成绩单上）'}
          aria-label="答题人姓名"
          onChange={(e) => changeAnswererName(e.target.value)}
        />
        {!nameRequired && (
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
            留空也可以；登录账号会自动用账号姓名
          </span>
        )}
      </div>
      )}


      {showProgress && (
        <div className="sk-answer-progress">
          <div
            style={{
              width: `${
                onePage
                  ? ((currentIndex + 1) / Math.max(total, 1)) * 100
                  : (Object.values(answered).filter(Boolean).length / Math.max(total, 1)) * 100
              }%`,
            }}
          />
        </div>
      )}


      {passMode && (
        <div style={{ maxWidth: 1080, margin: '12px auto 0', padding: '0 16px' }}>
          <div
            style={{
              border: '1px dashed var(--bp-orange-line)',
              borderRadius: 0,
              padding: '6px 10px',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--bp-text-soft)',
            }}
          >
            闯关模式：每题限时{passModePerSeconds ? ` ${passModePerSeconds} 秒` : ''}
            ，到点自动锁题并进入下一题；超时题交卷时按 0 分计，已答过的题不能回头修改。
          </div>
        </div>
      )}


      {examLocked && (
        <div style={{ maxWidth: 1080, margin: '12px auto 0', padding: '0 16px' }}>
          <Alert
            type="error"
            showIcon
            title="切屏次数已达上限，已自动交卷"
            description="本次作答已按考试规则自动提交，不能再修改答案。如需重考，请联系发布方。"
          />
        </div>
      )}

      {jumpEnded && (
        <div style={{ maxWidth: 1080, margin: '12px auto 0', padding: '0 16px' }}>
          <Alert type="info" showIcon title="已按跳转规则结束，后面的题不再显示，可直接交卷" />
        </div>
      )}

      <div
        className="sk-answer-layout"
        ref={contentRef}
        style={examLocked ? { pointerEvents: 'none', opacity: 0.55 } : undefined}
      >

        {showSheet && (
          <aside className="sk-answer-sheet-side">
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginBottom: 8 }}>
            ANSWER SHEET / 答题卡
            {markedCount > 0 && (
              <div className="sk-sheet-marked-count">已标记 {markedCount} 题</div>
            )}
          </div>
          {Sheet}
          <div style={{ marginTop: 10, fontSize: 10, color: 'var(--bp-hint)', lineHeight: 1.8 }}>
            已答 {Object.values(answered).filter(Boolean).length} / {total}
            {unansweredRequired.length ? (
              <div style={{ color: 'var(--bp-orange)' }}>必填未答 {unansweredRequired.length}</div>
            ) : null}
          </div>
        </aside>
        )}

        <div style={{ flex: 1, minWidth: 0, zoom: fontScale }}>
          {onePage && (
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
              第 {currentIndex + 1} / {total} 题
            </div>
          )}

          {(onePage ? !currentSchema : missingVisibleQuestions.length > 0) ? (
            <div style={{ minHeight: 220, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', color: 'var(--bp-text-soft)' }}>
              {(onePage
                ? Boolean(currentQuestion && questionLoading[currentQuestion.id])
                : loadingVisibleQuestions.length > 0) ? (
                <>
                  <Spin />
                  <span>{onePage ? '正在加载题目…' : `正在加载题目 ${loadedCount} / ${total}`}</span>
                </>
              ) : (
                <>
                  <span>题目加载失败，请检查网络后重试。</span>
                  <Button
                    onClick={() => {
                      const retryIds = (onePage && currentQuestion
                        ? [currentQuestion.id]
                        : failedVisibleQuestions.map((question) => question.id));
                      setQuestionErrors((prev) => {
                        const next = { ...prev };
                        retryIds.forEach((questionId) => delete next[questionId]);
                        return next;
                      });
                      void Promise.all(retryIds.map((questionId) => loadQuestion(questionId)));
                    }}
                  >
                    重试
                  </Button>
                </>
              )}
            </div>
          ) : exerciseMode ? (

            <QuestionFavoriteContext.Provider value={favoriteApi}>
            <QuestionMarkContext.Provider value={onePage ? null : markApi}>
              {(onePage ? (currentSchema ? [currentSchema] : []) : loadedVisibleSchemas).map((schema, index) => {
                const questionIndex = onePage
                  ? currentIndex
                  : visibleQuestions.findIndex((question) => question.id === schema.id);
                const locked = passLockedQuestion === schema.id;
                return (
                  <div
                    key={schema.id}
                    onBlur={(event) => {
                      markPracticeTouched(schema.id);

                      if (passMode) handlePassBlur(event);
                    }}
                    style={locked ? { pointerEvents: 'none', opacity: 0.7 } : undefined}
                  >
                    <SchemaRenderer
                      schema={{
                        ...(project.survey ?? { id: project.id, title: project.name ?? '', type: 'Survey', attribute: {} }),
                        children: [schema],
                      }}
                      values={values}
                      onChange={handleChange}
                      mode="answer"
                      displays={displays}
                      numberOffset={questionIndex < 0 ? index : questionIndex}
                    />
                    <PracticeFeedback
                      schema={schema}
                      value={values[schema.id]}
                      touched={Boolean(practiceTouched[schema.id])}
                      timedOut={locked}
                    />
                  </div>
                );
              })}
            </QuestionMarkContext.Provider>
            </QuestionFavoriteContext.Provider>
          ) : (
            <QuestionFavoriteContext.Provider value={favoriteApi}>
            <QuestionMarkContext.Provider value={onePage ? null : markApi}>
              <div
                onBlur={(event) => {
                  if (passMode) handlePassBlur(event);
                  handleAutoNextBlur(event);
                }}
              >
                <SchemaRenderer
                  schema={schemaForCanvas}
                  values={values}
                  onChange={handleChange}
                  mode="answer"
                  displays={displays}
                  numberOffset={onePage ? currentIndex : 0}
                />
              </div>
            </QuestionMarkContext.Provider>
            </QuestionFavoriteContext.Provider>
          )}
          {onePage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,


                flexWrap: 'wrap',
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px dashed var(--bp-line)',
              }}
            >
              <Button
                size="large"
                disabled={passMode || currentIndex <= 0}
                onClick={() => jumpTo(currentIndex - 1)}
                title={passMode ? '闯关模式不能回头修改已答过的题' : undefined}
              >
                上一题
              </Button>
              {currentQuestion && (
                <Button
                  size="large"
                  className={marks[currentQuestion.id] ? 'sk-mark-btn marked' : 'sk-mark-btn'}
                  icon={marks[currentQuestion.id] ? <FlagFilled /> : <FlagOutlined />}
                  onClick={() => toggleMark(currentQuestion.id)}
                >
                  {marks[currentQuestion.id] ? '已标记' : '标记'}
                </Button>
              )}
              {currentQuestion && favoriteApi.enabled && (
                <Button
                  size="large"
                  className={favorites.has(currentQuestion.id) ? 'sk-mark-btn marked' : 'sk-mark-btn'}
                  icon={favorites.has(currentQuestion.id) ? <StarFilled /> : <StarOutlined />}
                  onClick={() => void toggleFavorite(currentQuestion.schema)}
                >
                  {favorites.has(currentQuestion.id) ? '已收藏' : '收藏'}
                </Button>
              )}
              <div style={{ flex: '1 0 56px', textAlign: 'center', fontSize: 12, color: 'var(--bp-text-soft)' }}>
                {currentIndex + 1} / {total}
              </div>
              {currentIndex >= total - 1 ? (
                <Button type="primary" size="large" loading={submitting} onClick={confirmSubmit}>
                  提交答卷
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  onClick={() => {
                    if (passMode) finishPassQuestion(false);
                    else if (currentQuestion) advanceFrom(currentQuestion.id);
                  }}
                >
                  下一题
                </Button>
              )}
            </div>
          )}

          {!onePage && (
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bp-hint)', fontSize: 11 }}>
              到底了 · 检查无误后再提交
            </div>
          )}
        </div>
      </div>


      <Drawer
        title={markedCount > 0 ? `答题卡 · 已标记 ${markedCount} 题` : '答题卡'}
        placement="right"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        size={320}
      >
        {Sheet}
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--bp-text-soft)' }}>
          已答 {Object.values(answered).filter(Boolean).length} / {total}
        </div>
      </Drawer>


      {!onePage && (
        <div className="sk-answer-bar" style={examLocked ? { pointerEvents: 'none', opacity: 0.55 } : undefined}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              共 {total} 题 · 已答 {Object.values(answered).filter(Boolean).length}
              {unansweredRequired.length ? ` · 必填未答 ${unansweredRequired.length}` : ''}
            </span>
            <div style={{ flex: 1 }} />
            {examLocked ? (
              <Button size="large" disabled>
                已自动交卷
              </Button>
            ) : showSubmit ? (
              <Button type="primary" size="large" loading={submitting} onClick={confirmSubmit}>
                提交
              </Button>
            ) : (
              <Button size="large" disabled>
                继续答题…
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
