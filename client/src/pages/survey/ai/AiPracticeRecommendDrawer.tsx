import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Empty,
  InputNumber,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { CopyOutlined, RobotOutlined } from '@ant-design/icons';
import { getWithPagination } from '../../../api';
import {
  applyAiPaper,
  getAiJob,
  recommendAiPractice,
  type AiJobView,
  type AiPracticeFocus,
  type AiPracticeRecommendResult,
} from '../../../api/ai';
import type { SurveySchema } from '../../../schema/types';

/**
 * 错题重练（计划 §6.3 ④）。
 *
 * <p>口径：只用本卷报表的「每题得分率」找薄弱考点，再从题库抽一组同考点的题。
 * 学员原始答案不进提示词——和学情总结同一条隐私约定（后端 AiPracticeRecommendService 负责）。
 *
 * <p>三步：填条件（题库 / 题量 / 是否追加）→ 后台任务（2 秒轮询）→ 先预览再决定写不写库。
 * 「追加到本卷」是**第二次点击**：生成完绝不自动写库，老师看过题目和考点后再点才调 applyAiPaper。
 */

type Phase = 'form' | 'job' | 'preview';

/** 题库下拉只需要这三个字段（后端 RepoView 的其余字段这里用不到） */
interface RepoOption {
  id: string;
  name?: string;
  total?: number;
}

/** 题型中文名：只列常见题型，其余直接显示枚举名，保证不会出现空标签 */
const TYPE_LABEL: Record<string, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  MultipleBlank: '多填空',
  Textarea: '简答',
  Select: '下拉',
  HorzBlank: '横向填空',
  MatrixRadio: '矩阵单选',
  MatrixCheckbox: '矩阵多选',
  MatrixFillBlank: '矩阵填空',
  MatrixScore: '矩阵评分',
  Nps: 'NPS',
  Score: '打分',
  RichText: '图文',
};

const STATUS_TEXT: Record<string, string> = {
  queued: '排队中',
  running: '正在挑题',
  done: '已完成',
  failed: '失败',
  canceled: '已取消',
};

/** 题干可能是富文本（Word 导入的题带图片）：只做纯文本预览，展示用不承担消毒 */
function plainText(value?: string): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 得分率：后端给 0~1，越低越需要重练 */
function rateText(rate?: number): string {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return '—';
  return `${(Math.max(0, Math.min(1, rate)) * 100).toFixed(1)}%`;
}

export interface AiPracticeRecommendDrawerProps {
  open: boolean;
  /** 来源试卷：用它的报表统计找薄弱考点（报表页正在看的那一场） */
  projectId: string;
  /** 报表页当前的班级筛选；不传 = 按整场考试算 */
  classId?: string;
  /** 班级名，只用于说明统计口径 */
  classLabel?: string;
  /** 有没有 project:update：没有就只能预览，不能追加进卷子（后端 applyPaper 要它） */
  canAppend?: boolean;
  onClose: () => void;
}

