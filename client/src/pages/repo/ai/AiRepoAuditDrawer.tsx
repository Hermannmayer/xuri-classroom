import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Empty,
  Progress,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getWithPagination } from '../../../api';
import {
  applyAiRepoAudit,
  auditAiRepo,
  getAiJob,
  type AiRepoAuditResult,
  type AiRepoPatch,
} from '../../../api/ai';

/**
 * 题库体检（task-24）。
 *
 * 体检是长任务：先 POST /api/ai/repo/audit 拿 jobId，再每 2 秒问一次 /api/ai/paper/job/{jobId}，
 * 和组卷、质检、批量批改同一套节奏。结果分三类：
 * - issues：确定性检查（缺答案、题干为空…），不需要模型，改不改由老师自己判断；
 * - duplicates：疑似重复题组，只给相似度和理由，**不在这里合并/删除**（删题不可逆，
 *   留给题目列表页，那边有勾选、有确认、有权限校验）；
 * - patches：逐题补全建议，默认只勾「原本为空」的字段——体检的价值是把没填的补上，
 *   而不是把老师写好的难度/章节/解析改成模型的想法。
 *
 * 体检本身不写库：勾选后点「应用选中建议」才走 POST /api/ai/repo/audit/apply。
 */

/** 体检的题目上限：后端默认 40、上限 120；题数越多越慢也越贵，所以只给几档而不是自由输入 */
const LIMIT_OPTIONS = [20, 40, 80, 120];

const DEFAULT_OPTIONS: AuditOptions = { duplicates: true, analysis: true, limit: 40 };

/** /api/template/list 的一行：这里只用它判断「原本是不是空的」 */
interface TemplateRow {
  id: string;
  chapter?: string;
  difficulty?: string;
  tag?: string[];
  template?: {
    chapter?: string;
    difficulty?: string;
    tags?: string[];
    attribute?: { examAnalysis?: string };
  };
}

type AuditOptions = {
  /** 是否查重 */
  duplicates: boolean;
  /** 是否补解析 */
  analysis: boolean;
  /** 本次最多体检多少题 */
  limit: number;
};

type Phase = 'idle' | 'running' | 'done' | 'failed';

/** 建议里可以写回的字段，与 AiRepoAuditView.Patch 一一对应 */
type PatchKey = 'difficulty' | 'chapter' | 'tags' | 'analysis';

/** blank 原本为空（可以直接补）/ filled 原本有值（应用会覆盖）/ unknown 取不到原题 */
type FieldStatus = 'blank' | 'filled' | 'unknown';

const FIELD_LABEL: Record<PatchKey, string> = {
  difficulty: '难度',
  chapter: '章节',
  tags: '标签',
  analysis: '解析',
};

/** 后端 DTO 里难度是 easy / medium / hard（写回时才转成 易 / 中 / 难），页面上直接给中文 */
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '易',
  medium: '中',
  hard: '难',
};

/** 后端对 issues[].kind 给的是英文码，页面上给中文，认不出来的直接不显示 */
const ISSUE_KIND_LABEL: Record<string, string> = {
  no_answer: '缺答案',
  no_score: '缺分值',
  duplicate: '疑似重复',
  difficulty: '难度异常',
  coverage: '考点覆盖',
  format: '格式问题',
  type_mix: '题型配比',
};

/** 重复题组的处置建议：merge 合并留一 / review 人工确认 */
const DUPLICATE_SUGGEST_LABEL: Record<string, string> = {
  merge: '建议合并留一',
  review: '建议人工确认',
};

const HINT_STYLE: CSSProperties = {
  fontSize: 11,
  color: 'var(--bp-text-soft)',
  lineHeight: 1.7,
  marginTop: 4,
};

/** 建议里真有值的字段；空串 / 空数组按后端约定等于「不改」 */
function patchFields(patch: AiRepoPatch): PatchKey[] {
  const fields: PatchKey[] = [];
  if (patch.difficulty?.trim()) fields.push('difficulty');
  if (patch.chapter?.trim()) fields.push('chapter');
  if (patch.tags?.length) fields.push('tags');
  if (patch.analysis?.trim()) fields.push('analysis');
  return fields;
}

