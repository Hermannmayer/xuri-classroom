import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button, Empty, message, Segmented, Spin, Tag } from 'antd';
import { ArrowLeftOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getWithPagination, post } from '../../api';
import ZoomControl from '../../components/ZoomControl';
import type { AnswerValue } from '../../renderer/types';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import { isEmptyAnswer } from '../../schema/empty';
import { flattenSchema } from '../../schema/flatten';
import type { SurveySchema } from '../../schema/types';

/** 与 TemplateView 对齐 */
interface TemplateView {
  id: string;
  name?: string;
  questionType?: string;
  template?: SurveySchema;
}

const FONT_KEY = 'sk-font-scale';
const PRACTICE_TYPES = ['Radio', 'Checkbox', 'Judge', 'FillBlank', 'Textarea'] as const;
type Layout = 'single' | 'scroll';

/**
 * 懒加载每页题数：首屏 10 题，瀑布流滚到底（或点「加载更多」）再追加 10 题。
 * 题库动辄几百题，一次性拉全量会让首屏发卡，也方便脚本把整个题库抓走。
 */
const PAGE_SIZE = 10;

interface PracticeProgress {
  repoId: string;
  repoName: string;
  root: SurveySchema;
  values: Record<string, AnswerValue>;
  index: number;
  layout: Layout;
  updatedAt: number;
  /** 懒加载：题库总题数与「是否还有下一页」。旧进度没有这两个字段，按「已全部加载」恢复 */
  total?: number;
  paged?: boolean;
}

const practiceKey = (repoId: string) => `practice:${repoId}`;

function parseCounts(value: string | null): { type: string; count: number }[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => {
      const [type, count] = part.split(':');
      return { type: String(type || '').trim(), count: Number(count) };
    })
    .filter(
      (item) =>
        (PRACTICE_TYPES as readonly string[]).includes(item.type) &&
        Number.isFinite(item.count) &&
        item.count > 0,
    );
}

/** 题目统一挂在根节点的 children 上，根节点只是个容器 */
function buildRoot(id: string, title: string, children: SurveySchema[]): SurveySchema {
  return { id, title, type: 'Survey', attribute: {}, children };
}

/** 拍平题目列表：只用来数「已加载几题」和取第 N 题的 id，题号与渲染无关 */
function flatOf(items: SurveySchema[]): ReturnType<typeof flattenSchema> {
  return flattenSchema(buildRoot('practice-flat', '', items));
}

/** 模板行 → 可直接渲染的题目 schema（行里没有 template 时用行上的字段兜底） */
function rowToQuestion(row: TemplateView): SurveySchema {
  return (
    row.template ?? {
      id: row.id,
      title: row.name ?? '',
      type: (row.questionType ?? 'Radio') as SurveySchema['type'],
      attribute: {},
      children: [],
    }
  );
}

/** 答题卡序号样式：未加载灰色虚线（可点，点了先取题）、已答蓝底、当前题橙边 */
function sheetButtonStyle(state: {
  answered: boolean;
  isCurrent: boolean;
  loaded: boolean;
  loading: boolean;
}): CSSProperties {
  const base: CSSProperties = {
    height: 34,
    border: '1px solid var(--bp-line-soft)',
    background: 'transparent',
    color: 'var(--bp-text-soft)',
    fontFamily: 'inherit',
    fontSize: 12,
    cursor: 'pointer',
    borderRadius: 0,
  };
  if (!state.loaded) {
    return { ...base, borderStyle: 'dashed', color: 'var(--bp-hint)', opacity: 0.55 };
  }
  const style: CSSProperties = { ...base };
  if (state.answered) {
    style.background = 'var(--bp-answered-bg)';
    style.borderColor = 'var(--bp-blue)';
    style.color = 'var(--bp-answered-text)';
  }
  if (state.isCurrent) {
    style.borderColor = 'var(--bp-orange)';
    style.color = 'var(--bp-orange)';
  }
  if (state.loading) {
    style.opacity = 0.5;
    style.cursor = 'progress';
  }
  return style;
}

