import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Switch,
  Tag,
  message,
} from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { getWithPagination } from '../../../api';
import {
  getAiJob,
  pickAiPaper,
  type AiDifficulty,
  type AiJobStatus,
  type AiPaperPickResult,
  type AiTypeRatio,
} from '../../../api/ai';
import { getComposeStats } from '../../../api/compose';
import { can, loadAuthorities } from '../../../auth/permissions';
import { PERMISSION_CODES } from '../../../auth/permission-codes';
import type { SurveySchema } from '../../../schema/types';












const RATIO_TYPES: Array<{ type: string; label: string; percent: number }> = [
  { type: 'Radio', label: '单选', percent: 40 },
  { type: 'Checkbox', label: '多选', percent: 20 },
  { type: 'Judge', label: '判断', percent: 20 },
  { type: 'FillBlank', label: '填空', percent: 10 },
  { type: 'Textarea', label: '简答', percent: 10 },
];


type PickDifficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_OPTIONS: Array<{ value: PickDifficulty; label: string }> = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '较难' },
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
  running: '正在挑题',
  done: '已完成',
  failed: '失败',
  canceled: '已取消',
};


interface RepoOption {
  id: string;
  name?: string;
  total?: number;
}


interface JobProgress {
  status: AiJobStatus;
  progress?: number;
}

/** 默认配比 40/20/20/10/10，老师改完不要求正好 100，后端会归一化 */
function initialRatios(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of RATIO_TYPES) out[item.type] = item.percent;
  return out;
}

/**
 * 题干可能是富文本（Word 导入的题带图片），列表里只做纯文本预览：
 * 正则剥标签用于**展示**，不承担消毒职责（React 本身把内容当文本渲染）。
 */
function plainText(value?: string): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 后端没给 stats 时的兜底：按题型数一遍，保证标签不会整块消失 */
function countByType(questions: SurveySchema[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const question of questions) out[question.type] = (out[question.type] ?? 0) + 1;
  return out;
}

/** 后端没给 stats 时的兜底：按每题分值求和 */
function sumScore(questions: SurveySchema[]): number {
  return questions.reduce((sum, question) => sum + (question.attribute?.examScore ?? 0), 0);
}

/** 配比换算成「大约几题」：让老师在提交前就能看出 20 题到底抽几道单选 */
function ratioPreview(ratios: Record<string, number>, questionCount: number): string {
  const sum = RATIO_TYPES.reduce((total, item) => total + Number(ratios[item.type] ?? 0), 0);
  if (sum <= 0) return '';
  return RATIO_TYPES.filter((item) => Number(ratios[item.type] ?? 0) > 0)
    .map((item) => {
      const count = Math.round((Number(ratios[item.type] ?? 0) / sum) * questionCount);
      return item.label + ' ' + (count > 0 ? count : 1);
    })
    .join(' / ');
}

export interface AiPaperModalProps {
  open: boolean;

  projectId?: string;

  onAdopt: (questions: SurveySchema[]) => void;
  onClose: () => void;
}