function fieldText(patch: AiRepoPatch, key: PatchKey): string {
  switch (key) {
    case 'difficulty': {
      const raw = patch.difficulty?.trim() ?? '';
      return DIFFICULTY_LABEL[raw.toLowerCase()] ?? raw;
    }
    case 'chapter':
      return patch.chapter?.trim() ?? '';
    case 'tags':
      return (patch.tags ?? []).join('、');
    default:
      return patch.analysis?.trim() ?? '';
  }
}

function fieldStatus(row: TemplateRow | undefined, key: PatchKey): FieldStatus {
  if (!row) return 'unknown';
  switch (key) {
    case 'difficulty':
      return row.difficulty || row.template?.difficulty ? 'filled' : 'blank';
    case 'chapter':
      return row.chapter || row.template?.chapter ? 'filled' : 'blank';
    case 'tags':
      return row.tag?.length || row.template?.tags?.length ? 'filled' : 'blank';
    default:
      return row.template?.attribute?.examAnalysis ? 'filled' : 'blank';
  }
}

/** 原值只用来对照，解析可能很长，只说明「原本有没有」 */
function originalText(row: TemplateRow | undefined, key: PatchKey): string {
  if (!row) return '未知';
  switch (key) {
    case 'difficulty':
      return row.difficulty || row.template?.difficulty || '空';
    case 'chapter':
      return row.chapter || row.template?.chapter || '空';
    case 'tags': {
      const tags = row.tag?.length ? row.tag : (row.template?.tags ?? []);
      return tags.length ? tags.join('、') : '空';
    }
    default:
      return row.template?.attribute?.examAnalysis ? '已有' : '空';
  }
}

/** 标签里塞长文本会把整行撑爆，只留开头几个字 */
function shorten(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function percent(value?: number): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return Math.round(safe * 100) + '%';
}

/** 默认只勾「建议字段原本都是空的」；取不到原题（unknown）也算不安全，宁可让老师自己点 */
function isSafeToPreselect(patch: AiRepoPatch, originals: Map<string, TemplateRow>): boolean {
  const keys = patchFields(patch);
  if (!patch.id || !keys.length) return false;
  const row = originals.get(patch.id);
  return keys.every((key) => fieldStatus(row, key) === 'blank');
}

/** 只带真有值的字段：这样「只采纳解析」不会顺手把难度覆盖掉 */
function toApplyPatch(patch: AiRepoPatch): AiRepoPatch {
  return {
    id: patch.id,
    difficulty: patch.difficulty?.trim() || undefined,
    chapter: patch.chapter?.trim() || undefined,
    tags: patch.tags?.length ? patch.tags : undefined,
    analysis: patch.analysis?.trim() || undefined,
  };
}

/**
 * 取建议题目的原始字段。
 *
 * 体检按「最需要修」挑题，挑中的题不一定在当前页，所以这里自己翻列表：
 * 只为判断「原本是否为空」，按页翻到 id 找齐就停，最多 6 页（300 题）——
 * 再往后翻的代价已经超过重新体检一次了。取不到不影响展示，只是对应行默认不勾。
 */
async function loadOriginals(repoId: string, ids: string[]): Promise<Map<string, TemplateRow>> {
  const PAGE_SIZE = 50;
  const wanted = new Set(ids);
  const found = new Map<string, TemplateRow>();
  for (let current = 1; current <= 6 && wanted.size > 0; current += 1) {
    const page = await getWithPagination<TemplateRow>('/api/template/list', {
      repoId,
      current,
      pageSize: PAGE_SIZE,
    });
    page.data.forEach((row) => {
      if (wanted.delete(row.id)) found.set(row.id, row);
    });
    if (page.data.length < PAGE_SIZE || current * PAGE_SIZE >= page.total) break;
  }
  return found;
}

export interface AiRepoAuditDrawerProps {
  open: boolean;
  repoId: string;
  /** 应用建议要写题库（后端要 ai:use + repo:update 或 template:update）；没有就只能看 */
  canApply: boolean;
  /** 应用成功后刷新页面里的题目列表 */
  onApplied: () => void;
  onClose: () => void;
}