export default function AiPracticeRecommendDrawer({
  open,
  projectId,
  classId,
  classLabel,
  canAppend = true,
  onClose,
}: AiPracticeRecommendDrawerProps) {
  const [phase, setPhase] = useState<Phase>('form');
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoId, setRepoId] = useState<string>();
  const [questionCount, setQuestionCount] = useState(20);
  /** 默认不勾：多数时候老师只是想看看哪几个考点最弱 */
  const [appendTarget, setAppendTarget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const [job, setJob] = useState<AiJobView<AiPracticeRecommendResult>>();
  const [result, setResult] = useState<AiPracticeRecommendResult>();
  const [error, setError] = useState<string>();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{ added?: number; total?: number }>();
  /** 轮询防重入：上一轮还没回来就别再发一个 */
  const busyRef = useRef(false);

  // 题库列表：复用题库中心那一条接口（与「从题库抽题」同一个数据源，口径一致）
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setReposLoading(true);
    getWithPagination<RepoOption>('/api/repo/list', { current: 1, pageSize: 200 })
      .then((res) => {
        if (!alive) return;
        const list = res.data ?? [];
        setRepos(list);
        // 老师上次选的题库还在就保留（常连着推两批），否则默认第一个
        setRepoId((prev) => (prev && list.some((item) => item.id === prev) ? prev : list[0]?.id));
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setReposLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  // 关掉再打开：参数（题库 / 题量）沿用上次，结果清空；
  // 但上一轮还在跑时接着看进度——收起抽屉不该让老师以为要重来（轮询本身在关闭时已停）
  useEffect(() => {
    if (!open) return;
    if (jobId && job && (job.status === 'queued' || job.status === 'running')) {
      setPhase('job');
      return;
    }
    setPhase('form');
    setJobId(undefined);
    setJob(undefined);
    setResult(undefined);
    setApplied(undefined);
    setError(undefined);
    // 只在「打开」这一刻判定一次；任务状态变化交给下面的轮询自己管
  }, [open]);

  // 2 秒一轮：太密会把 4 核机器拖慢，太疏进度条看起来像卡住（与出卷 / PDF 导出同一节奏）
  useEffect(() => {
    if (!open || phase !== 'job' || !jobId) return;
    let alive = true;
    const tick = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const view = await getAiJob<AiPracticeRecommendResult>(jobId);
        if (!alive) return;
        setJob(view);
        if (view.status === 'done') {
          setResult(view.result);
          setPhase('preview');
        } else if (view.status === 'failed' || view.status === 'canceled') {
          // 后端给的是中文原因（额度、AI 未启用、模型报错），原样展示，不显示 code
          setError(view.error || (view.status === 'canceled' ? '推荐已取消' : '推荐失败，请稍后重试'));
          setPhase('form');
        }
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
          setPhase('form');
        }
      } finally {
        busyRef.current = false;
      }
    };
    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 2000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [open, phase, jobId]);

  const submit = async () => {
    if (!repoId) {
      message.warning('请先选择题库');
      return;
    }
    if (!questionCount || questionCount < 1) {
      message.warning('题量至少 1 题');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    setApplied(undefined);
    try {
      const created = await recommendAiPractice({
        sourceProjectId: projectId,
        classId,
        repoId,
        questionCount,
      });
      setJobId(created.jobId);
      setJob({ status: 'queued', progress: 0 });
      setPhase('job');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  /** 预览之后的第二次点击：只在这里才写库 */
  const apply = async () => {
    const questions = result?.questions ?? [];
    if (!questions.length) return;
    setApplying(true);
    try {
      const res = await applyAiPaper({ projectId, questions });
      setApplied({ added: res?.added, total: res?.total });
      message.success(`已追加 ${res?.added ?? questions.length} 题到本卷`);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  /** 不追加时的出口：把题干复制走，老师自己往卷子里贴 */
  const copyTitles = async () => {
    const text = (result?.questions ?? [])
      .map((question, index) => `${index + 1}. ${plainText(question.title)}`)
      .join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      message.success('题干已复制');
    } catch {
      message.info('复制失败，可手动选中文本');
    }
  };

  const questions = result?.questions ?? [];
  const focus = result?.focus ?? [];
  const stats = result?.stats;
  const totalScore =
    stats?.totalScore ?? questions.reduce((sum, question) => sum + (question.attribute?.examScore ?? 0), 0);

  const scopeText = classId ? `按 ${classLabel || '当前班级'} 统计` : '按整场考试统计';

  const formBody = (
    <>
      {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} title={error} />}

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>题库（必选）</div>
      <Select
        style={{ width: '100%' }}
        placeholder={reposLoading ? '正在读取题库…' : '选择题库'}
        loading={reposLoading}
        value={repoId}
        onChange={setRepoId}
        options={repos.map((repo) => ({
          label: `${repo.name || '未命名题库'}${repo.total ? `（${repo.total} 题）` : ''}`,
          value: repo.id,
        }))}
        notFoundContent={
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有题库，先去题库中心建一个" />
        }
      />

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '14px 0 6px' }}>题量</div>
      <InputNumber
        min={1}
        max={50}
        value={questionCount}
        onChange={(value) => setQuestionCount(Number(value ?? 20))}
        style={{ width: 140 }}
        suffix="题"
      />

      <div style={{ marginTop: 16 }}>
        <Checkbox
          checked={appendTarget}
          disabled={!canAppend}
          onChange={(e) => setAppendTarget(e.target.checked)}
        >
          同时追加到本卷
        </Checkbox>
        <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 6, lineHeight: 1.8 }}>
          {canAppend
            ? '勾上后，生成完还要再点一次「追加到本卷」才会写进卷子——先看题目，不满意就不写。'
            : '你没有编辑这份试卷的权限，这里只做预览，不能追加。'}
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginTop: 16 }}
        title={scopeText}
        description="用本卷每题的得分率找薄弱考点，再从题库抽同考点的题；学员原始答案不会发给模型。"
      />
      <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 10 }}>
        生成需要 20~60 秒，可以收起抽屉去改别的地方，进度会保留，重新打开接着看。
      </div>
    </>
  );

  const jobBody = (
    <div style={{ padding: '10px 0' }}>
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        {STATUS_TEXT[job?.status ?? 'queued'] || '处理中'}… 预计 20~60 秒
      </div>
      <Progress percent={Math.max(0, Math.min(100, Math.round(job?.progress ?? 0)))} status="active" />
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 10 }}>
        {scopeText} · 目标 {questionCount} 题
      </div>
    </div>
  );

  const previewBody = (
    <>
      <Space wrap style={{ marginBottom: 8 }}>
        <Tag color="blue">共 {stats?.questionCount ?? questions.length} 题</Tag>
        <Tag color="cyan">总分 {totalScore}</Tag>
        <Tag>{scopeText}</Tag>
      </Space>

      {result?.summary && (
        <Alert type="info" showIcon style={{ marginBottom: 12 }} title={result.summary} />
      )}

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>薄弱考点</div>
      {focus.length ? (
        <Table<AiPracticeFocus>
          rowKey={(row, index) => row.point || String(index)}
          size="small"
          pagination={false}
          dataSource={focus}
          style={{ marginBottom: 14 }}
          columns={[
            {
              title: '考点',
              dataIndex: 'point',
              render: (point?: string) => <span style={{ fontSize: 12 }}>{point || '未命名考点'}</span>,
            },
            {
              title: '得分率',
              dataIndex: 'rate',
              width: 90,
              align: 'right',
              render: (rate?: number) => (
                <span
                  style={{
                    fontSize: 12,
                    color:
                      typeof rate === 'number' && rate < 0.6 ? 'var(--bp-orange)' : 'var(--bp-text-soft)',
                  }}
                >
                  {rateText(rate)}
                </span>
              ),
            },
            {
              title: '原卷题数',
              dataIndex: 'questions',
              width: 90,
              align: 'right',
              render: (count?: number) => <span style={{ fontSize: 12 }}>{count ?? '—'}</span>,
            },
          ]}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="这次没算出薄弱考点（可能是本卷还没判分）"
          style={{ marginBottom: 14 }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>推荐题目（{questions.length} 题）</span>
        <div style={{ flex: 1 }} />
        <Button
          size="small"
          icon={<CopyOutlined />}
          disabled={!questions.length}
          onClick={() => void copyTitles()}
        >
          复制题干
        </Button>
      </div>

      <div style={{ border: '1px solid var(--bp-line)', maxHeight: 380, overflow: 'auto' }}>
        {questions.length ? (
          questions.map((question, index) => (
            <PracticeQuestionRow key={question.id} question={question} index={index + 1} />
          ))
        ) : (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--bp-text-soft)' }}>
            题库里没抽出题目：换个题库、调大题量，或先把题库补一补
          </div>
        )}
      </div>

      {applied ? (
        <Alert
          type="success"
          showIcon
          style={{ marginTop: 12 }}
          title={`已追加 ${applied.added ?? questions.length} 题到本卷${
            typeof applied.total === 'number' ? `，卷内现有 ${applied.total} 题` : ''
          }`}
          description="到编辑器里就能看到这些题；改卷不会影响已经收上来的答卷。"
        />
      ) : canAppend ? (
        <div style={{ marginTop: 12 }}>
          {/* 预览里也能改这个开关：不改的话「想追加」就只能重新推荐一次，题会变 */}
          <Checkbox checked={appendTarget} onChange={(e) => setAppendTarget(e.target.checked)}>
            同时追加到本卷
          </Checkbox>
          <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 6, lineHeight: 1.8 }}>
            {appendTarget
              ? '还什么都没有写进卷子：确认题目可用后，点下面的「追加到本卷」才会写。'
              : '不勾选就只是预览：没有写进卷子；可以先点「复制题干」自己出题。'}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--bp-hint)', lineHeight: 1.8 }}>
          这次只预览，没有写进卷子（你没有编辑这份试卷的权限）。可以先点「复制题干」自己出题。
        </div>
      )}
    </>
  );

  const footer = () => {
    if (phase === 'form') {
      return [
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="go"
          type="primary"
          icon={<RobotOutlined />}
          loading={submitting}
          onClick={() => void submit()}
        >
          开始推荐
        </Button>,
      ];
    }
    if (phase === 'job') {
      return [
        <Button key="hide" onClick={onClose}>
          收起（进度保留）
        </Button>,
      ];
    }
    return [
      <Button
        key="back"
        onClick={() => {
          setPhase('form');
          setJobId(undefined);
          setError(undefined);
        }}
      >
        调整条件再来一次
      </Button>,
      appendTarget && canAppend ? (
        applied ? (
          <Button key="done" type="primary" onClick={onClose}>
            完成
          </Button>
        ) : (
          <Button
            key="apply"
            type="primary"
            loading={applying}
            disabled={!questions.length}
            onClick={() => void apply()}
          >
            追加到本卷（{questions.length} 题）
          </Button>
        )
      ) : (
        <Button key="ok" type="primary" onClick={onClose}>
          知道了
        </Button>
      ),
    ];
  };

  return (
    <Drawer
      title="错题重练"
      open={open}
      onClose={onClose}
      size="min(560px, 100vw)"
      // 关掉只是收起界面：任务和结果都留在这里，重新打开还能接着看（见上面的 effect）
      destroyOnHidden={false}
      styles={{ body: { paddingBottom: 8 } }}
      footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}>{footer()}</Space>}
    >
      {phase === 'form' ? formBody : phase === 'job' ? jobBody : previewBody}
    </Drawer>
  );
}

/** 预览表的一行：题号 + 题型 + 题干（两行截断）+ 分值 */
function PracticeQuestionRow({ question, index }: { question: SurveySchema; index: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '6px 8px',
        borderTop: index > 1 ? '1px dashed var(--bp-line)' : undefined,
      }}
    >
      <span style={{ width: 22, color: 'var(--bp-text-soft)', fontSize: 12 }}>{index}</span>
      <Tag style={{ marginInlineEnd: 0 }}>{TYPE_LABEL[question.type] ?? question.type}</Tag>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 13,
          lineHeight: 1.6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {plainText(question.title) || '（无题干）'}
      </div>
      <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{question.attribute?.examScore ?? 0} 分</span>
    </div>
  );
}
