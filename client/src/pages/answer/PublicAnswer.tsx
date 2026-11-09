import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { Alert, App, Button, Drawer, Input, message, Slider, Spin } from 'antd';
import { ArrowLeftOutlined, FlagFilled, FlagOutlined, MenuOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ApiError, post } from '../../api';
import { COPY_PROTECT_EVENT } from '../../components/CopyGuard';
import type { AnswerValue } from '../../renderer/types';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import { QuestionMarkContext, type QuestionMarkApi } from '../../renderer/questions/shared';
import { isEmptyAnswer } from '../../schema/empty';
import { flattenSchema } from '../../schema/flatten';
import { evaluateVisible } from '../../schema/rules/engine';
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
import '../../styles/answer.css';

/** 后端 ErrorCode.AnswerChangeDisabled = 4020：发布方没开「允许修改答案」时拒绝修改已有答卷 */
const ERROR_ANSWER_CHANGE_DISABLED = 4020;
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

/** 字号范围：0.9（小）到 2.0（巨大），滑块直接拖 */
const FONT_MIN = 0.9;
const FONT_MAX = 2;
const FONT_KEY = 'sk-font-scale';

/** 从整棵树里摘出单道题（一页一题时用） */
export function pickQuestionNode(root: SurveySchema, id: string): SurveySchema | undefined {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const hit = pickQuestionNode(child, id);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * 答题本地存储（草稿 / 匿名 answerId / 标记）统一放在 utils/answerStorage：
 * - 登出时调用 `clearAnswerStorage()` 一键清干净（公用电脑隐私，前端 A 审计 A-DATA-1）；
 * - 草稿带 projectId 归属校验 + 7 天有效期，读不到就按没有处理；
 * - 所有读写都做异常兜底，隐私模式/配额满不影响答题。
 */

/** 探测登录态（决定要不要显示「返回上一级」）。
 * 不能用 auth/permissions 的 loadAuthorities()：它内部走 http()，未登录的 401 会触发全局
 * onUnauthorized，直接把匿名答题者跳到 /user/login，等于毁了匿名答题入口。
 * 这里自己 fetch，401 / 非 JSON / 网络错误一律按匿名处理，静默不打扰。
 */
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

/** 练习模式判题涉及的选择题类型：答案值形如 { 选项id: true } */
const PRACTICE_CHOICE_TYPES: ReadonlySet<string> = new Set(['Radio', 'Checkbox', 'Select', 'Judge']);

/** 练习模式：已选中的选项 id（值形如 { 选项id: true }） */
function pickedOptionIds(value: AnswerValue): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, picked]) => picked === true || picked === 1 || (typeof picked === 'string' && picked !== ''))
    .map(([optionId]) => optionId);
}

/** 练习模式：标准答案文本。选择题记在选项节点的 examCorrectAnswer 上（与题库编辑页/后端一致） */
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

/**
 * 练习模式即时判题：true=对 / false=错 / null=没作答或没有标准答案。
 * 多空填空、矩阵这类结构复杂的题不在这里判，避免判错。
 */
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