export default function Practice() {
  const { repoId = '' } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const repoName =
    (location.state as { repoName?: string } | null)?.repoName || '题库练习';
  const mode = search.get('mode') || 'full';

  /** 已加载的题目（始终是整份题库的前缀，按题库顺序追加） */
  const [questions, setQuestions] = useState<SurveySchema[]>([]);
  /** 题库总题数（后端分页返回的 total） */
  const [total, setTotal] = useState(0);
  /** 是否支持继续向后分页追加：随机练习、旧进度是一次性给全的，不再分页 */
  const [paged, setPaged] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /** 正在为跳题补加载的序号（0 基），用于按钮禁用与提示 */
  const [jumpingTo, setJumpingTo] = useState<number>();
  /** 瀑布流里补加载完成后要滚动到的题目 id */
  const [scrollTarget, setScrollTarget] = useState<string>();
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<Layout>('single');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem(FONT_KEY)) || 1);
  const [initialized, setInitialized] = useState(false);

  /** 异步流程（滚动追加、跳题补加载、提交前补齐）要读最新值，state 闭包会过期，这里镜像一份 */
  const questionsRef = useRef<SurveySchema[]>([]);
  const totalRef = useRef(0);
  const pagedRef = useRef(false);
  const loadingMoreRef = useRef(false);
  /** 跳题补加载是异步的，连点会重复触发，这里串行化 */
  const jumpLockRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const commitQuestions = useCallback((next: SurveySchema[]) => {
    questionsRef.current = next;
    setQuestions(next);
  }, []);

  const resetPool = useCallback(() => {
    questionsRef.current = [];
    totalRef.current = 0;
    pagedRef.current = false;
    setQuestions([]);
    setTotal(0);
    setPaged(false);
  }, []);

  /** 取一页题目；返回本页行数与题库总题数 */
  const fetchPage = useCallback(
    async (page: number) => {
      const res = await getWithPagination<TemplateView>('/api/template/list', {
        repoId,
        current: page,
        pageSize: PAGE_SIZE,
      });
      return { rows: res.data ?? [], total: res.total ?? 0 };
    },
    [repoId],
  );

  /** 追加下一页（按 id 去重）；返回本次是否真的追加到新题 */
  const loadMore = useCallback(async (): Promise<boolean> => {
    if (loadingMoreRef.current) return false;
    if (!pagedRef.current || questionsRef.current.length >= totalRef.current) return false;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = Math.floor(questionsRef.current.length / PAGE_SIZE) + 1;
      const { rows, total: serverTotal } = await fetchPage(page);
      if (serverTotal > 0) {
        totalRef.current = serverTotal;
        setTotal(serverTotal);
      }
      const seen = new Set(questionsRef.current.map((item) => item.id));
      const merged = [...questionsRef.current];
      for (const row of rows) {
        const question = rowToQuestion(row);
        if (question.id && !seen.has(question.id)) {
          seen.add(question.id);
          merged.push(question);
        }
      }
      const added = merged.length - questionsRef.current.length;
      if (added > 0) commitQuestions(merged);
      // 后端只按 priority 排序、没有次级排序，翻页理论上可能重复；本页没有新题就认为到头了
      if (!rows.length || added === 0) {
        pagedRef.current = false;
        totalRef.current = merged.length;
        setPaged(false);
        setTotal(merged.length);
        commitQuestions(merged);
      }
      return added > 0;
    } catch (e) {
      message.error((e as Error).message || '题目加载失败，请重试');
      return false;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [commitQuestions, fetchPage]);

  /** 保证第 target 道题（0 基）已经在内存里，不够就一页页补 */
  const ensureLoaded = useCallback(
    async (target: number) => {
      let guard = 0;
      while (flatOf(questionsRef.current).length <= target && pagedRef.current && guard < 200) {
        const ok = await loadMore();
        if (!ok) break;
        guard += 1;
      }
      return flatOf(questionsRef.current).length > target;
    },
    [loadMore],
  );

  /** 跳题：未加载的先补加载，加载完再切页（一页一题）或滚过去（瀑布流） */
  const goTo = useCallback(
    async (target: number) => {
      const limit = Math.max(totalRef.current, questionsRef.current.length);
      if (target < 0 || target >= limit) return;
      if (flatOf(questionsRef.current).length <= target) {
        if (jumpLockRef.current) return;
        jumpLockRef.current = true;
        setJumpingTo(target);
        const ok = await ensureLoaded(target);
        setJumpingTo(undefined);
        jumpLockRef.current = false;
        if (!ok) {
          message.error(`第 ${target + 1} 题加载失败，请重试`);
          return;
        }
      }
      if (layout === 'single') {
        setIndex(target);
        return;
      }
      const questionId = flatOf(questionsRef.current)[target]?.id;
      if (questionId) setScrollTarget(questionId);
    },
    [ensureLoaded, layout],
  );

  useEffect(() => {
    let alive = true;
    const key = practiceKey(repoId);
    setInitialized(false);
    setLoading(true);
    setError(undefined);
    setJumpingTo(undefined);
    setScrollTarget(undefined);
    resetPool();
    setValues({});
    setIndex(0);

    /** 首屏/恢复时一次性写入题目池（不做增量合并） */
    const applyQuestions = (items: SurveySchema[], nextTotal: number, canPage: boolean) => {
      if (!alive) return;
      questionsRef.current = items;
      totalRef.current = nextTotal;
      pagedRef.current = canPage;
      setQuestions(items);
      setTotal(nextTotal);
      setPaged(canPage);
    };

    const load = async () => {
      try {
        if (!repoId) throw new Error('缺少题库 id');
        if (mode === 'resume') {
          const raw = localStorage.getItem(key);
          if (!raw) throw new Error('没有找到上次练习进度');
          const saved = JSON.parse(raw) as PracticeProgress;
          const items = saved.root?.children ?? [];
          if (!items.length) throw new Error('上次练习进度已损坏');
          if (!alive) return;
          // 旧进度没有 total/paged：按「已经全部加载」恢复，不再去翻页
          const savedTotal = Math.max(saved.total ?? items.length, items.length);
          // 上次进度可能来自题数更多的题库（题目被删过），此时 saved.index 会超出当前题数，
          // 表现为「第 55 题加载失败，请重试」但页面只有 11 题。
          // 规则：分页进度才信 savedTotal，否则总数就是已加载的题数；下标一律夹在有效范围内。
          const resumedPaged = Boolean(saved.paged) && savedTotal > items.length;
          const displayTotal = resumedPaged ? savedTotal : items.length;
          const safeIndex = Math.min(Math.max(saved.index ?? 0, 0), items.length - 1);
          applyQuestions(items, displayTotal, resumedPaged);
          setValues(saved.values ?? {});
          setIndex(safeIndex);
          setLayout(saved.layout === 'scroll' ? 'scroll' : 'single');
          return;
        }

        if (mode === 'random') {
          const counts = parseCounts(search.get('counts'));
          if (!counts.length) throw new Error('随机练习没有选择题型数量');
          const picked = await post<SurveySchema[]>(
            '/api/repo/pick',
            counts.map((item) => ({
              repoId,
              types: [item.type],
              questionsNum: item.count,
              examScore: 0,
            })),
          );
          const items = picked ?? [];
          if (!items.length) throw new Error('这个题库还没有可练习的题目');
          if (!alive) return;
          // 随机练习是用户显式抽题，后端一次抽好给全，不再分页
          applyQuestions(items, items.length, false);
          setValues({});
          setIndex(0);
          setLayout('single');
          return;
        }

        // 顺序练习：首屏只取第 1 页，滚到底再追加
        const { rows, total: serverTotal } = await fetchPage(1);
        const items = rows.map(rowToQuestion);
        if (!items.length) throw new Error('这个题库还没有可练习的题目');
        if (!alive) return;
        applyQuestions(items, Math.max(serverTotal, items.length), items.length < serverTotal);
        setValues({});
        setIndex(0);
        setLayout('single');
      } catch (e) {
        if (alive) setError((e as Error).message || '加载练习失败');
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [repoId, mode, repoName, search, fetchPage, resetPool]);

  const root = useMemo(
    () => (questions.length ? buildRoot(`practice-${repoId}`, repoName, questions) : undefined),
    [questions, repoId, repoName],
  );

  const flat = useMemo(() => (root ? flattenSchema(root) : []), [root]);
  /** 答题卡按题库总题数展示；服务器计数异常时至少覆盖已加载的部分 */
  const sheetTotal = Math.max(total, flat.length);
  const hasMore = paged && questions.length < total;
  const answeredIds = useMemo(() => {
    const set = new Set<string>();
    for (const question of flat) {
      if (!isEmptyAnswer(values[question.id], true)) set.add(question.id);
    }
    return set;
  }, [flat, values]);
  const answeredCount = answeredIds.size;
  const currentIndex = Math.min(index, Math.max(sheetTotal - 1, 0));
  const currentQuestion = flat[currentIndex];

  // 兜底：序号不能落在还没加载的范围里（正常路径下 goTo 会先补加载），否则会一直转圈
  useEffect(() => {
    if (!flat.length) return;
    if (index > flat.length - 1) setIndex(flat.length - 1);
  }, [flat.length, index]);

  // 每次答题/切题/追加题目都把进度写回 localStorage；刷新后「继续练习」可恢复
  useEffect(() => {
    if (!initialized || !root) return;
    // SPA 内从一个题库直接切到另一个题库时，旧题库的题目不能写进新题库的进度
    if (root.id !== `practice-${repoId}`) return;
    const progress: PracticeProgress = {
      repoId,
      repoName,
      root,
      values,
      index,
      layout,
      updatedAt: Date.now(),
      total: sheetTotal,
      paged,
    };
    try {
      localStorage.setItem(practiceKey(repoId), JSON.stringify(progress));
    } catch {
      // localStorage 满/被禁用时不影响继续答题
    }
  }, [initialized, root, values, index, layout, repoId, repoName, sheetTotal, paged]);

  useEffect(() => {
    if (questions.length) setInitialized(true);
  }, [questions.length]);

  // 瀑布流：滚到底部的哨兵进入视口就追加下一页（不支持 IntersectionObserver 时退化为「加载更多」按钮）
  useEffect(() => {
    if (layout !== 'scroll' || !hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: '160px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [layout, hasMore, loadMore, flat.length]);

  // 瀑布流跳题：等这一页渲染出来再滚过去
  useEffect(() => {
    if (!scrollTarget) return;
    const element = document.querySelector(`[data-qid="${scrollTarget}"]`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setScrollTarget(undefined);
  }, [scrollTarget, questions]);

  const setFont = (value: number) => {
    setFontScale(value);
    localStorage.setItem(FONT_KEY, String(value));
  };

  const submit = async () => {
    if (!root) return;
    setSubmitting(true);
    try {
      // 还有没加载的题就先补齐：提交的 survey 必须和改动前一样是整份题卷，
      // 否则后端存的练习快照会少题（补齐是一次性的，按页追加，不会一次拉全量）。
      let guard = 0;
      while (pagedRef.current && questionsRef.current.length < totalRef.current && guard < 200) {
        const ok = await loadMore();
        if (!ok) break;
        guard += 1;
      }
      if (pagedRef.current && questionsRef.current.length < totalRef.current) {
        throw new Error('题目还没加载完，请检查网络后重试');
      }
      const finalRoot = buildRoot(`practice-${repoId}`, repoName, questionsRef.current);
      // 后端练习答案存在特殊项目 id "exercise" 下；AnswerRequest 没有 examExerciseType 字段，
      // 因此不会出现在 /api/exercise/list 的练习记录里（见汇报）。
      await post('/api/public/saveAnswer', {
        projectId: 'exercise',
        survey: finalRoot,
        answer: values,
        tempSave: 1,
      });
      localStorage.removeItem(practiceKey(repoId));
      message.success(`练习已完成，共 ${flatOf(questionsRef.current).length} 道题`);
      navigate('/repo/index');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => navigate('/repo/index');

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (error || !root || !flat.length) {
    return (
      <div className="bp-card" style={{ padding: 30 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={error || '这个题库还没有可练习的题目'}
        >
          <Button onClick={goBack}>返回题库</Button>
        </Empty>
      </div>
    );
  }

  const pageSchema: SurveySchema | undefined = currentQuestion
    ? { ...root, children: [currentQuestion.schema] }
    : undefined;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
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
          <div className="bp-title" style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {repoName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 3 }}>
            <Tag color={mode === 'random' ? 'orange' : 'blue'}>
              {mode === 'random' ? '随机练习' : mode === 'resume' ? '继续练习' : '顺序练习'}
            </Tag>
            {layout === 'single'
              ? `第 ${currentIndex + 1} / ${sheetTotal} 题`
              : `已答 ${answeredCount} / ${sheetTotal} 题`}
            {paged && (
              <span style={{ color: 'var(--bp-hint)' }}>
                {` · 已加载 ${flat.length} / 共 ${sheetTotal} 题`}
              </span>
            )}
          </div>
        </div>
        <Segmented
          value={layout}
          onChange={(value) => setLayout(value as Layout)}
          options={[
            { label: '一页一题', value: 'single' },
            { label: '瀑布流', value: 'scroll' },
          ]}
        />
        <ZoomControl value={fontScale} onChange={setFont} hideLabel />
      </div>

      {/* 答题卡：未加载的序号是灰色虚线，点它先取题再跳转 */}
      {sheetTotal > 1 && (
        <div className="bp-card" style={{ padding: 12, marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)' }}>
              ANSWER SHEET / 答题卡
            </span>
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              已答 {answeredCount} / {sheetTotal}
            </span>
            <span style={{ fontSize: 11, color: 'var(--bp-hint)', marginLeft: 'auto' }}>
              {hasMore
                ? `已加载 ${flat.length} / 共 ${sheetTotal} 题 · 灰色序号点击后再取题`
                : `已加载 ${flat.length} / 共 ${sheetTotal} 题`}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))',
              gap: 6,
              maxHeight: 170,
              overflowY: 'auto',
            }}
          >
            {Array.from({ length: sheetTotal }, (_, itemIndex) => {
              const question = itemIndex < flat.length ? flat[itemIndex] : undefined;
              const loaded = Boolean(question);
              const answered = question ? answeredIds.has(question.id) : false;
              const isCurrent = itemIndex === currentIndex;
              const isJumping = jumpingTo === itemIndex;
              return (
                <button
                  key={itemIndex}
                  type="button"
                  disabled={isJumping}
                  onClick={() => void goTo(itemIndex)}
                  title={
                    loaded
                      ? `第 ${itemIndex + 1} 题${answered ? ' · 已答' : ''}`
                      : `第 ${itemIndex + 1} 题 · 未加载，点击后先取题`
                  }
                  style={sheetButtonStyle({ answered, isCurrent, loaded, loading: isJumping })}
                >
                  {itemIndex + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="bp-card"
        style={{ padding: 18, minHeight: 260, zoom: fontScale }}
      >
        {jumpingTo !== undefined && (
          <div style={{ fontSize: 11, color: 'var(--bp-orange)', marginBottom: 8 }}>
            {`正在加载第 ${jumpingTo + 1} 题…`}
          </div>
        )}
        {layout === 'single' ? (
          pageSchema ? (
            <SchemaRenderer
              schema={pageSchema}
              values={values}
              onChange={(qId, value) => setValues((prev) => ({ ...prev, [qId]: value }))}
              mode="answer"
              numberOffset={currentIndex}
            />
          ) : (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Spin />
            </div>
          )
        ) : (
          <>
            <SchemaRenderer
              schema={root}
              values={values}
              onChange={(qId, value) => setValues((prev) => ({ ...prev, [qId]: value }))}
              mode="answer"
            />
            {hasMore && (
              <div
                ref={sentinelRef}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '18px 0 4px',
                  marginTop: 8,
                  borderTop: '1px dashed var(--bp-line-soft)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--bp-hint)' }}>
                  {`已加载 ${flat.length} / 共 ${sheetTotal} 题`}
                </span>
                <Button size="small" loading={loadingMore} onClick={() => void loadMore()}>
                  加载更多
                </Button>
              </div>
            )}
          </>
        )}
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
        {layout === 'single' ? (
          <>
            <Button
              icon={<LeftOutlined />}
              disabled={currentIndex <= 0 || jumpingTo !== undefined}
              onClick={() => void goTo(currentIndex - 1)}
            >
              上一题
            </Button>
            <Button
              icon={<RightOutlined />}
              iconPosition="end"
              disabled={currentIndex >= sheetTotal - 1 || jumpingTo !== undefined}
              onClick={() => void goTo(currentIndex + 1)}
            >
              下一题
            </Button>
            <Button type="primary" loading={submitting} onClick={() => void submit()}>
              提交
            </Button>
          </>
        ) : (
          <Button type="primary" loading={submitting} onClick={() => void submit()}>
            标记完成
          </Button>
        )}
      </div>
    </div>
  );
}
