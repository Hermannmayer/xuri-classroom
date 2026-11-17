import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Input, InputNumber, Modal, Progress, Radio, Space, Tag, Tooltip, message } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import type { SurveySchema } from '../../../schema/types';
import {
  generateAiPaper,
  getAiPaperJob,
  getAiUsageToday,
  type AiDifficulty,
  type AiJobStatus,
  type AiPaperJobView,
  type AiPaperStats,
  type AiTypeRatio,
  type AiUsageToday,
} from '../../../api/ai';

/**
 * AI 出卷（计划文档 §6.3 ①）。
 *
 * 三步：填参数 -> 后台任务（2 秒轮询）-> 先预览再采纳。
 * 硬约束：AI 生成完绝不直接覆盖老师的卷子，必须等老师看过预览并勾选后才交给编辑器写画布；
 * 写画布这件事由编辑器负责（一次 setSurvey = 一个撤销步），本组件只回传选中的题目。
 */

/** 可配比的题型：只放考试里最常见的四种，矩阵/上传这类老师手动加更方便 */
const RATIO_TYPES: Array<{ type: string; label: string; percent: number }> = [
  { type: 'Radio', label: '单选', percent: 40 },
  { type: 'Checkbox', label: '多选', percent: 20 },
  { type: 'Judge', label: '判断', percent: 20 },
  { type: 'FillBlank', label: '填空', percent: 20 },
];

const DIFFICULTY_OPTIONS: Array<{ value: AiDifficulty; label: string }> = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '较难' },
  { value: 'mixed', label: '混合' },
];

const TYPE_LABEL: Record<string, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  MultipleBlank: '多填空',
  Textarea: '简答',
  Select: '下拉',
  HorzBlank: '横向填空',
  QuestionSet: '题组',
};

const STATUS_TEXT: Record<AiJobStatus, string> = {
  queued: '排队中',
  running: '生成中',
  done: '已完成',
  failed: '失败',
  canceled: '已取消',
};

/** 默认配比：40/20/20/20，老师改完不要求正好 100，后端会自己归一化 */
function initialRatios(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of RATIO_TYPES) out[item.type] = item.percent;
  return out;
}

/** 预览表里的「正确答案」：选择题显示字母，填空题显示文本 */
function answerSummary(question: SurveySchema): string {
  const children = question.children ?? [];
  if (question.type === 'Radio' || question.type === 'Checkbox' || question.type === 'Judge') {
    const letters = children
      .map((child, index) => (child.attribute?.examCorrectAnswer ? String.fromCharCode(65 + index) : ''))
      .filter(Boolean);
    return letters.length ? letters.join('') : '未设答案';
  }
  const text = children
    .map((child) => child.attribute?.examCorrectAnswer)
    .filter(Boolean)
    .join(' / ');
  return text || '未设答案';
}

/** 后端没给 stats 时的兜底：按题型数一遍 */
function countByType(questions: SurveySchema[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const question of questions) out[question.type] = (out[question.type] ?? 0) + 1;
  return out;
}

/** 万为单位、0.1 精度：额度这种量级写全数字反而难读 */
function formatTokens(value?: number): string {
  if (value === undefined || value === null) return '—';
  if (value < 10000) return String(value);
  return (value / 10000).toFixed(1) + ' 万';
}

/** 上限文案：后端约定 null / <=0 表示不限 */
function limitText(limit?: number): string {
  if (limit === undefined || limit === null || limit <= 0) return '不限';
  return formatTokens(limit);
}

export interface AiPaperModalProps {
  open: boolean;
  /** 当前项目 id：为空时只生成不入库，仅用于预览 */
  projectId?: string;
  /** 采纳：编辑器写进画布；save=true 表示顺带落库（老师不想再多点一次保存时用） */
  onAdopt: (questions: SurveySchema[], options: { save: boolean }) => void;
  onClose: () => void;
}