export default function AiPaperModal({ open, projectId, onAdopt, onClose }: AiPaperModalProps) {
  const [phase, setPhase] = useState<'form' | 'job' | 'result'>('form');
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState<string>();
  const [repoIds, setRepoIds] = useState<string[]>([]);
  const [chapterOptions, setChapterOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<PickDifficulty[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [totalScore, setTotalScore] = useState(100);
  const [ratios, setRatios] = useState<Record<string, number>>(initialRatios);
  const [requirements, setRequirements] = useState('');
  const [aiSelect, setAiSelect] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const [job, setJob] = useState<JobProgress>();
  const [result, setResult] = useState<AiPaperPickResult>();
  const [error, setError] = useState<string>();

  const busyRef = useRef(false);



  useEffect(() => {
    if (!open) return;
    if (phase === 'job' && jobId) return;
    setPhase('form');
    setJobId(undefined);
    setJob(undefined);
    setResult(undefined);
    setError(undefined);
    // 只在「打开」这一刻判定一次；任务进度的后续变化交给下面的轮询自己管
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);



  useEffect(() => {
    if (!open) return;
    let alive = true;
    setRepoLoading(true);
    setRepoError(undefined);
    void loadAuthorities()
      .then((authorities) =>
        getWithPagination<RepoOption>('/api/repo/list', {
          current: 1,
          pageSize: 200,
          memberOnly: can(authorities, PERMISSION_CODES.repoCreate) ? undefined : true,
        }),
      )
      .then((res) => {
        if (!alive) return;
        setRepos(res.data);
        if (!res.data.length) setRepoError('没有可用于组卷的题库，先到「题库」里建一个或申请授权');
      })
      .catch((e: Error) => {
        if (alive) setRepoError('题库加载失败：' + e.message);
      })
      .finally(() => {
        if (alive) setRepoLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);



  const repoKey = repoIds.join(',');
  useEffect(() => {
    if (!open || !repoKey) {
      setChapterOptions([]);
      return;
    }
    let alive = true;
    void getComposeStats(repoIds)
      .then((stats) => {
        if (!alive) return;
        const keys = Object.keys(stats?.byChapter ?? {}).filter((key) => key && key !== '未设置');
        setChapterOptions(keys.map((key) => ({ label: key, value: key })));
      })
      .catch(() => {
        if (alive) setChapterOptions([]);
      });
    return () => {
      alive = false;
    };
    // repoIds 是数组，每次都是新引用；按内容（repoKey）比较，避免无意义重拉
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, repoKey]);


  useEffect(() => {
    if (!open || phase !== 'job' || !jobId) return;
    let alive = true;
    let timer = 0;
    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    };
    const tick = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const view = await getAiJob<AiPaperPickResult>(jobId);
        if (!alive) return;
        setJob({ status: view.status, progress: view.progress });
        if (view.status === 'done') {
          stop();
          const questions = view.result?.questions ?? [];
          if (!questions.length) {
            setError('题库里没有符合条件的题目：放宽章节 / 难度，或换一个题库再试');
            setPhase('form');
            return;
          }
          setResult(view.result);
          setPhase('result');
        } else if (view.status === 'failed' || view.status === 'canceled') {
          stop();

          setError(view.error || (view.status === 'canceled' ? '抽题已取消' : '抽题失败，请稍后重试'));
          setPhase('form');
        }
      } catch (e) {
        if (alive) {
          stop();
          setError((e as Error).message);
          setPhase('form');
        }
      } finally {
        busyRef.current = false;
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
  }, [open, phase, jobId]);

  const submit = async () => {
    if (!repoIds.length) {
      message.warning('请先选择题库');
      return;
    }
    if (!(questionCount >= 1 && questionCount <= 100)) {
      message.warning('题量要填 1~100 之间的整数');
      return;
    }
    if (!(totalScore >= 1)) {
      message.warning('总分至少 1 分');
      return;
    }
    const typeRatio: AiTypeRatio = {};
    for (const item of RATIO_TYPES) {
      const percent = Number(ratios[item.type] ?? 0);
      if (percent > 0) typeRatio[item.type] = percent / 100;
    }
    if (!Object.keys(typeRatio).length) {
      message.warning('题型配比至少要给一种题型分配比例');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    setResult(undefined);
    try {
      const created = await pickAiPaper({
        projectId,
        repoIds,
        chapters: chapters.length ? chapters : undefined,
        difficulties: difficulties.length ? (difficulties as AiDifficulty[]) : undefined,
        typeRatio,
        questionCount,
        totalScore,
        requirements: requirements.trim() || undefined,
        aiSelect,
      });

      if (!created?.jobId) throw new Error('后端没有返回任务号，请稍后重试');
      setJobId(created.jobId);
      setJob({ status: 'queued', progress: 0 });
      setPhase('job');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  /** 采纳：整批交给编辑器追加进画布，这里不写库 */
  const adopt = () => {
    const picked = result?.questions ?? [];
    if (!picked.length) return;
    onAdopt(picked);
    onClose();
  };

  const questions = result?.questions ?? [];
  const stats = result?.stats;
  const missing = result?.missing ?? 0;
  const reasonById = new Map<string, string>();
  for (const note of result?.notes ?? []) {
    if (note?.questionId && note.reason) reasonById.set(note.questionId, note.reason);
  }
  const typeCount = stats?.typeCount ?? countByType(questions);
  const scoreTotal = stats?.totalScore ?? sumScore(questions);
  const preview = ratioPreview(ratios, questionCount);

  const formBody = (
    <>
      {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} title={error} />}
      {repoError && <Alert type="warning" showIcon style={{ marginBottom: 12 }} title={repoError} />}

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>题库（必选，可多选）</div>
      <Select
        mode="multiple"
        allowClear
        loading={repoLoading}
        value={repoIds}
        onChange={(next) => setRepoIds(next)}
        placeholder="从哪些题库里抽题"
        maxTagCount="responsive"
        style={{ width: '100%' }}
        notFoundContent={repoLoading ? '加载中…' : '没有可用题库'}
        options={repos.map((repo) => ({
          label: (repo.name || '未命名题库') + (repo.total ? '（' + repo.total + ' 题）' : ''),
          value: repo.id,
        }))}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>章节（可空）</div>
          <Select
            mode="tags"
            allowClear
            value={chapters}
            onChange={(next) => setChapters(next)}
            placeholder="不限章节，可多选"
            style={{ width: '100%' }}
            options={chapterOptions}
            tokenSeparators={[',', '，']}
            notFoundContent={repoIds.length ? '这些题库里没有章节标记' : '先选择题库'}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>难度（可空，不勾 = 不限）</div>
          <Space wrap size={12} style={{ minHeight: 32, alignItems: 'center' }}>
            {DIFFICULTY_OPTIONS.map((item) => (
              <Checkbox
                key={item.value}
                checked={difficulties.includes(item.value)}
                onChange={(e) =>
                  setDifficulties((prev) =>
                    e.target.checked ? [...prev, item.value] : prev.filter((value) => value !== item.value),
                  )
                }
              >
                {item.label}
              </Checkbox>
            ))}
          </Space>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>题量</div>
          <InputNumber
            min={1}
            max={100}
            precision={0}
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
      {preview && (
        <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 6 }}>
          按当前配比，{questionCount} 题大约分成：{preview}（题库不够时会少抽，后端按可用题量微调）
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 6px' }}>
        <Switch size="small" checked={aiSelect} onChange={setAiSelect} />
        <span style={{ fontSize: 12 }}>让 AI 挑选</span>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
          开：模型按考点覆盖与难度梯度挑，会花 token；关：纯随机抽题，不花 token
        </span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '14px 0 6px' }}>补充要求（可空）</div>
      <Input.TextArea
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        placeholder="例如：优先挑案例题，避开上次考过的章节"
        autoSize={{ minRows: 2, maxRows: 5 }}
        maxLength={500}
      />
      <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 8 }}>
        AI 只从题库里挑题，不改写题干和答案；挑完先进预览，老师点「采纳」才写进画布。
      </div>
    </>
  );

  const jobBody = (
    <div style={{ padding: '10px 0' }}>
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        {STATUS_TEXT[job?.status ?? 'queued']}… {aiSelect ? '模型正在按条件挑选' : '按条件随机抽题'}
      </div>
      <Progress percent={Math.max(0, Math.min(100, Math.round(job?.progress ?? 0)))} status="active" />
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 10 }}>
        {repoIds.length} 个题库 · {questionCount} 题 / {totalScore} 分
        {chapters.length ? ' · ' + chapters.join('、') : ''}
      </div>
      <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 6 }}>
        可以收起弹窗去改别的地方，任务在后台继续，再打开还能看到进度。
      </div>
    </div>
  );

  const resultBody = (
    <>
      <Space wrap style={{ marginBottom: 8 }}>
        <Tag color="blue">共 {questions.length} 题</Tag>
        <Tag color="cyan">总分 {scoreTotal}</Tag>
        <Tag>候选 {result?.candidates ?? 0} 题</Tag>
        {Object.entries(typeCount).map(([type, count]) => (
          <Tag key={type}>
            {TYPE_LABEL[type] ?? type} {count}
          </Tag>
        ))}
      </Space>
      {result?.summary && (
        <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 8 }}>{result.summary}</div>
      )}
      {missing > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 10 }}
          title={'题库里只有 ' + questions.length + ' 道符合条件的题，还差 ' + missing + ' 道'}
          description="放宽章节 / 难度，或再选几个题库试一次。"
        />
      )}
      <div style={{ border: '1px solid var(--bp-line)', maxHeight: 420, overflow: 'auto', padding: 8 }}>
        {questions.map((question, index) => (
          <AiPickRow
            key={question.id}
            question={question}
            index={index + 1}
            reason={reasonById.get(question.id)}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 8 }}>
        题目、分值、正确答案都是题库原文；点下面的按钮才会追加进画布，之后再点「保存」才落库。
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
          开始抽题
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
          setResult(undefined);
          setError(undefined);
        }}
      >
        重新挑选
      </Button>,
      <Button key="adopt" type="primary" disabled={!questions.length} onClick={adopt}>
        采纳这 {questions.length} 题
      </Button>,
    ];
  };

  return (
    <Modal
      open={open}
      title="AI 组卷（从题库抽题）"
      width={920}
      onCancel={onClose}
      mask={{ closable: false }}
      destroyOnHidden
      footer={footer()}
    >
      {phase === 'form' ? formBody : phase === 'job' ? jobBody : resultBody}
    </Modal>
  );
}

/** 预览里的一行：题型 + 题干（两行截断）+ 分值/难度 + 挑选理由 */
function AiPickRow({
  question,
  index,
  reason,
}: {
  question: SurveySchema;
  index: number;
  reason?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '8px 4px',
        borderTop: '1px dashed var(--bp-line)',
      }}
    >
      <span style={{ width: 22, color: 'var(--bp-text-soft)', fontSize: 12 }}>{index}</span>
      <Tag style={{ marginInlineEnd: 0 }}>{TYPE_LABEL[question.type] ?? question.type}</Tag>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {plainText(question.title) || '（题干为空）'}
        </div>
        {reason && (
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 2, lineHeight: 1.6 }}>
            挑选理由：{reason}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--bp-text-soft)', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 12, color: 'var(--bp-text)' }}>{question.attribute?.examScore ?? 0} 分</div>
        <div>{question.difficulty || '难度未标注'}</div>
      </div>
    </div>
  );
}