/**
 * 练习模式：题下即时判题反馈（✓/✕ + 正确答案 + 解析），只读，不写 answer。
 * timedOut=true 时是「练习 × 闯关」组合下本题到点被锁定的展示：即使没作答也把正确答案与解析给出来。
 */
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
  // 填空/简答类要等失焦再判，否则打字过程中一路飘红；超时锁定则直接展示
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
  /** 「再考一次」= ?fresh=1：清掉本地凭证、从空答案开始，提交时让后端新建一条答卷，不覆盖历史成绩 */
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
  /** 登录态：null = 还在查（此时不渲染返回入口，避免匿名答题者看到按钮闪一下） */
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const [fontScale, setFontScale] = useState<number>(() => Number(localStorage.getItem(FONT_KEY)) || 1);
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);
  const [remainMs, setRemainMs] = useState<number>();
  const [switchCount, setSwitchCount] = useState(0);
  /** 本次作答开始时刻（用于「最短交卷时间」倒计时） */
  const [startedAt, setStartedAt] = useState<number>();
  /** 每秒滴答：驱动「最早交卷」倒计时显示 */
  const [clock, setClock] = useState(() => Date.now());
  /** 触发规则锁定（切屏超限自动交卷）后禁止继续作答 */
  const [examLocked, setExamLocked] = useState(false);
  /** 闯关模式：本题剩余毫秒（顶部倒计时） */
  const [passRemainMs, setPassRemainMs] = useState(0);
  /** 练习 × 闯关组合：本题已超时并按 0 分锁定（先给判题/答案/解析 1.6s，再强制进入下一题） */
  const [passLockedQuestion, setPassLockedQuestion] = useState<string | null>(null);
  /** 「完成跳转」倒计时剩余秒数；null = 不跳转（未设置 / 已点「留在本页」） */
  const [redirectLeft, setRedirectLeft] = useState<number | null>(null);
  /** 闯关模式：每题用时（秒），questionId → seconds；交卷时随 metaInfo 上报，由服务端裁决 */
  const passTimesRef = useRef<Record<string, number>>({});
  /** 闯关模式：被判超时的题目 id（交卷时上报） */
  const passTimeoutsRef = useRef<string[]>([]);
  /** 闯关模式：当前题截止时刻（毫秒时间戳） */
  const passDeadlineRef = useRef(0);
  /** 闯关模式：当前题是否已结算（答题完成/超时），避免重复推进 */
  const passSettledRef = useRef<string | null>(null);
  /** 最新答案快照：倒计时回调里读 values 会是旧闭包，必须用 ref 判断「到点时是否其实已作答」 */
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  });
  /** 练习模式：哪些题已经失焦过（填空类只在失焦后才判，避免打字过程中一路飘红） */
  const [practiceTouched, setPracticeTouched] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  /** 只服务于「限时 / 切屏超限」自动交卷去重：同一次答题里自动交卷只能触发一次。手动提交不许被它挡 */
  const submittedRef = useRef(false);
  /** 提交请求在途：state 在闭包里会过期，用 ref 防连点重复提交 */
  const submittingRef = useRef(false);
  /** 本次会话里已经成功提交过一次：只在发布方没开「允许修改答案」时用来提前提示 */
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
    // 新一轮作答从这一刻开始计「最短交卷时间」；重新加载问卷视为重新开始
    setStartedAt(Date.now());
    setExamLocked(false);
    if (freshAttempt) {
      // 新一轮作答：后端也可能回填上一份答卷/切屏次数，这里一律丢弃，从空答案开始
      setAnswerId(undefined);
      setValues({});
      setSwitchCount(0);
      return;
    }
    if (data.answerId) {
      setAnswerId(data.answerId);
      writeAnswerId(id, data.answerId);
    }
    if (data.answer) setValues(data.answer as Record<string, AnswerValue>);
    // 切屏次数从后端 metaInfo 恢复：刷新页面不再清零（字段用局部断言，避免动共用的 schema 类型文件）
    const meta = (data as PublicProjectView & { metaInfo?: { switchScreenTimes?: number } }).metaInfo;
    setSwitchCount(meta?.switchScreenTimes ?? 0);
  }, [id, freshAttempt]);

  const load = useCallback(async () => {
    // 重新拉问卷 = 重新开始一轮答题，把上一轮的提交标记全部复位
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
    // 闯关模式：新一轮的清零，避免把上一轮的用时/超时带到本次
    passTimesRef.current = {};
    passTimeoutsRef.current = [];
    passSettledRef.current = null;
    setPassLockedQuestion(null);
    try {
      if (freshAttempt) {
        // 「再考一次」：本地凭证与草稿都属于上一轮，先清掉，别把旧 answerId 发给后端
        removeAnswerId(id);
        removeDraft(id);
      }
      // URL 里带 answerId（成绩单/回看链接）优先，其次用本地保存的匿名凭证
      const savedId = freshAttempt ? undefined : (routeAnswerId ?? readAnswerId(id) ?? undefined);
      applyProject(await post<PublicProjectView>('/api/public/projectOutline', { id, answerId: savedId }));
    } catch (e) {
      setFatal((e as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, routeAnswerId, applyProject, freshAttempt]);

  /** 打开时如果本地有未提交草稿、且这次不是回看已提交答卷，就回填 */
  useEffect(() => {
    if (!project || result) return;
    if (project.answer) return;
    // 归属（projectId）+ 有效期（7 天）都在 utils 里校验过；不匹配会被删掉、这里拿到 undefined
    const draft = readDraft(id);
    const draftValues = draft?.values as Record<string, AnswerValue> | undefined;
    if (draftValues && Object.keys(draftValues).length > 0) {
      setValues(draftValues);
      message.info('已恢复上次未提交的答案');
    }
  }, [project, id, result]);

  /** 自动暂存到本地（防抖 600ms），提交成功后清除 */
  useEffect(() => {
    if (!project || result) return;
    if (project.setting?.answerSetting?.autoSave === false) return;
    if (Object.keys(values).length === 0) return;
    const timer = window.setTimeout(() => {
      writeDraft(id, values);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [values, project, result, id]);

  /**
   * 远程暂存（草稿）：必须走 /api/public/tempSaveAnswer，不能走 saveAnswer。
   *
   * 走 saveAnswer 会真的创建/占用一条答卷并下发 answerId，后续「正式提交」就会被后端当成
   * 「修改已有答卷」，遇到没开「允许修改答案」的问卷直接 4020 —— 也就是首次提交莫名失败。
   * tempSaveAnswer 只把草稿挂在随机卷 cookie 上，不产生 answerId，语义才对。
   *
   * 该接口要求已登录才生效（匿名场景靠本地草稿续答），返回 void，因此这里不再回写 answerId。
   */
  useEffect(() => {
    if (!project || result) return;
    if (project.setting?.answerSetting?.autoSave === false) return;
    if (Object.keys(values).length === 0) return;
    const timer = window.setTimeout(async () => {
      try {
        await post('/api/public/tempSaveAnswer', {
          projectId: id,
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

  /**
   * 登出清理：注册一次性监听，BasicLayout 登出时 `dispatchEvent(new Event('sk:logout'))`
   * （或直接调用 utils 里的 `clearAnswerStorage()`）就会清掉草稿/answerId/标记，
   * 避免公用电脑下一位用户看到上一位的答案（前端 A 审计 A-DATA-1）。
   */
  useEffect(() => installAnswerStorageCleanup(), []);

  /**
   * 「返回上一级」只给已登录用户：匿名答题者是从分享链接直接进来的，没有可回的上一级。
   * 查询中（loggedIn === null）不渲染按钮，避免闪一下。
   */
  useEffect(() => {
    let alive = true;
    void fetchLoggedIn().then((ok) => {
      if (alive) setLoggedIn(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * 标记每次变化都写回本地；清空时把 key 一起删掉，别留空对象。
   * 只在用户操作时写（不放 effect 里）：路由从一个问卷切到另一个时，effect 会拿上一份的标记覆盖新项目。
   */
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

  /** 同一个组件实例换了 projectId（SPA 内跳另一份问卷）时重新读标记，别串档 */
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

  /** 练习模式：选完即判（后端在该模式下会下发 examCorrectAnswer / examAnalysis） */
  const exerciseMode = project?.setting?.examSetting?.exerciseMode === true;
  /** 这两项来自发布设置的「答题体验」，旧版是开关，默认都开 */
  const showProgress = project?.setting?.answerSetting?.progressBar !== false;
  const showSheet = project?.setting?.answerSetting?.answerSheetVisible !== false;
  /** 闯关模式：每题限时 + 不可回头；超时由服务端在交卷时按每题用时裁决并计 0 分 */
  const passMode = project?.setting?.examSetting?.passMode === true;
  const passModePerSeconds = project?.setting?.examSetting?.passModePerSeconds;
  /** 闯关模式天然是一页一题（只能看到当前题，也回不了头），这里强制按一页一题渲染 */
  const onePage = Boolean(project?.setting?.answerSetting?.onePageOneQuestion) || passMode;
  /** 发布设置「显示题目序号」（answerSetting.questionNumber，默认开）：关闭时答题页不渲染题号徽标 */
  const showQuestionNumber = project?.setting?.answerSetting?.questionNumber !== false;
  /** 发布设置「允许复制题目」（answerSetting.copyEnabled，默认开）：关闭时联动全局 CopyGuard */
  const copyEnabled = project?.setting?.answerSetting?.copyEnabled !== false;
  /** 发布设置「完成跳转」（submittedSetting.redirectUrl）：只接受 http/https，避免 javascript: 注入 */
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
  /** 发布设置「错题练习」（examSetting.randomSurveyWrong）：交卷页给「练本场错题」入口 */
  const wrongPracticeEnabled = project?.setting?.examSetting?.randomSurveyWrong === true;

  /**
   * 「允许复制题目」关闭时：借用全局 CopyGuard（components/CopyGuard.tsx 暴露的 COPY_PROTECT_EVENT）
   * 打开本页的复制保护，离开页面时按系统级设置恢复 —— 不在答题页重复实现一套拦截逻辑。
   */
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
        // 查不到系统设置就按「开启」恢复（宁可多保护，不要意外放开）
        systemValue = true;
      });
    return () => {
      window.dispatchEvent(
        new CustomEvent(COPY_PROTECT_EVENT, { detail: { copyProtected: systemValue ?? true } }),
      );
    };
  }, [project, copyEnabled]);

  /** 「完成跳转」：交卷成功后倒计时 3 秒自动前往发布方设置的地址，可取消或立即前往 */
  useEffect(() => {
    if (!result || !safeRedirectUrl) {
      setRedirectLeft(null);
      return;
    }
    setRedirectLeft(3);
    const timer = window.setInterval(() => {
      setRedirectLeft((prev) => {
        if (prev === null) return null; // 用户点了「留在本页」
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
  /** 已登录才给返回入口；null（查询中）按未登录处理，按钮不会闪 */
  const canGoBack = loggedIn === true;
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
    [id, answerId, project, message],
  );

  const visibleQuestions = useMemo(
    () => flatQuestions.filter((q) => displays[q.id] !== false),
    [flatQuestions, displays],
  );
  const total = visibleQuestions.length;
  const currentIndex = Math.min(page, Math.max(total - 1, 0));
  const currentQuestion = visibleQuestions[currentIndex];

  // 一页一题模式仅加载当前题并预取下一题；瀑布流是用户显式切换后才并发加载全部题目。
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

  // 规则显隐：答题态必须应用，隐藏题的答案不参与校验与提交
  useEffect(() => {
    const rules: Record<string, string | undefined> = {};
    const titles: Record<string, string> = {};
    for (const q of flatQuestions) {
      titles[q.id] = q.title;
      if (q.schema.attribute?.visibleRule) rules[q.id] = q.schema.attribute.visibleRule;
    }
    setDisplays(evaluateVisible(rules, { values, titles }));
  }, [flatQuestions, values]);

  const answered = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const q of visibleQuestions) map[q.id] = !isEmptyAnswer(values[q.id]);
    return map;
  }, [visibleQuestions, values]);

  const unansweredRequired = visibleQuestions.filter(
    (q) => q.schema.attribute?.required && !answered[q.id],
  );

  // 滚动模式下，滚到接近底部才露出提交按钮，避免中途误触
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

  const changeFont = (value: number) => {
    setFontScale(value);
    localStorage.setItem(FONT_KEY, String(value));
  };

  /** A- / A+ 按档走，老年人不用精确拖滑块 */
  const bumpFont = (delta: number) => {
    const next = Math.min(FONT_MAX, Math.max(FONT_MIN, Number((fontScale + delta).toFixed(2))));
    changeFont(next);
  };

  /**
   * 交卷用的整卷 schema。
   *
   * 原来每道题发一次 `/api/public/question`（100 题 = 100 个请求，任一失败整单交不上）。
   * 现在优先用 `/api/public/loadProject` **一次**拿回整棵题树（该接口返回的就是完整 survey），
   * 失败时退回本地已缓存的题目，**不阻塞交卷**：判分与校验都在服务端用自己的 project schema
   * 做（见 SurveyServiceImpl.saveAnswer），前端传的 survey 只作为「本次作答的题目快照」。
   */
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
      const full = await post<PublicProjectView>('/api/public/loadProject', { id, answerId });
      if (full?.survey?.children?.length) return full.survey;
    } catch {
      // 拿不到整卷就退回缓存，交卷本身不受影响
    }
    return { ...shell, children: cached };
  }, [answerId, flatQuestions, id, project]);

  /**
   * 提交答卷。
   * - manual：用户点「提交」。回过一次答题态（点过「修改答案」）后必须还能再交，所以绝不能被
   *   submittedRef 静默挡住，只靠 submittingRef 防连点。
   * - auto：限时到点 / 切屏超限自动交卷，submittedRef 保证同一轮只触发一次。
   * 只有请求成功才保留标记；失败一律回滚，用户改完答案还能再交。
   */
  const doSubmit = async (mode: 'manual' | 'auto') => {
    if (!project || submittingRef.current) return;
    if (mode === 'auto' && submittedRef.current) return;
    submittingRef.current = true;
    if (mode === 'auto') submittedRef.current = true;
    setSubmitting(true);
    try {
      // 一次拿整卷（见 resolveSubmissionSurvey 注释）；拿不到也不阻塞交卷
      const submissionSurvey = await resolveSubmissionSurvey();
      // 闯关模式：交卷前补记当前题用时（手动交卷时还没走 finishPassQuestion）
      if (passMode && currentQuestion && passModePerSeconds && passTimesRef.current[currentQuestion.id] === undefined) {
        const left = Math.max(0, passDeadlineRef.current - Date.now());
        passTimesRef.current[currentQuestion.id] = Math.max(
          0,
          Math.min(passModePerSeconds, Math.round((passModePerSeconds * 1000 - left) / 1000)),
        );
      }
      const res = await post<PublicAnswerView>('/api/public/saveAnswer', {
        projectId: id,
        id: answerId,
        answer: values,
        survey: submissionSurvey,
        // 新一轮（再考一次）且还没有本轮答卷：要求后端新建记录，不要更新上一份
        freshAttempt: freshAttempt && !answerId,
        // 闯关模式：每题用时 + 超时清单，交卷时由服务端裁决超时题（计 0 分）
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
      // 标记是答题过程中的自查工具，交卷后连同本地存储一起清空
      setMarks({});
      writeMarks(id, {});
      message.success('已提交');
    } catch (e) {
      submittedRef.current = false;
      if (e instanceof ApiError && e.code === ERROR_ANSWER_CHANGE_DISABLED) {
        // 后端拒绝修改已有答卷：给明确中文提示，停在答题页，不白屏
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

  /**
   * 定时器 / 切屏回调里必须用「最新」的 doSubmit：这些 effect 的依赖只有设置项，
   * 闭包里捕获的 values 可能还是空的，自动交卷会交出一份空白卷。用 ref 指向每次渲染的最新版本。
   */
  const doSubmitRef = useRef(doSubmit);
  useEffect(() => {
    doSubmitRef.current = doSubmit;
  });

  /** 最短交卷时间：距离「最早可交卷」还剩多少毫秒（按当前时间实算，不依赖滴答 state） */
  const minSubmitMinutes = project?.setting?.examSetting?.minSubmitMinutes;
  /** 允许的切屏次数上限（仅用于顶部展示，触发逻辑在下面的 effect 里） */
  const switchLimit = project?.setting?.examSetting?.maxSwitchScreenTimes;
  const minWaitLeft = () => {
    if (!minSubmitMinutes || !startedAt) return 0;
    return Math.max(0, startedAt + minSubmitMinutes * 60_000 - Date.now());
  };
  /** 同一份剩余时间，供顶部倒计时展示（随 clock 每秒刷新） */
  const minWaitMs =
    minSubmitMinutes && startedAt ? Math.max(0, startedAt + minSubmitMinutes * 60_000 - clock) : 0;
  useEffect(() => {
    if (!minSubmitMinutes) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [minSubmitMinutes]);

  /** 考试限时：到点自动交卷 */
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

  /**
   * 切屏检测：计数落库（刷新不丢）。累计次数**达到** maxSwitchScreenTimes 即自动交卷并锁定作答。
   * 触发条件：后端返回（或本地兜底）的累计次数 >= maxSwitchScreenTimes，例如设 3 次 → 第 3 次切屏触发。
   */
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
          // 后端还没有可挂钩的答卷（未暂存/未提交）或网络失败：本次作答内先本地兜底
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

  /** 提交：必填没填直接拦下并跳过去；填全了才出二次确认 */
  const confirmSubmit = () => {
    // 切屏超限已自动交卷：锁定后不再接受手动提交
    if (examLocked) {
      message.error('本次作答已按规则自动交卷，不能再修改或重新提交');
      return;
    }
    // 最短交卷时间：未答满时只提示还剩多久，到点后这里自然放行（不伪造时间，按真实时钟算）
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
    // 只有「本次会话里确实交成功过」且发布方没开「允许修改答案」才提前拦。
    // 不能拿 answerId 判断：匿名续答的草稿也会拿到 answerId，那样会把首次提交误拦掉；
    // 刷新页面后 submittedOnceRef 是 false，交给后端判定，4020 由 doSubmit 给出明确提示。
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
      // 包一层：onOk 会收到鼠标事件，直接传 doSubmit 会被当成 auto 模式
      onOk: () => doSubmit('manual'),
    });
  };

  /** 「修改答案」回到答题态：必须复位自动交卷标记，否则第二轮提交被静默挡掉 */
  const modifyAnswer = () => {
    submittedRef.current = false;
    setResultSurvey(undefined);
    setResult(undefined);
  };

  /** 返回上一级：站内有可回退的历史就回退，直接打开答题链接时兜底回主界面 */
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/home');
  };

  const jumpTo = (index: number) => {
    // 闯关模式：只能停在当前题，不许跳题/回头（避免绕开每题限时）
    if (passMode && index !== currentIndex) return;
    setPage(index);
    setSheetOpen(false);
    contentRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * 闯关模式：结算当前题（答完 / 超时）→ 记录用时 → 前进；已经是最后一题则自动交卷。
   * 每道题只结算一次（passSettledRef），避免「答题自动前进」和「到点超时」打架。
   *
   * 练习 × 闯关组合（优先级：闯关的时间约束 > 练习的即时反馈）：
   * 到点不立刻跳走，而是先把本题锁成只读、显示「本题超时（按 0 分计）」+ 正确答案 + 解析，
   * 1.6s 后再强制进入下一题（最后一题则自动交卷）——既满足闯关的强制推进，也保留练习的反馈。
   */
  const finishPassQuestion = (timedOut: boolean) => {
    if (!passMode || !currentQuestion) return;
    const questionId = currentQuestion.id;
    if (passSettledRef.current === questionId) return;
    passSettledRef.current = questionId;
    const limit = passModePerSeconds ?? 0;
    const left = Math.max(0, passDeadlineRef.current - Date.now());
    // 到点时如果其实已经作答（只是自动推进被延迟到 1.2s），按“答完”处理，不能误判超时
    const answeredNow = !isEmptyAnswer(valuesRef.current[questionId]);
    const isTimeout = timedOut && !answeredNow;
    // 答完的题按实际用时（向下取整，最大 limit-1）；超时题直接记满限时
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
        // 组合模式：先锁定展示（判题块 + 超时标记），1.6s 后再强制推进
        setPassLockedQuestion(questionId);
        window.setTimeout(() => {
          setPassLockedQuestion(null);
          if (currentIndex >= total - 1) {
            void doSubmitRef.current('auto');
            return;
          }
          setPage(currentIndex + 1);
          setSheetOpen(false);
          contentRef.current?.scrollTo({ top: 0 });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1600);
        return;
      }
    }
    if (currentIndex >= total - 1) {
      // 最后一题：答完或超时都自动交卷（闯关模式没有「再检查一下」这一步）
      void doSubmitRef.current('auto');
      return;
    }
    setPage(currentIndex + 1);
    setSheetOpen(false);
    contentRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** 闯关模式：给当前题开本题倒计时，到点自动结算并进入下一题 */
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

  /**
   * 答题写入。闯关模式下单选/判断/下拉选完即代表这题完成：记时并自动进下一题；
   * 多选/矩阵/填空交给用户点「下一题」，避免选到一半就被推进下一题。
   * 练习 × 闯关组合下把自动推进延后到 1.2s，先让学员看到 ✓/✕ 与解析（闯关的时间约束仍然优先）。
   */
  const handleChange = (qId: string, v: AnswerValue) => {
    setValues((prev) => ({ ...prev, [qId]: v }));
    if (!passMode) return;
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
        <Alert type="warning" showIcon message="无法打开这份问卷" description={fatal} />
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
          message="需要登录后作答"
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
    // 复用成绩单页的解析卡片：选项、正确答案、我的答案、对错标记、解析，一套 UI 两处使用，
    // 避免这里再维护一份「折叠 + 只有题干和我的答案」的旧样式。
    const analysisSurvey = resultSurvey ?? project.survey;
    const analysisViews =
      showAnalysis && analysisSurvey
        ? flattenSchema(analysisSurvey).map((q) => buildView(q, values[q.id]))
        : [];

    return (
      <div style={{ maxWidth: 780, margin: '48px auto', padding: 16 }}>
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
          {/* 错题练习（examSetting.randomSurveyWrong）：交卷后给「练本场错题」入口，练习页由 repo/book/practice 负责 */}
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
          {/* 完成跳转（submittedSetting.redirectUrl）：倒计时 3 秒自动前往，可取消或立即前往 */}
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
      {/* 发布设置「显示题目序号」（answerSetting.questionNumber）关闭：答题页隐藏题号徽标。
          徽标由共用组件 QuestionFrame 渲染（.bp-tag），这里用页面级样式隐藏，不影响设计器/预览。 */}
      {!showQuestionNumber && <style>{'.sk-answer .bp-tag{display:none!important}'}</style>}
      {/* 顶部：返回（仅登录用户）+ 标题 + 字号 + 答题卡入口 */}
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

      {/* 进度条：一页一题看页码，滚动模式看已答比例 */}
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

      {/* 闯关模式：每题限时、不可回头；超时题交卷时由服务端计 0 分 */}
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

      {/* 切屏超限已自动交卷：锁定作答区，不能再改答案 */}
      {examLocked && (
        <div style={{ maxWidth: 1080, margin: '12px auto 0', padding: '0 16px' }}>
          <Alert
            type="error"
            showIcon
            message="切屏次数已达上限，已自动交卷"
            description="本次作答已按考试规则自动提交，不能再修改答案。如需重考，请联系发布方。"
          />
        </div>
      )}

      <div
        className="sk-answer-layout"
        ref={contentRef}
        style={examLocked ? { pointerEvents: 'none', opacity: 0.55 } : undefined}
      >
        {/* 桌面端常驻答题卡 */}
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
          {/* 一页一题仅显示当前已取到的 schema；瀑布流在切换后逐题并发加载。 */}
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
            /* 练习模式：一题一块渲染，题下紧跟即时判题反馈；失焦用于填空类延后判定 */
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
                      // 练习 × 闯关：最后一题失焦也走闯关的结算（最后一题自动交卷）
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
          ) : (
            <QuestionMarkContext.Provider value={onePage ? null : markApi}>
              <div onBlur={passMode ? handlePassBlur : undefined}>
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
          )}
          {onePage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
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
              <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--bp-text-soft)' }}>
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
                  onClick={() => (passMode ? finishPassQuestion(false) : jumpTo(currentIndex + 1))}
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

      {/* 移动端答题卡 */}
      <Drawer
        title={markedCount > 0 ? `答题卡 · 已标记 ${markedCount} 题` : '答题卡'}
        placement="right"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        width={320}
      >
        {Sheet}
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--bp-text-soft)' }}>
          已答 {Object.values(answered).filter(Boolean).length} / {total}
        </div>
      </Drawer>

      {/* 底部操作栏：只在一屏滚动模式下出现。一页一题的导航按钮在题目下方 */}
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