export default function AiPaperModal({ open, projectId, onAdopt, onClose }: AiPaperModalProps) {
  const [phase, setPhase] = useState<'form' | 'job' | 'preview'>('form');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [questionCount, setQuestionCount] = useState(20);
  const [totalScore, setTotalScore] = useState(100);
  const [ratios, setRatios] = useState<Record<string, number>>(initialRatios);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('mixed');
  const [requirements, setRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const [job, setJob] = useState<AiPaperJobView>();
  const [questions, setQuestions] = useState<SurveySchema[]>([]);
  const [stats, setStats] = useState<AiPaperStats>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveAfterAdopt, setSaveAfterAdopt] = useState(false);
  const [error, setError] = useState<string>();
  const [usage, setUsage] = useState<AiUsageToday>();
  /** 轮询防重入：上一轮还没回来就别再发一个 */
  const busyRef = useRef(false);

  // 关掉再打开：参数保留（老师经常连着出两套卷），结果和报错清空；
  // 但**上次的任务还在跑**时接着看进度——关弹窗只是收起界面，不该让老师以为要重来
  useEffect(() => {
    if (!open) return;
    if (jobId && job && (job.status === 'queued' || job.status === 'running')) {
      setPhase('job');
      return;
    }
    setPhase('form');
    setJobId(undefined);
    setJob(undefined);
    setQuestions([]);
    setStats(undefined);
    setSelected(new Set());
    setError(undefined);
    setSaveAfterAdopt(false);
    // 额度拿不到不拦主流程（后端未启用 AI 时这里会 400，真正的提示在生成时给）
    void getAiUsageToday()
      .then(setUsage)
      .catch(() => setUsage(undefined));
    // 只在「打开」这一刻判定一次；任务/进度的后续变化交给下面的轮询自己管
  }, [open]);

  // 2 秒一轮：太密会把 4 核机器拖慢，太疏进度条看起来像卡住（与答卷 PDF 导出同一套节奏）
  useEffect(() => {
    if (!open || phase !== 'job' || !jobId) return;
    let alive = true;
    const tick = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const view = await getAiPaperJob(jobId);
        if (!alive) return;
        setJob(view);
        if (view.status === 'done') {
          const list = view.result?.questions ?? [];
          if (!list.length) {
            setError('AI 没有返回题目，请调大题量或换个补充要求再试');
            setPhase('form');
            return;
          }
          setQuestions(list);
          setStats(view.result?.stats);
          setSelected(new Set(list.map((item) => item.id)));
          setPhase('preview');
        } else if (view.status === 'failed' || view.status === 'canceled') {
          // 后端给的是中文原因（限额 / 模型报错 / AiContentGuard 拒收），原样展示
          setError(view.error || (view.status === 'canceled' ? '生成已取消' : '生成失败，请稍后重试'));
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
    const timer = window.setInterval(
      () => {
        void tick();
      },
      2000,
    );
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [open, phase, jobId]);

  const submit = async () => {
    if (!subject.trim()) {
      message.warning('请先填学科，例如「养老护理员」');
      return;
    }
    if (!questionCount || questionCount < 1) {
      message.warning('题量至少 1 题');
      return;
    }
    if (!totalScore || totalScore < 1) {
      message.warning('总分至少 1 分');
      return;
    }
    const percentSum = RATIO_TYPES.reduce((sum, item) => sum + Number(ratios[item.type] ?? 0), 0);
    if (percentSum <= 0) {
      message.warning('题型配比至少要给一种题型分配比例');
      return;
    }
    const typeRatio: AiTypeRatio = {};
    for (const item of RATIO_TYPES) {
      const percent = Number(ratios[item.type] ?? 0);
      if (percent > 0) typeRatio[item.type] = percent / 100;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const created = await generateAiPaper({
        projectId,
        subject: subject.trim(),
        level: level.trim() || undefined,
        questionCount,
        totalScore,
        typeRatio,
        difficulty,
        requirements: requirements.trim() || undefined,
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

  /** 逐题采纳：只把勾上的题写进画布 */
  const adopt = () => {
    const picked = questions.filter((item) => selected.has(item.id));
    if (!picked.length) {
      message.warning('请至少勾选一道题');
      return;
    }
    onAdopt(picked, { save: saveAfterAdopt });
    onClose();
  };

  /** 全部采纳：不管复选框，整批写进画布 */
  const adoptAll = () => {
    if (!questions.length) return;
    onAdopt(questions, { save: saveAfterAdopt });
    onClose();
  };

  const allSelected = questions.length > 0 && selected.size === questions.length;
  const questionTotal = stats?.questionCount ?? questions.length;
  const scoreTotal = stats?.totalScore ?? questions.reduce((sum, item) => sum + (item.attribute?.examScore ?? 0), 0);
  const byType = stats?.typeCount ?? countByType(questions);

  const quotaLine = usage ? (
    <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
      今日额度：我 {formatTokens(usage.userTokens)} / {limitText(usage.userLimit)} tokens · 全站{' '}
      {formatTokens(usage.dailyTokens)} / {limitText(usage.dailyLimit)}
    </div>
  ) : null;

  const formBody = (
    <>
      {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} title={error} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>学科（必填）</div>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="如：养老护理员"
            maxLength={40}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>级别</div>
          <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="如：五级 / 中级" maxLength={20} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>题量</div>
          <InputNumber
            min={1}
            max={100}
            value={questionCount}
            onChange={(value) => setQuestionCount(Number(value ?? 1))}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>总分</div>
          <InputNumber
            min={1}
            max={1000}
            value={totalScore}
            onChange={(value) => setTotalScore(Number(value ?? 1))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '14px 0 6px' }}>
        题型配比（按占比，不必正好凑 100，后端会归一化）
      </div>
      <Space wrap size={12}>
        {RATIO_TYPES.map((item) => (
          <span key={item.type} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            {item.label}
            <InputNumber
              size="small"
              min={0}
              max={100}
              value={ratios[item.type]}
              onChange={(value) => setRatios((prev) => ({ ...prev, [item.type]: Number(value ?? 0) }))}
              style={{ width: 64 }}
              suffix="%"
            />
          </span>
        ))}
      </Space>

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '14px 0 6px' }}>难度</div>
      <Radio.Group value={difficulty} onChange={(e) => setDifficulty(e.target.value as AiDifficulty)}>
        <Space wrap>
          {DIFFICULTY_OPTIONS.map((item) => (
            <Radio key={item.value} value={item.value}>
              {item.label}
            </Radio>
          ))}
        </Space>
      </Radio.Group>

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '14px 0 6px' }}>补充要求（可选）</div>
      <Input.TextArea
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        placeholder="例如：围绕冬季四防（防火、防冻、防滑、防中毒），题目贴近实操"
        autoSize={{ minRows: 3, maxRows: 6 }}
        maxLength={500}
      />
      <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 8 }}>
        生成需要 30~90 秒，可以关掉弹窗去改别的地方；结果只会进预览，老师勾选后才写进画布。
      </div>
      {quotaLine}
    </>
  );

  const jobBody = (
    <div style={{ padding: '10px 0' }}>
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        {STATUS_TEXT[job?.status ?? 'queued']}… 预计 30~90 秒
      </div>
      <Progress percent={Math.max(0, Math.min(100, Math.round(job?.progress ?? 0)))} status="active" />
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 10 }}>
        {subject ? subject + (level ? ' · ' + level : '') + ' · ' : ''}
        {questionCount} 题 / {totalScore} 分 ·{' '}
        {DIFFICULTY_OPTIONS.find((item) => item.value === difficulty)?.label}
      </div>
    </div>
  );

  const previewBody = (
    <>
      <Space wrap style={{ marginBottom: 8 }}>
        <Tag color="blue">共 {questionTotal} 题</Tag>
        <Tag color="cyan">总分 {scoreTotal}</Tag>
        {Object.entries(byType).map(([type, count]) => (
          <Tag key={type}>
            {TYPE_LABEL[type] ?? type} {count}
          </Tag>
        ))}
      </Space>
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
        AI 只负责出题，不会自动写进你的卷子：勾选要保留的题，点下面「采纳」才写进画布。
      </div>
      <div style={{ border: '1px solid var(--bp-line)', maxHeight: 420, overflow: 'auto', padding: 8 }}>
        <div style={{ padding: '0 4px 8px' }}>
          <Checkbox
            checked={allSelected}
            indeterminate={selected.size > 0 && selected.size < questions.length}
            onChange={(e) => setSelected(e.target.checked ? new Set(questions.map((item) => item.id)) : new Set())}
          >
            全选（已选 {selected.size} / {questions.length}）
          </Checkbox>
        </div>
        {questions.map((question, index) => (
          <AiQuestionRow
            key={question.id}
            question={question}
            index={index + 1}
            checked={selected.has(question.id)}
            onToggle={(checked) => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (checked) next.add(question.id);
                else next.delete(question.id);
                return next;
              });
            }}
          />
        ))}
        {!questions.length && <div style={{ padding: 20, textAlign: 'center', fontSize: 12 }}>没有题目</div>}
      </div>
      <div style={{ marginTop: 10 }}>
        <Tooltip title="勾上就顺便落库；不勾也行，回到编辑器点「保存」一样">
          <Checkbox checked={saveAfterAdopt} onChange={(e) => setSaveAfterAdopt(e.target.checked)}>
            采纳后立即保存到服务器
          </Checkbox>
        </Tooltip>
      </div>
    </>
  );

  const footer = () => {
    if (phase === 'form') {
      return [
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="go" type="primary" icon={<RobotOutlined />} loading={submitting} onClick={() => void submit()}>
          开始生成
        </Button>,
      ];
    }
    if (phase === 'job') {
      return [
        <Button key="close" onClick={onClose}>
          收起（进度保留，可再打开接着看）
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
        重新生成
      </Button>,
      <Button key="all" disabled={!questions.length} onClick={adoptAll}>
        全部采纳
      </Button>,
      <Button key="adopt" type="primary" disabled={!selected.size} onClick={adopt}>
        采纳 {selected.size} 题到画布
      </Button>,
    ];
  };

  return (
    <Modal
      open={open}
      title="AI 生成试卷"
      width={920}
      onCancel={onClose}
      mask={{ closable: false }}
      destroyOnHidden
      footer={footer()}
    >
      {phase === 'form' ? formBody : phase === 'job' ? jobBody : previewBody}
    </Modal>
  );
}

/** 预览表的一行：勾选 + 题型 + 题干（两行截断）+ 正确答案 + 分值 */
function AiQuestionRow({
  question,
  index,
  checked,
  onToggle,
}: {
  question: SurveySchema;
  index: number;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const options = (question.children ?? []).map((child) => child.title).filter(Boolean).join(' / ');
  const showOptions =
    options.length > 0 &&
    (question.type === 'Radio' || question.type === 'Checkbox' || question.type === 'Judge');
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '6px 4px',
        borderTop: '1px dashed var(--bp-line)',
      }}
    >
      <Checkbox checked={checked} onChange={(e) => onToggle(e.target.checked)} />
      <span style={{ width: 22, color: 'var(--bp-text-soft)', fontSize: 12 }}>{index}</span>
      <Tag style={{ marginInlineEnd: 0 }}>{TYPE_LABEL[question.type] ?? question.type}</Tag>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {question.title || '（无题干）'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 2 }}>
          正确答案：{answerSummary(question)}
          {showOptions ? '（' + options + '）' : ''}
        </div>
      </div>
      <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{question.attribute?.examScore ?? 0} 分</span>
    </div>
  );
}
