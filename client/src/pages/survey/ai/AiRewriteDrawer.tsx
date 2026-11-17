import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Empty, Radio, Space, Spin, Tag, message } from 'antd';
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { rewriteAiQuestion, type AiRewriteStyle, type AiRewriteSuggestion } from '../../../api/ai';

/**
 * AI 改题（计划文档 §6.3 ②）。
 *
 * 选中题目 -> 侧栏给 3 条改写建议（text + reason）-> 老师挑一条采纳。
 * 采纳只把新题干回传给编辑器（由编辑器写进画布并留 before 快照），
 * 选项 / 分值 / 正确答案一律不动 —— 改的是「怎么问」，不是「考什么」。
 */

/**
 * 题干可能是富文本（Word 导入的题带图片），侧栏里只做纯文本预览：
 * 正则剥标签用于**展示**，不承担消毒职责（React 本身会把内容当文本渲染）。
 */
function plainText(value?: string): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const STYLE_OPTIONS: Array<{ value: AiRewriteStyle; label: string; hint: string }> = [
  { value: 'clear', label: '讲清楚', hint: '补全限定条件，减少歧义' },
  { value: 'neutral', label: '中性', hint: '去掉引导性措辞，措辞更客观' },
  { value: 'shorter', label: '更短', hint: '压掉冗余，题干更紧凑' },
];

export interface AiRewriteDrawerProps {
  open: boolean;
  projectId: string;
  /** 要改的题目；空 = 不打开 */
  questionId?: string;
  /** 当前题干：带上后端就直接拿它改写（题目还没保存也能用） */
  title?: string;
  /** 题型名：让模型知道按什么题型改写 */
  type?: string;
  /** 采纳：把新题干交回编辑器 */
  onAdopt: (text: string, reason?: string) => void;
  onClose: () => void;
}

export default function AiRewriteDrawer({
  open,
  projectId,
  questionId,
  title,
  type,
  onAdopt,
  onClose,
}: AiRewriteDrawerProps) {
  const [style, setStyle] = useState<AiRewriteStyle>('clear');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [suggestions, setSuggestions] = useState<AiRewriteSuggestion[]>([]);
  /**
   * 题干 / 题型放进 ref：它们是随编辑器每次输入都变的 props，
   * 挂进 useCallback 依赖会让「老师打字」也触发重新请求。
   */
  const latestRef = useRef<{ title?: string; type?: string }>({ title, type });
  latestRef.current = { title, type };

  const load = useCallback(
    async (nextStyle: AiRewriteStyle) => {
      if (!projectId || !questionId) return;
      setLoading(true);
      setError(undefined);
      try {
        const res = await rewriteAiQuestion({
          projectId,
          questionId,
          style: nextStyle,
          title: latestRef.current.title,
          type: latestRef.current.type,
        });
        const list = Array.isArray(res?.suggestions) ? res.suggestions.filter((item) => item && item.text) : [];
        setSuggestions(list);
        if (!list.length) setError('AI 没有给出可用建议，请稍后重试');
      } catch (e) {
        // 后端的拒绝原因（额度、AI 未启用、题目不存在）已经是中文，原样展示
        setError((e as Error).message);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [projectId, questionId],
  );

  useEffect(() => {
    if (!open || !questionId) return;
    setStyle('clear');
    setSuggestions([]);
    setError(undefined);
    void load('clear');
  }, [open, questionId, load]);

  const adopt = (suggestion: AiRewriteSuggestion) => {
    onAdopt(suggestion.text, suggestion.reason);
    onClose();
  };

  const copy = async (suggestion: AiRewriteSuggestion) => {
    try {
      await navigator.clipboard.writeText(suggestion.text);
      message.success('建议已复制');
    } catch {
      message.info('复制失败，可手动选中文本');
    }
  };

  return (
    <Drawer
      title="AI 优化题干"
      open={open}
      onClose={onClose}
      size={420}
      destroyOnHidden
      extra={
        <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => void load(style)}>
          换一批
        </Button>
      }
    >
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>当前题干</div>
      <div
        style={{
          border: '1px solid var(--bp-line)',
          padding: '8px 10px',
          fontSize: 12,
          lineHeight: 1.7,
          maxHeight: 132,
          overflow: 'auto',
          marginBottom: 14,
          background: 'var(--bp-panel)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {plainText(title) || '（这道题还没有题干）'}
      </div>

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>改写风格</div>
      <Radio.Group
        value={style}
        onChange={(e) => {
          const next = e.target.value as AiRewriteStyle;
          setStyle(next);
          void load(next);
        }}
        style={{ marginBottom: 6 }}
      >
        <Space wrap>
          {STYLE_OPTIONS.map((item) => (
            <Radio key={item.value} value={item.value}>
              {item.label}
            </Radio>
          ))}
        </Space>
      </Radio.Group>
      <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginBottom: 14 }}>
        {STYLE_OPTIONS.find((item) => item.value === style)?.hint}
      </div>

      {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} title={error} />}

      {loading ? (
        <div style={{ padding: 28, textAlign: 'center' }}>
          <Spin tip="AI 正在改写…">
            <div style={{ height: 40 }} />
          </Spin>
        </div>
      ) : suggestions.length ? (
        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
            共 {suggestions.length} 条建议，选一条采纳：
          </div>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              style={{
                border: '1px solid var(--bp-line)',
                padding: 10,
                marginBottom: 10,
                background: 'var(--bp-panel-strong)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Tag style={{ marginInlineEnd: 0 }}>建议 {index + 1}</Tag>
                <div style={{ flex: 1 }} />
                <Button size="small" type="text" onClick={() => void copy(suggestion)}>
                  复制
                </Button>
                <Button size="small" type="primary" ghost icon={<ThunderboltOutlined />} onClick={() => adopt(suggestion)}>
                  采纳
                </Button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{suggestion.text}</div>
              {suggestion.reason && (
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 6, lineHeight: 1.6 }}>
                  理由：{suggestion.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !error && <Empty description="还没有建议" />
      )}

      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--bp-hint)', lineHeight: 1.8 }}>
        采纳后只替换题干，选项 / 分值 / 正确答案都不动；改动前的题干会留快照，随时可以恢复。
      </div>
    </Drawer>
  );
}
