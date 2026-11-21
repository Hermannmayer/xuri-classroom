import { useEffect, useState } from 'react';
import { App, Button, Popconfirm, Progress, Space, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getAiJob, undoAiGrade } from '../../api/ai';
import type { AiChatAction, AiGradeBatchResult, AiJobView } from '../../api/ai';

/**
 * 对话里那张「AI 真的做了什么」的卡片。
 *
 * <p>三种形态：
 * <ol>
 * <li>open_tool：给一个「打开」按钮，点了跳到对应页面并自动展开面板（?ai=xxx）；</li>
 * <li>grade_batch：带 jobId，卡片自己轮询进度，批完显示「批了几份 / 几题 / 几题要复核」，
 * 并给「去查看」与「撤销」（24 小时内有效）；</li>

 * </ol>
 *
 * <p>为什么撤销放在这里而不是藏在批改页：批改是 AI 替老师做的，最该有「反悔」的地方
 * 就是它被做出来的那一屏。
 */
export default function AiActionCard({ action }: { action: AiChatAction }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [job, setJob] = useState<AiJobView<unknown>>();
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);


  useEffect(() => {
    if (!action.jobId) {
      return;
    }
    let alive = true;
    let timer = 0;
    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    };
    const load = () => {
      void getAiJob<unknown>(action.jobId as string)
        .then((next) => {
          if (!alive) return;
          setJob(next);
          if (next.status === 'done' || next.status === 'failed') {
            stop();
          }
        })
        .catch(() => {

          if (alive) setJob({ status: 'failed', error: '任务已过期（后端重启过），请重新发起' });
          stop();
        });
    };
    load();
    timer = window.setInterval(load, 2000);
    return () => {
      alive = false;
      stop();
    };
  }, [action.jobId]);

  const undo = async () => {
    if (!action.undoToken) return;
    setUndoing(true);
    try {
      const result = await undoAiGrade(action.undoToken);
      setUndone(true);
      message.success('已撤销：' + (result.answers ?? 0) + ' 份答卷的 AI 打分已清空');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setUndoing(false);
    }
  };

  const running = job?.status === 'queued' || job?.status === 'running';
  const failed = job?.status === 'failed';
  const result = (job?.result ?? undefined) as Partial<AiGradeBatchResult> | undefined;
  const low = result?.lowConfidence ?? [];

  return (
    <div
      style={{
        border: '1px solid var(--bp-line)',
        background: 'var(--bp-panel-strong)',
        padding: '8px 10px',
        marginTop: 6,
        fontSize: 12,
        lineHeight: 1.7,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Tag color={failed ? 'red' : running ? 'blue' : 'green'} style={{ marginInlineEnd: 0, fontSize: 10 }}>
          {failed ? '失败' : running ? '进行中' : action.key === 'open_tool' ? '已定位' : '完成'}
        </Tag>
        <span className="bp-title" style={{ fontSize: 12 }}>
          {action.title || 'AI 动作'}
        </span>
      </div>

      {action.summary && <div style={{ color: 'var(--bp-text-soft)' }}>{action.summary}</div>}

      {action.jobId && (
        <div style={{ marginTop: 6 }}>
          {running && <Progress percent={job?.progress ?? 0} size="small" status="active" />}
          {failed && <div style={{ color: 'var(--bp-red)' }}>{job?.error || '任务失败，请重试'}</div>}
          {job?.status === 'done' && (
            <div>
              {result?.summary || '已完成。'}
              {low.length > 0 && (
                <div style={{ color: 'var(--bp-orange)', marginTop: 2 }}>
                  其中 {low.length} 道置信度偏低，建议人工复核：
                  {low
                    .slice(0, 3)
                    .map((row) => (row.answererName || '匿名') + (row.questionTitle ? ' · ' + row.questionTitle : ''))
                    .join('；')}
                  {low.length > 3 ? ' …' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Space size={6} style={{ marginTop: 8, flexWrap: 'wrap' }}>
        {action.link && (
          <Button size="small" type="primary" onClick={() => navigate(action.link as string)}>
            {action.tool ? '打开工具' : '去查看'}
          </Button>
        )}
        {action.undoToken && !undone && (
          <Popconfirm
            title="撤销这次 AI 批改？"
            description="只清空这次写入的分数，老师手工给的分不受影响。"
            okText="撤销"
            cancelText="算了"
            onConfirm={() => void undo()}
          >
            <Button size="small" danger loading={undoing}>
              撤销批改
            </Button>
          </Popconfirm>
        )}
      </Space>
    </div>
  );
}
