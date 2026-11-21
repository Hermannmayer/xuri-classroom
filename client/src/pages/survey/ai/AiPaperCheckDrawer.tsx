import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Empty, Progress, Space, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { checkAiPaper, getAiJob, type AiPaperCheckResult, type AiPaperIssue } from '../../../api/ai';













const KIND_LABEL: Record<string, string> = {
  no_score: '缺分值',
  no_answer: '缺答案',
  duplicate: '重复题',
  difficulty: '难度分布',
  coverage: '考点覆盖',
  format: '格式',
  type_mix: '题型配比',
};


const MAX_QUESTION_TAGS = 8;

/** 分数配色：走主题蓝/橙，只有「不及格」才用红色，避免整屏红字 */
function scoreColor(score: number): string {
  if (score >= 80) return 'var(--bp-blue)';
  if (score >= 60) return 'var(--bp-orange)';
  return '#ff4d4f';
}

export interface AiPaperCheckDrawerProps {
  open: boolean;

  projectId?: string;
  onClose: () => void;

  onLocate?: (questionId: string) => void;

  questionNumberOf?: (questionId: string) => number | undefined;
}

export default function AiPaperCheckDrawer({
  open,
  projectId,
  onClose,
  onLocate,
  questionNumberOf,
}: AiPaperCheckDrawerProps) {
  const [jobId, setJobId] = useState<string>();
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AiPaperCheckResult>();
  const [error, setError] = useState<string>();

  const busyRef = useRef(false);

  /** 重新体检：清掉旧报告再建一个新任务（旧任务自己会在后端跑完，不用取消） */
  const start = useCallback(async () => {
    setJobId(undefined);
    setResult(undefined);
    setError(undefined);
    setProgress(0);
    if (!projectId) {
      setStatus('failed');
      setError('这份试卷还没保存到服务端，先保存再体检');
      return;
    }
    setStatus('running');
    try {
      const created = await checkAiPaper({ projectId });
      if (!created?.jobId) throw new Error('后端没有返回任务号，请稍后重试');
      setJobId(created.jobId);
    } catch (e) {

      setStatus('failed');
      setError((e as Error).message);
    }
  }, [projectId]);


  useEffect(() => {
    if (!open) return;
    void start();
  }, [open, start]);


  useEffect(() => {
    if (open) return;
    setStatus('idle');
    setResult(undefined);
    setError(undefined);
    setJobId(undefined);
    setProgress(0);
  }, [open]);


  useEffect(() => {
    if (!open || !jobId) return;
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
        const view = await getAiJob<AiPaperCheckResult>(jobId);
        if (!alive) return;
        setProgress(Math.max(0, Math.min(100, Math.round(view.progress ?? 0))));
        if (view.status === 'done') {
          stop();
          setResult(view.result ?? {});
          setStatus('done');
        } else if (view.status === 'failed' || view.status === 'canceled') {
          stop();
          setError(view.error || (view.status === 'canceled' ? '体检已取消' : '体检失败，请稍后重试'));
          setStatus('failed');
        }
      } catch (e) {
        if (alive) {
          stop();
          setError((e as Error).message);
          setStatus('failed');
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
  }, [open, jobId]);

  const issues = result?.issues ?? [];
  const blockers = issues.filter((issue) => issue.severity === 'blocker');
  const warnings = issues.filter((issue) => issue.severity !== 'blocker');
  const score = typeof result?.score === 'number' ? Math.max(0, Math.min(100, Math.round(result.score))) : undefined;


  const numbersOf = (issue: AiPaperIssue) => {
    const ids = issue.questionIds ?? [];
    const shown = ids.slice(0, MAX_QUESTION_TAGS);
    return [
      ...shown.map((questionId, index) => {
        const number = questionNumberOf?.(questionId);
        const label = number ? '第 ' + number + ' 题' : '题号未知';
        const clickable = Boolean(number && onLocate);
        return (
          <Tag
            key={(questionId || 'q') + index}
            color={issue.severity === 'blocker' ? 'red' : 'orange'}
            style={{ marginInlineEnd: 0, cursor: clickable ? 'pointer' : 'default' }}
            title={clickable ? '定位到画布上的这道题' : '这道题可能已经不在当前卷子里了'}
            onClick={clickable ? () => onLocate?.(questionId) : undefined}
          >
            {label}
          </Tag>
        );
      }),
      ids.length > shown.length ? (
        <Tag key="more" style={{ marginInlineEnd: 0 }} title={'还有 ' + (ids.length - shown.length) + ' 道题没展开'}>
          +{ids.length - shown.length} 题
        </Tag>
      ) : null,
    ];
  };

  const issueList = (list: AiPaperIssue[]) =>
    list.map((issue, index) => {
      const blocker = issue.severity === 'blocker';
      const tags = numbersOf(issue);
      return (
        <div
          key={(issue.kind || 'issue') + index}
          style={{
            borderLeft: '3px solid ' + (blocker ? '#ff4d4f' : 'var(--bp-orange)'),
            background: 'var(--bp-panel-strong)',
            padding: '8px 10px',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <Tag color={blocker ? 'red' : 'orange'} style={{ marginInlineEnd: 0 }}>
              {blocker ? '阻断' : '建议'}
            </Tag>
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              {KIND_LABEL[issue.kind ?? ''] ?? issue.kind ?? '问题'}
            </span>
            {(issue.questionIds?.length ?? 0) > 0 && (
              <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{tags}</span>
            )}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>{issue.message || '（没有说明）'}</div>
          {issue.suggestion && (
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4, lineHeight: 1.7 }}>
              建议：{issue.suggestion}
            </div>
          )}
        </div>
      );
    });

  return (
    <Drawer
      title="AI 试卷质检"
      open={open}
      onClose={onClose}
      size="min(560px, 100vw)"

      mask={false}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          loading={status === 'running'}
          onClick={() => void start()}
        >
          重新体检
        </Button>
      }
    >
      {(status === 'idle' || status === 'running') && (
        <div style={{ padding: '10px 0' }}>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            正在体检… 一起看重复题、缺分值、缺答案、难度分布与考点覆盖
          </div>
          <Progress percent={progress} status="active" />
          <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginTop: 8 }}>
            一般 10~30 秒；关了抽屉就停止查询，下次打开重新体检。
          </div>
        </div>
      )}

      {status === 'failed' && (
        <Alert
          type="error"
          showIcon
          title={error || '体检失败'}
          action={
            <Button size="small" onClick={() => void start()}>
              重试
            </Button>
          }
        />
      )}

      {status === 'done' && (
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {score === undefined ? (
              <div style={{ fontSize: 28, color: 'var(--bp-text-soft)' }}>—</div>
            ) : (
              <Progress
                type="circle"
                percent={score}
                size={92}
                strokeColor={scoreColor(score)}
                format={(value) => <span style={{ fontSize: 20, fontWeight: 600 }}>{value}</span>}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>{result?.summary || '体检完成，没有给出结论。'}</div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
                分数只做粗排：阻断 {blockers.length} 条 · 建议 {warnings.length} 条
              </div>
            </div>
          </div>

          {result?.advice && (
            <div
              style={{
                border: '1px dashed var(--bp-line)',
                padding: '8px 10px',
                fontSize: 12,
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 2 }}>改进建议</div>
              {result.advice}
            </div>
          )}

          {issues.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: 12 }}>没有发现问题，这份卷子可以直接用</span>}
            />
          ) : (
            <div>
              <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginBottom: 8 }}>
                点「第 N 题」会在画布上选中那道题；面板不拦截点击，可以边看报告边改。
              </div>
              {blockers.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '2px 0 6px' }}>
                  以下问题会让考试出事故，建议开考前改掉：
                </div>
              )}
              {issueList(blockers)}
              {warnings.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '10px 0 6px' }}>
                  以下属于质量建议，不拦发布：
                </div>
              )}
              {issueList(warnings)}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--bp-hint)', lineHeight: 1.8 }}>
            体检读的是已保存的试卷；刚改完还没保存的话，先点「保存」再点「重新体检」，否则看到的是上一版。
          </div>
        </Space>
      )}
    </Drawer>
  );
}