export default function AiRepoAuditDrawer({
  open,
  repoId,
  canApply,
  onApplied,
  onClose,
}: AiRepoAuditDrawerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [options, setOptions] = useState<AuditOptions>(DEFAULT_OPTIONS);
  const [jobId, setJobId] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AiRepoAuditResult>();
  const [originals, setOriginals] = useState<Map<string, TemplateRow>>(() => new Map());
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string>();
  const [applying, setApplying] = useState(false);
  /** 已写回的题数：应用后摘要还是体检当时的统计，用一行提示说明，免得老师以为没生效 */
  const [updatedCount, setUpdatedCount] = useState(0);
  /** 重复题组里老师选中的「保留哪一道」，只记在内存里，不上报也不删题 */
  const [keepChoice, setKeepChoice] = useState<Record<number, string>>({});
  /** 连点开关可能同时有两个任务在跑：只认最后一次发起的那条结果 */
  const runSeqRef = useRef(0);
  /** 还在跑的任务：关掉抽屉只是停止轮询，再打开接着看进度，别为一个没看完的任务再花一次钱 */
  const runningJobRef = useRef<string | undefined>(undefined);
  /** 那个任务属于哪个题库：同一页切到别的题库时，不能接着轮询上一个题库的任务 */
  const jobRepoRef = useRef<string | undefined>(undefined);

  const start = useCallback(
    async (next: AuditOptions) => {
      if (!repoId) return;
      runSeqRef.current += 1;
      const seq = runSeqRef.current;
      runningJobRef.current = undefined;
      jobRepoRef.current = repoId;
      setPhase('running');
      setProgress(0);
      setJobId(undefined);
      setResult(undefined);
      setOriginals(new Map());
      setChecked(new Set());
      setKeepChoice({});
      setUpdatedCount(0);
      setError(undefined);
      try {
        const created = await auditAiRepo({
          repoId,
          limit: next.limit,
          includeDuplicates: next.duplicates,
          includeAnalysis: next.analysis,
        });
        if (runSeqRef.current !== seq) return;
        runningJobRef.current = created.jobId;
        setJobId(created.jobId);
      } catch (e) {
        if (runSeqRef.current !== seq) return;
        // 后端的中文原因（没配模型、没权限、超限额）原样展示，不要显示 code
        setError((e as Error).message);
        setPhase('failed');
      }
    },
    [repoId],
  );

  // 打开就体检一次，且不沿用上一次已成结果的体检：库随时会被改，旧结果会让人以为已经修好了；
  // 但上次的任务还没跑完时接着看进度——重新发起等于为一个没看完的任务再花一次钱
  useEffect(() => {
    if (!open || !repoId) return;
    if (runningJobRef.current && jobRepoRef.current === repoId) {
      setPhase('running');
      return;
    }
    setOptions(DEFAULT_OPTIONS);
    void start(DEFAULT_OPTIONS);
  }, [open, repoId, start]);

  // 每 2 秒一轮；done / failed 或关掉抽屉就停（关掉后还接着轮询等于白烧后端线程）
  useEffect(() => {
    // 任务和题库对不上（同一页换了题库）就不再轮询：结果会串到另一个题库
    if (!open || !jobId || jobRepoRef.current !== repoId) return;
    let alive = true;
    let timer = 0;
    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    };
    const tick = async () => {
      try {
        const view = await getAiJob<AiRepoAuditResult>(jobId);
        if (!alive) return;
        setProgress(Math.max(0, Math.min(100, Math.round(view.progress ?? 0))));
        if (view.status === 'done') {
          stop();
          runningJobRef.current = undefined;
          const data: AiRepoAuditResult = view.result ?? {};
          const patches = (data.patches ?? []).filter((patch) => Boolean(patch?.id) && patchFields(patch).length > 0);
          // 原值读失败不该挡住建言展示：对应行默认不勾就行
          const found = patches.length
            ? await loadOriginals(
                repoId,
                patches.map((patch) => patch.id as string),
              ).catch(() => new Map<string, TemplateRow>())
            : new Map<string, TemplateRow>();
          if (!alive) return;
          setOriginals(found);
          setResult({ ...data, patches });
          // 没有写权限时不要预勾：勾了也点不出去，还让人以为已经改好了
          setChecked(
            canApply
              ? new Set(patches.filter((patch) => isSafeToPreselect(patch, found)).map((patch) => patch.id as string))
              : new Set(),
          );
          setPhase('done');
        } else if (view.status === 'failed' || view.status === 'canceled') {
          stop();
          runningJobRef.current = undefined;
          setError(view.error || (view.status === 'canceled' ? '体检已取消' : '体检失败，请稍后重试'));
          setPhase('failed');
        }
      } catch (e) {
        if (!alive) return;
        stop();
        runningJobRef.current = undefined;
        // 任务只在内存里，后端重启后轮询会 400「任务不存在或已过期」，当成失败提示即可
        setError((e as Error).message);
        setPhase('failed');
      }
    };
    void tick();
    timer = window.setInterval(() => {
      void tick();
    }, 2000);
    return () => {
      alive = false;
      stop();
    };
  }, [open, jobId, repoId, canApply]);

  /** 改开关/题数就重跑：结果只对这一组设置有效，混着看会让人以为少了问题 */
  const changeOptions = (patch: Partial<AuditOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    void start(next);
  };

  const patches = result?.patches ?? [];
  const issues = result?.issues ?? [];
  const duplicates = result?.duplicates ?? [];
  const picked = patches.filter((patch) => patch.id && checked.has(patch.id));

  const toggleOne = (id: string, value: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (value: boolean) => {
    setChecked(value ? new Set(patches.map((patch) => patch.id as string)) : new Set());
  };

  const apply = async () => {
    if (!picked.length) {
      message.warning('先勾选要应用的建议');
      return;
    }
    setApplying(true);
    try {
      const res = await applyAiRepoAudit({ repoId, patches: picked.map(toApplyPatch) });
      const updated = res?.updated ?? picked.length;
      message.success('已更新 ' + updated + ' 道题');
      // 写回去的建议留在列表里会被再点一次；直接从结果里摘掉，摘要仍保持「体检当时」的口径
      const appliedIds = new Set(picked.map((patch) => patch.id as string));
      setResult((prev) =>
        prev ? { ...prev, patches: (prev.patches ?? []).filter((patch) => !appliedIds.has(patch.id as string)) } : prev,
      );
      setChecked(new Set());
      setUpdatedCount((count) => count + updated);
      onApplied();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const nothingFound = phase === 'done' && !issues.length && !duplicates.length && !patches.length && !updatedCount;
  const allChecked = patches.length > 0 && picked.length === patches.length;
  /** 勾选里有多少条会覆盖已有内容：底部提示一句，比让老师逐行看标签更不容易漏 */
  const overwriteCount = picked.filter((patch) =>
    patchFields(patch).some(
      (key) => fieldStatus(patch.id ? originals.get(patch.id) : undefined, key) === 'filled',
    ),
  ).length;

  const footer = (
    <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
      <span
        style={{
          fontSize: 11,
          color: canApply && overwriteCount > 0 ? 'var(--bp-orange)' : 'var(--bp-text-soft)',
        }}
      >
        {canApply
          ? overwriteCount > 0
            ? '已选 ' + picked.length + ' 条，其中 ' + overwriteCount + ' 条会覆盖已有内容'
            : '体检不写库；勾选后点「应用选中建议」才写回题目'
          : '当前账号只能看建议，没有修改题库的权限'}
      </span>
      <Space wrap>
        <Button onClick={onClose}>关闭</Button>
        <Button icon={<ReloadOutlined />} loading={phase === 'running'} onClick={() => void start(options)}>
          重新体检
        </Button>
        <Button
          type="primary"
          loading={applying}
          disabled={!canApply || picked.length === 0}
          onClick={() => void apply()}
        >
          应用选中建议{picked.length ? '（' + picked.length + '）' : ''}
        </Button>
      </Space>
    </Space>
  );

  return (
    <Drawer
      title="AI 题库体检"
      open={open}
      onClose={onClose}
      size="min(780px, 96vw)"
      destroyOnHidden
      footer={footer}
      styles={{ body: { paddingTop: 12 } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          查重
          <Switch size="small" checked={options.duplicates} onChange={(value) => changeOptions({ duplicates: value })} />
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          补解析
          <Switch size="small" checked={options.analysis} onChange={(value) => changeOptions({ analysis: value })} />
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          体检题数
          <Select<number>
            size="small"
            style={{ width: 88 }}
            value={options.limit}
            onChange={(value) => changeOptions({ limit: value })}
            options={LIMIT_OPTIONS.map((value) => ({ value, label: value + ' 题' }))}
          />
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--bp-hint)', margin: '8px 0 14px' }}>
        改上面任意一项都会重新体检（每题都要模型看一遍，题数越多越慢）。
      </div>

      {phase === 'running' && (
        <div style={{ padding: '12px 4px 4px' }}>
          <div style={{ fontSize: 13, marginBottom: 10 }}>AI 正在逐题体检…通常 30~90 秒，可以先关掉去改别的</div>
          <Progress percent={progress} status="active" />
          <div style={{ ...HINT_STYLE, marginTop: 10 }}>
            体检只给建议，不会动题库；勾选后点「应用选中建议」才写回。
          </div>
        </div>
      )}

      {phase === 'failed' && (
        <Alert
          type="error"
          showIcon
          title="这次体检没做成"
          description={error || '体检失败，请稍后重试'}
          action={
            <Button size="small" onClick={() => void start(options)}>
              重试
            </Button>
          }
        />
      )}

      {phase === 'done' && (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 14 }}
            title={result?.summary || '体检完成'}
            description={
              <span style={{ fontSize: 12 }}>
                本次体检 {result?.checked ?? 0} 道题
                {options.duplicates ? '' : '（未开查重）'}
                {options.analysis ? '' : '（未补解析）'}
              </span>
            }
          />

          {updatedCount > 0 && (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 14 }}
              title={'已更新 ' + updatedCount + ' 道题，题目列表已刷新'}
              description="上方摘要是应用之前的统计；想确认现在的状态，可以点「重新体检」。"
            />
          )}

          {issues.length > 0 && (
            <Section title={'确定性问题 ' + issues.length + ' 条'} hint="这些不用模型判断，按规则查出来的，改不改由你定">
              {issues.map((issue, index) => (
                <div key={index} style={{ borderTop: '1px dashed var(--bp-line)', padding: '8px 0' }}>
                  <Space size={6} wrap>
                    <Tag color={issue.severity === 'blocker' ? 'red' : 'orange'} style={{ marginInlineEnd: 0 }}>
                      {issue.severity === 'blocker' ? '必须改' : '建议改'}
                    </Tag>
                    {issue.kind && ISSUE_KIND_LABEL[issue.kind] && (
                      <Tag style={{ marginInlineEnd: 0 }}>{ISSUE_KIND_LABEL[issue.kind]}</Tag>
                    )}
                    <span style={{ fontSize: 12.5 }}>{issue.message || '（没有说明）'}</span>
                  </Space>
                  {issue.suggestion && <div style={HINT_STYLE}>建议：{issue.suggestion}</div>}
                  {issue.questionIds?.length ? (
                    <div style={HINT_STYLE}>涉及 {issue.questionIds.length} 道题</div>
                  ) : null}
                </div>
              ))}
            </Section>
          )}

          {duplicates.length > 0 && (
            <Section
              title={'疑似重复 ' + duplicates.length + ' 组'}
              hint="这里只给判断，不会合并或删除；确认重复后到题目列表页处理"
            >
              {duplicates.map((group, index) => (
                <div key={index} style={{ borderTop: '1px dashed var(--bp-line)', padding: '8px 0' }}>
                  <Space size={6} wrap style={{ marginBottom: 4 }}>
                    <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                      相似度 {percent(group.similarity)}
                    </Tag>
                    {group.suggestion && (
                      <Tag style={{ marginInlineEnd: 0 }}>
                        {DUPLICATE_SUGGEST_LABEL[group.suggestion] ?? '建议人工确认'}
                      </Tag>
                    )}
                  </Space>
                  <Radio.Group
                    value={keepChoice[index]}
                    onChange={(e) => {
                      const value = e.target.value as string;
                      setKeepChoice((prev) => ({ ...prev, [index]: value }));
                    }}
                  >
                    <Space orientation="vertical" size={2}>
                      {(group.ids ?? []).map((id, itemIndex) => (
                        <Radio key={id} value={id} style={{ fontSize: 12.5 }}>
                          {shorten(group.titles?.[itemIndex] || id, 80)}
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                  {group.reason && <div style={HINT_STYLE}>理由：{group.reason}</div>}
                  {keepChoice[index] && (
                    <div style={HINT_STYLE}>
                      记下保留第 {(group.ids ?? []).indexOf(keepChoice[index]) + 1} 题；真要合并请到题目列表页删除另一道。
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          {patches.length > 0 && (
            <Section
              title={'逐题补全建议 ' + patches.length + ' 条'}
              hint="默认只勾「原本为空」的字段；标橙的会覆盖已有内容，确认后再勾"
              extra={
                <Checkbox
                  checked={allChecked}
                  indeterminate={picked.length > 0 && !allChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  disabled={!canApply}
                >
                  全选
                </Checkbox>
              }
            >
              {patches.map((patch) => (
                <PatchRow
                  key={patch.id}
                  patch={patch}
                  original={patch.id ? originals.get(patch.id) : undefined}
                  checked={checked.has(patch.id as string)}
                  disabled={!canApply}
                  onToggle={(value) => toggleOne(patch.id as string, value)}
                />
              ))}
            </Section>
          )}

          {nothingFound && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ lineHeight: 1.9 }}>
                  没发现明显问题：没有缺答案 / 题干为空这类硬伤，
                  <br />
                  没有疑似重复题，也没有需要补难度、章节、标签或解析的题。
                </div>
              }
            />
          )}
        </>
      )}
    </Drawer>
  );
}

/** 抽屉里的分区标题：三块内容共用一个节奏，免得每块各写一套间距 */
function Section({
  title,
  hint,
  extra,
  children,
}: {
  title: string;
  hint?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="bp-title" style={{ fontSize: 13 }}>
          {title}
        </span>
        <div style={{ flex: 1 }} />
        {extra}
      </div>
      {hint && <div style={{ ...HINT_STYLE, marginBottom: 4 }}>{hint}</div>}
      <div>{children}</div>
    </div>
  );
}

/** 一条逐题建议：勾选框 + 题干摘要 + 字段对照（原值 → 建议值）+ 理由 */
function PatchRow({
  patch,
  original,
  checked,
  disabled,
  onToggle,
}: {
  patch: AiRepoPatch;
  original?: TemplateRow;
  checked: boolean;
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const keys = patchFields(patch);
  const shortKeys = keys.filter((key) => key !== 'analysis');
  const analysis = keys.includes('analysis') ? fieldText(patch, 'analysis') : '';
  const unknown = keys.some((key) => fieldStatus(original, key) === 'unknown');
  const overwrite = keys.some((key) => fieldStatus(original, key) === 'filled');
  return (
    <div style={{ borderTop: '1px dashed var(--bp-line)', padding: '8px 0', display: 'flex', gap: 8 }}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
        style={{ marginTop: 2 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
          {shorten(patch.title || '（这道题没有题干）', 160)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {shortKeys.map((key) => (
            <Tag
              key={key}
              color={fieldStatus(original, key) === 'blank' ? 'green' : 'orange'}
              style={{ marginInlineEnd: 0 }}
            >
              {FIELD_LABEL[key]}：{shorten(originalText(original, key), 14)} → {shorten(fieldText(patch, key), 20)}
            </Tag>
          ))}
          {analysis && (
            <Tag color={fieldStatus(original, 'analysis') === 'blank' ? 'green' : 'orange'} style={{ marginInlineEnd: 0 }}>
              补解析（原：{originalText(original, 'analysis')}）
            </Tag>
          )}
        </div>
        {analysis && (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.7,
              marginTop: 6,
              padding: '6px 8px',
              border: '1px dashed var(--bp-line)',
              background: 'var(--bp-panel)',
              maxHeight: 96,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {analysis}
          </div>
        )}
        {patch.reason && <div style={HINT_STYLE}>理由：{patch.reason}</div>}
        {overwrite && <div style={{ ...HINT_STYLE, color: 'var(--bp-orange)' }}>标橙的字段原本有值，应用会覆盖它。</div>}
        {unknown && <div style={HINT_STYLE}>这道题的原值没取到（不在已加载的列表里），勾选前先确认不会覆盖已有内容。</div>}
      </div>
    </div>
  );
}
