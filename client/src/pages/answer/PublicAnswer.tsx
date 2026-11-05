import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App, Button, Collapse, Drawer, Input, message, Slider, Spin } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { post } from '../../api';
import type { AnswerValue } from '../../renderer/types';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import { isEmptyAnswer } from '../../schema/empty';
import { flattenSchema, type FlatQuestion } from '../../schema/flatten';
import { evaluateVisible } from '../../schema/rules/engine';
import type { PublicAnswerView, PublicProjectView } from '../../schema/project';
import type { SurveySchema } from '../../schema/types';
import '../../styles/answer.css';

const CHOICE_SET = new Set(['Radio', 'Checkbox', 'Select', 'Judge']);

/** 把答案值转成可读文本（结果页看答案解析用） */
function formatValue(q: FlatQuestion, value: AnswerValue): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value !== 'object') return String(value);
  const record = value as Record<string, unknown>;
  if (CHOICE_SET.has(q.type)) {
    return Object.keys(record)
      .map((id) => q.schema.dataSource?.find((o) => o.value === id)?.label ?? id)
      .join('、');
  }
  return Object.values(record)
    .map((v) => (v === true ? '是' : String(v)))
    .join('，');
}

function formFieldIds(p?: PublicProjectView): string[] {
  return (p?.survey?.children ?? []).map((c) => c.id);
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

/** 匿名答题者没有账号，用本地保存的 answerId 当凭证：下次打开同一问卷可以续答或回看 */
const answerKey = (projectId: string) => `sk-answer-${projectId}`;

/**
 * 未提交草稿：后端 tempSaveAnswer 要求「已登录 + 随机卷 cookie」才生效，
 * 匿名场景靠本地草稿续答（发布设置 autoSave 关掉时不存）。
 */
const draftKey = (projectId: string) => `sk-draft-${projectId}`;

export default function PublicAnswer() {
  const { id = '', answerId: routeAnswerId } = useParams();
  const { modal } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<PublicProjectView>();
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [displays, setDisplays] = useState<Record<string, boolean>>({});
  const [needPassword, setNeedPassword] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [fatal, setFatal] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PublicAnswerView>();
  const [answerId, setAnswerId] = useState<string>();

  const [fontScale, setFontScale] = useState<number>(() => Number(localStorage.getItem(FONT_KEY)) || 1);
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);
  const [remainMs, setRemainMs] = useState<number>();
  const [switchCount, setSwitchCount] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);
  /** 远程暂存用：避免 answerId 变化触发暂存 effect 重跑 */
  const answerIdRef = useRef<string | undefined>(undefined);

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
    if (data.answerId) {
      setAnswerId(data.answerId);
      localStorage.setItem(answerKey(id), data.answerId);
    }
    if (data.answer) setValues(data.answer as Record<string, AnswerValue>);
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    setFatal(undefined);
    try {
      // URL 里带 answerId（成绩单/回看链接）优先，其次用本地保存的匿名凭证
      const savedId = routeAnswerId ?? localStorage.getItem(answerKey(id)) ?? undefined;
      applyProject(await post<PublicProjectView>('/api/public/loadProject', { id, answerId: savedId }));
    } catch (e) {
      setFatal((e as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, routeAnswerId, applyProject]);

  /** answerId state 变化时同步给 ref（暂存 effect 只读 ref，不重跑） */
  useEffect(() => {
    answerIdRef.current = answerId;
  }, [answerId]);

  /** 打开时如果本地有未提交草稿、且这次不是回看已提交答卷，就回填 */
  useEffect(() => {
    if (!project || result) return;
    if (project.answer) return;
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { values?: Record<string, AnswerValue> };
      if (draft.values && Object.keys(draft.values).length > 0) {
        setValues(draft.values);
        message.info('已恢复上次未提交的答案');
      }
    } catch {
      localStorage.removeItem(draftKey(id));
    }
  }, [project, id, result]);

  /** 自动暂存到本地（防抖 600ms），提交成功后清除 */
  useEffect(() => {
    if (!project || result) return;
    if (project.setting?.answerSetting?.autoSave === false) return;
    if (Object.keys(values).length === 0) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftKey(id), JSON.stringify({ values, at: Date.now() }));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [values, project, result, id]);

  /**
   * 远程暂存（跨设备续答）：把未提交答案作为草稿存到后端（tempSave=0），
   * 拿到 answerId 后写进 localStorage，换设备时用链接里的 answerId 就能接上。
   */
  useEffect(() => {
    if (!project || result) return;
    if (project.setting?.answerSetting?.autoSave === false) return;
    if (Object.keys(values).length === 0) return;
    const timer = window.setTimeout(async () => {
      try {
        const res = await post<{ answerId?: string }>('/api/public/saveAnswer', {
          projectId: id,
          id: answerIdRef.current,
          answer: values,
          tempAnswer: values,
          tempSave: 0,
          survey: project.survey,
        });
        if (res?.answerId && res.answerId !== answerIdRef.current) {
          answerIdRef.current = res.answerId;
          setAnswerId(res.answerId);
          localStorage.setItem(answerKey(id), res.answerId);
        }
      } catch {
        // 暂存失败不打扰用户，本地草稿仍然在
      }
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [values, project, result, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitPassword = async () => {
    setLoading(true);
    try {
      applyProject(
        await post<PublicProjectView>('/api/public/validateProject', {
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

  const onePage = Boolean(project?.setting?.answerSetting?.onePageOneQuestion);
  /** 这两项来自发布设置的「答题体验」，旧版是开关，默认都开 */
  const showProgress = project?.setting?.answerSetting?.progressBar !== false;
  const showSheet = project?.setting?.answerSetting?.answerSheetVisible !== false;
  const flatQuestions = useMemo(() => (project?.survey ? flattenSchema(project.survey) : []), [project]);
  const visibleQuestions = useMemo(
    () => flatQuestions.filter((q) => displays[q.id] !== false),
    [flatQuestions, displays],
  );
  const total = visibleQuestions.length;
  const currentIndex = Math.min(page, Math.max(total - 1, 0));
  const currentQuestion = visibleQuestions[currentIndex];

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

  const doSubmit = async () => {
    if (!project || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await post<PublicAnswerView>('/api/public/saveAnswer', {
        projectId: id,
        id: answerId,
        answer: values,
        survey: project.survey,
      });
      if (res?.answerId) {
        setAnswerId(res.answerId);
        localStorage.setItem(answerKey(id), res.answerId);
      }
      setResult(res);
      localStorage.removeItem(draftKey(id));
      message.success('已提交');
    } catch (e) {
      submittedRef.current = false;
      message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

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
          void doSubmit();
        }
      }
    };
    const timer = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.setting?.examSetting?.maxSubmitMinutes]);

  /** 切屏检测：超过允许次数直接交卷 */
  useEffect(() => {
    const limit = project?.setting?.examSetting?.maxSwitchScreenTimes;
    if (limit === undefined || limit === null) return;
    const onVisibility = () => {
      if (!document.hidden || submittedRef.current) return;
      setSwitchCount((prev) => {
        const next = prev + 1;
        if (next > limit) {
          message.error('切屏次数超限，已自动交卷');
          void doSubmit();
        } else {
          message.warning(`已切屏 ${next}/${limit} 次，超过将自动交卷`);
        }
        return next;
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.setting?.examSetting?.maxSwitchScreenTimes]);

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
    // 匿名续答：本地已有 answerId 且问卷不允许修改时，后端会抛 4020，这里提前拦住
    if (answerId && !project?.setting?.submittedSetting?.enableUpdate) {
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
      onOk: doSubmit,
    });
  };

  const jumpTo = (index: number) => {
    setPage(index);
    setSheetOpen(false);
    contentRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const Sheet = (
    <div className="sk-sheet">
      {visibleQuestions.map((q, i) => {
        const cls = [
          answered[q.id] ? 'answered' : '',
          i === currentIndex && onePage ? 'current' : '',
          !answered[q.id] && q.schema.attribute?.required ? 'missing' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button key={q.id} className={cls} onClick={() => jumpTo(i)} title={q.title}>
            {i + 1}
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
        <div style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.6)', padding: 24 }}>
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
    const explanations = showAnalysis && project.survey
      ? flattenSchema(project.survey).map((q) => ({
          id: q.id,
          title: q.title || q.type,
          mine: formatValue(q, values[q.id]),
          correct: q.schema.attribute?.examCorrectAnswer,
          analysis: q.schema.attribute?.examAnalysis,
        }))
      : [];

    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, color: 'var(--bp-orange)' }}>✓</div>
          <div className="bp-title" style={{ fontSize: 18, margin: '12px 0' }}>
            已提交
          </div>
          {html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div style={{ color: 'var(--bp-text-soft)', fontSize: 13 }}>感谢你的填写。</div>
          )}
          {typeof result.examScore === 'number' && (
            <div style={{ marginTop: 12, fontSize: 15 }}>
              得分：<span style={{ color: 'var(--bp-orange)' }}>{result.examScore}</span>
            </div>
          )}
          {project.setting?.submittedSetting?.enableUpdate && (
            <Button style={{ marginTop: 16 }} onClick={() => setResult(undefined)}>
              修改答案
            </Button>
          )}
        </div>

        {explanations.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginBottom: 8 }}>
              ANALYSIS / 答案解析
            </div>
            <Collapse
              size="small"
              items={explanations.map((row) => ({
                key: row.id,
                label: <span style={{ fontSize: 12 }}>{row.title}</span>,
                children: (
                  <div style={{ fontSize: 12, lineHeight: 1.9 }}>
                    <div>你的答案：{row.mine || '—'}</div>
                    {row.correct && <div style={{ color: 'var(--bp-orange)' }}>正确答案：{row.correct}</div>}
                    {row.analysis && <div style={{ color: 'var(--bp-text-soft)' }}>解析：{row.analysis}</div>}
                  </div>
                ),
              }))}
            />
          </div>
        )}
      </div>
    );
  }

  const schemaForCanvas: SurveySchema = onePage
    ? {
        id: 'page',
        title: '',
        type: 'Survey',
        attribute: {},
        children: currentQuestion ? [currentQuestion.schema] : [],
      }
    : project.survey ?? { id: 'root', title: '', type: 'Survey', attribute: {}, children: [] };

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
      {/* 顶部：标题 + 字号 + 答题卡入口 */}
      <div className="sk-answer-top">
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
          </span>
        )}
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

      <div className="sk-answer-layout" ref={contentRef}>
        {/* 桌面端常驻答题卡 */}
        {showSheet && (
          <aside className="sk-answer-sheet-side">
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginBottom: 8 }}>
            ANSWER SHEET / 答题卡
          </div>
          {Sheet}
          <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(160,196,232,0.6)', lineHeight: 1.8 }}>
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
          <SchemaRenderer
            schema={schemaForCanvas}
            values={values}
            onChange={(qId, v) => setValues((prev) => ({ ...prev, [qId]: v }))}
            mode="answer"
            displays={displays}
            numberOffset={onePage ? currentIndex : 0}
          />
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
              <Button size="large" disabled={currentIndex <= 0} onClick={() => jumpTo(currentIndex - 1)}>
                上一题
              </Button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--bp-text-soft)' }}>
                {currentIndex + 1} / {total}
              </div>
              {currentIndex >= total - 1 ? (
                <Button type="primary" size="large" loading={submitting} onClick={confirmSubmit}>
                  提交答卷
                </Button>
              ) : (
                <Button type="primary" size="large" onClick={() => jumpTo(currentIndex + 1)}>
                  下一题
                </Button>
              )}
            </div>
          )}

          {!onePage && (
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(160,196,232,0.5)', fontSize: 11 }}>
              到底了 · 检查无误后再提交
            </div>
          )}
        </div>
      </div>

      {/* 移动端答题卡 */}
      <Drawer
        title="答题卡"
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
        <div className="sk-answer-bar">
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              共 {total} 题 · 已答 {Object.values(answered).filter(Boolean).length}
              {unansweredRequired.length ? ` · 必填未答 ${unansweredRequired.length}` : ''}
            </span>
            <div style={{ flex: 1 }} />
            {showSubmit ? (
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
