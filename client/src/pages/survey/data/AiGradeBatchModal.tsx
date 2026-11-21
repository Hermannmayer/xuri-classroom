import { useEffect, useRef, useState } from 'react';
import { Alert, Button, InputNumber, Modal, Popconfirm, Progress, Table, Tag, message } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import {
  batchGradeAi,
  getAiJob,
  undoAiGrade,
  type AiGradeBatchLow,
  type AiGradeBatchResult,
  type AiJobView,
} from '../../../api/ai';
import { formatScore } from '../../../utils/scoring';












type Phase = 'confirm' | 'job' | 'done' | 'failed';


const DEFAULT_MAX_ANSWERS = 30;
const MAX_ANSWERS_LIMIT = 100;


const LOW_CONFIDENCE_LIMIT = 10;

const STATUS_TEXT: Record<string, string> = {
  queued: '排队中',
  running: '正在批改',
  done: '已完成',
  failed: '失败',
  canceled: '已取消',
};

export interface AiGradeBatchModalProps {
  open: boolean;
  projectId: string;

  classId?: string;
  onClose: () => void;

  onChanged?: () => void;

  onReview?: (answerId: string) => void;
}

export default function AiGradeBatchModal({
  open,
  projectId,
  classId,
  onClose,
  onChanged,
  onReview,
}: AiGradeBatchModalProps) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [maxAnswers, setMaxAnswers] = useState(DEFAULT_MAX_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const [job, setJob] = useState<AiJobView<AiGradeBatchResult>>();
  const [result, setResult] = useState<AiGradeBatchResult>();
  const [error, setError] = useState<string>();
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);

  const busyRef = useRef(false);

  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);


  useEffect(() => {
    if (!open) return;
    if (jobId && job && (job.status === 'queued' || job.status === 'running')) {
      setPhase('job');
      return;
    }
    setPhase('confirm');
    setJobId(undefined);
    setJob(undefined);
    setResult(undefined);
    setError(undefined);
    setUndone(false);
    // 只在「打开」这一刻判定一次，任务状态变化交给轮询自己管
  }, [open]);


  useEffect(() => {
    if (!open || phase !== 'job' || !jobId) return;
    let alive = true;
    const tick = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const view = await getAiJob<AiGradeBatchResult>(jobId);
        if (!alive) return;
        setJob(view);
        if (view.status === 'done') {
          setResult(view.result);
          setPhase('done');

          onChangedRef.current?.();
        } else if (view.status === 'failed' || view.status === 'canceled') {

          setError(view.error || (view.status === 'canceled' ? '批改已取消' : '批改失败，请稍后重试'));
          setPhase('failed');
        }
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
          setPhase('failed');
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

  const start = async () => {
    setSubmitting(true);
    setError(undefined);
    setUndone(false);
    try {
      const created = await batchGradeAi({ projectId, classId, maxAnswers });
      setJobId(created.jobId);
      setJob({ status: 'queued', progress: 0 });
      setPhase('job');
    } catch (e) {

      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  /** 整批撤销：按 undoToken 把这次写入的分数清空（后端 24 小时有效） */
  const undo = async () => {
    const token = result?.undoToken;
    if (!token) return;
    setUndoing(true);
    try {
      const res = await undoAiGrade(token);
      setUndone(true);
      message.success(`已撤销：${res?.answers ?? 0} 份答卷的 AI 打分已清空`);
      onChangedRef.current?.();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setUndoing(false);
    }
  };

  const low = (result?.lowConfidence ?? []).slice(0, LOW_CONFIDENCE_LIMIT);
  const lowTotal = result?.lowConfidence?.length ?? 0;
  const undoToken = result?.undoToken;

  const confirmBody = (
    <>
      {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} title={error} />}

      <Alert
        type="info"
        showIcon
        title={classId ? '只批这个班级的答卷' : '批整份试卷的待批改答卷'}
        description={
          <div style={{ fontSize: 12, lineHeight: 2 }}>
            <div>· 只批「未批改」的卷子：已经批改过的答卷一份都不动</div>
            <div>· 只补还没给分的主观题：老师手工给过的分不会被覆盖</div>
            <div>· 批完可以整批撤销，24 小时内有效</div>
          </div>
        }
      />

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '16px 0 6px' }}>最多批多少份</div>
      <InputNumber
        min={1}
        max={MAX_ANSWERS_LIMIT}
        value={maxAnswers}
        onChange={(value) => setMaxAnswers(Number(value ?? DEFAULT_MAX_ANSWERS))}
        style={{ width: 140 }}
        suffix="份"
      />
      <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 8, lineHeight: 1.8 }}>
        没给参考答案、没设分值、或者不是主观题的，会被自动跳过（结果里会写跳过多少条）。
        批得越多越慢：一道题一次模型调用，30 份卷子通常要几分钟。
      </div>
    </>
  );

  const jobBody = (
    <div style={{ padding: '6px 0' }}>
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        {STATUS_TEXT[job?.status ?? 'queued'] || '处理中'}… 最多 {maxAnswers} 份
      </div>
      <Progress percent={Math.max(0, Math.min(100, Math.round(job?.progress ?? 0)))} status="active" />
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 10 }}>
        可以关掉弹窗去干别的：后台会继续批，重新打开还能接着看进度。
      </div>
    </div>
  );

  const doneBody = (
    <>
      <Alert
        type={undone ? 'warning' : 'success'}
        showIcon
        style={{ marginBottom: 12 }}
        title={undone ? '这次的 AI 打分已经撤销' : result?.summary || '批改完成'}
      />

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 12, marginBottom: 4 }}>
        <div>
          <div style={{ color: 'var(--bp-text-soft)' }}>处理答卷</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{result?.answers ?? 0}</div>
        </div>
        <div>
          <div style={{ color: 'var(--bp-text-soft)' }}>已打分</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--bp-blue)' }}>{result?.graded ?? 0}</div>
        </div>
        <div>
          <div style={{ color: 'var(--bp-text-soft)' }}>跳过</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{result?.skipped ?? 0}</div>
        </div>
        <div>
          <div style={{ color: 'var(--bp-text-soft)' }}>失败</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: result?.failed ? 'var(--bp-orange)' : undefined }}>
            {result?.failed ?? 0}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 6px' }}>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
          置信度偏低、建议人工复核（{lowTotal} 条{lowTotal > low.length ? `，先列前 ${low.length} 条` : ''}）
        </span>
      </div>

      {low.length ? (
        <Table<AiGradeBatchLow>
          rowKey={(row, index) => `${row.answerId ?? ''}-${row.questionId ?? index}`}
          size="small"
          pagination={false}
          dataSource={low}
          scroll={{ y: 240 }}
          columns={[
            {
              title: '学员',
              dataIndex: 'answererName',
              width: 96,
              render: (name?: string) => <span style={{ fontSize: 12 }}>{name || '匿名'}</span>,
            },
            {
              title: '题目',
              dataIndex: 'questionTitle',
              ellipsis: true,
              render: (title?: string) => <span style={{ fontSize: 12 }}>{title || '未命名题目'}</span>,
            },
            {
              title: '分数',
              dataIndex: 'score',
              width: 92,
              align: 'right',
              render: (_score: number | undefined, row: AiGradeBatchLow) => (
                <span style={{ fontSize: 12 }}>
                  {formatScore(row.score)} / {formatScore(row.maxScore)}
                </span>
              ),
            },
            {
              title: '置信度',
              dataIndex: 'confidence',
              width: 84,
              align: 'right',
              render: (confidence?: number) => (
                <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                  {typeof confidence === 'number' ? `${Math.round(confidence * 100)}%` : '—'}
                </Tag>
              ),
            },
            {
              title: '',
              key: 'ops',
              width: 104,
              render: (_: unknown, row: AiGradeBatchLow) => (
                <Button
                  type="link"
                  size="small"
                  disabled={!row.answerId}
                  onClick={() => row.answerId && onReview?.(row.answerId)}
                >
                  去批改页复核
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
          没有低置信度的条目，这次的分数可以放心用。
        </div>
      )}

      {undone ? null : undoToken ? (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--bp-hint)', lineHeight: 1.8 }}>
          不满意就整批撤销：只清空这次写入的分数，老师手工给的分不受影响。关掉这个窗后撤销入口也会消失，
          想反悔请在这一屏点。
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--bp-hint)', lineHeight: 1.8 }}>
          这次没有写入分数（或全部被跳过），所以没有可撤销的内容。
        </div>
      )}
    </>
  );

  const failedBody = (
    <Alert
      type="error"
      showIcon
      title="批量批改没有完成"
      description={`${error || '请稍后重试'}。这次已经写入的分数不会自动清空，可以回到确认框重新点一次（只会补还没给分的题），或者去批改页逐题看一下。`}
    />
  );

  const footer = () => {
    if (phase === 'confirm') {
      return [
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="go"
          type="primary"
          icon={<RobotOutlined />}
          loading={submitting}
          onClick={() => void start()}
        >
          开始批改
        </Button>,
      ];
    }
    if (phase === 'job') {
      return [
        <Button key="hide" onClick={onClose}>
          收起（后台继续）
        </Button>,
      ];
    }
    if (phase === 'failed') {
      return [
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="retry"
          type="primary"
          onClick={() => {
            setPhase('confirm');
            setJobId(undefined);
            setError(undefined);
          }}
        >
          重新试一次
        </Button>,
      ];
    }
    return [
      <Button key="close" onClick={onClose}>
        关闭
      </Button>,
      undoToken && !undone ? (
        <Popconfirm
          key="undo"
          title="撤销这次批量批改？"
          description="只清空这次 AI 写入的分数，老师手工给的分不受影响。"
          okText="撤销"
          cancelText="算了"
          onConfirm={() => void undo()}
        >
          <Button danger loading={undoing}>
            撤销本次批改
          </Button>
        </Popconfirm>
      ) : null,
    ];
  };

  return (
    <Modal
      open={open}
      title="批量 AI 批改"
      width="min(760px, 96vw)"
      onCancel={onClose}
      mask={{ closable: false }}
      footer={footer()}


      zIndex={900}
    >
      {phase === 'confirm' ? confirmBody : phase === 'job' ? jobBody : phase === 'done' ? doneBody : failedBody}
    </Modal>
  );
}
