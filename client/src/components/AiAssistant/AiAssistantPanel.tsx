import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Alert, Button, Empty, Input, Spin, Tag, Tooltip } from 'antd';
import { BookOutlined, CloseOutlined, DeleteOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAiUsageToday } from '../../api/ai';
import type { AiUsageToday } from '../../api/ai';
import { useAiAssistant } from './AiAssistantContext';
import type { AiChatBubble } from './AiAssistantContext';
import AiActionCard from './AiActionCard';
import { AI_TOOL_SHORTCUTS } from './tools';
import { formatTokens, limitText } from './format';














const EXAMPLES = [
  '把这个班没批改的卷子批了吧',
  '这份卷子有什么问题？',
  '从题库给我抽 20 道题组一份单元测验',
  '这次考试考得怎么样？',
];

export default function AiAssistantPanel({ onClose }: { onClose: () => void }) {
  const { messages, sending, status, statusLoading, context, send, clear, refreshStatus } = useAiAssistant();
  const [draft, setDraft] = useState('');
  const [usage, setUsage] = useState<AiUsageToday>();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ComponentRef<typeof Input.TextArea>>(null);
  const navigate = useNavigate();


  const ready = status?.ready !== false;


  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages.length, sending]);


  useEffect(() => {
    if (!ready) {
      return;
    }
    let alive = true;
    void getAiUsageToday()
      .then((value) => {
        if (alive) {
          setUsage(value);
        }
      })
      .catch(() => {
        if (alive) {
          setUsage(undefined);
        }
      });
    return () => {
      alive = false;
    };
  }, [ready, messages.length]);

  const submit = () => {
    const text = draft.trim();
    if (!text || sending || !ready) {
      return;
    }
    setDraft('');
    void send(text);
  };

  const usageLine = usage
    ? '今日额度：我 ' + formatTokens(usage.userTokens) + ' / ' + limitText(usage.userLimit) + ' · 全站 ' + formatTokens(usage.dailyTokens) + ' / ' + limitText(usage.dailyLimit)
    : 'AI 生成内容仅供参考，重要结论请自己核对';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bp-panel)' }}>

      <div
        style={{
          flex: '0 0 auto',
          height: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 8px 0 12px',
          borderBottom: '1px solid var(--bp-line-soft)',
        }}
      >
        <RobotOutlined style={{ color: 'var(--bp-orange)' }} />
        <span className="bp-title" style={{ fontSize: 12, letterSpacing: '0.08em' }}>
          AI 助手
        </span>
        {status?.ready ? (
          <Tooltip title={status.model ? '当前模型：' + status.model : undefined}>
            <Tag color="green" style={{ marginInlineEnd: 0, fontSize: 10 }}>
              {status.model || '已就绪'}
            </Tag>
          </Tooltip>
        ) : status ? (
          <Tag color="orange" style={{ marginInlineEnd: 0, fontSize: 10 }}>
            未配置
          </Tag>
        ) : null}
        <div style={{ flex: 1 }} />
        <Tooltip title="AI 能力说明与模型设置（新标签打开）">
          <Button
            type="text"
            size="small"
            aria-label="AI 使用说明"
            icon={<BookOutlined />}


            style={{ marginInlineEnd: 10 }}
            onClick={() => window.open('/system/setting?tab=ai', '_blank', 'noopener')}
          />
        </Tooltip>
        <Tooltip title={messages.length ? '清空当前对话' : '还没有对话'}>
          <Button
            type="text"
            size="small"
            aria-label="清空对话"
            icon={<DeleteOutlined />}
            disabled={!messages.length}
            onClick={clear}
          />
        </Tooltip>
        <Tooltip title="收起">
          <Button type="text" size="small" aria-label="收起 AI 助手" icon={<CloseOutlined />} onClick={onClose} />
        </Tooltip>
      </div>


      <div
        style={{
          flex: '0 0 auto',
          padding: '5px 12px',
          borderBottom: '1px solid var(--bp-line-soft)',
          fontSize: 11,
          color: 'var(--bp-text-soft)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={context.label ? 'AI 会看到：' + context.label : '当前页面没有可用的上下文'}
      >
        {context.label ? '上下文：' + context.label : '当前页面没有可用的上下文，可以直接问通用问题'}
      </div>


      {status && !status.ready && (
        <div style={{ flex: '0 0 auto', padding: '10px 12px 0' }}>
          <Alert
            type="warning"
            showIcon
            title="AI 还没配好"
            description={status.reason || '请先在系统设置里启用 AI 并填写模型与 API Key'}
            action={
              <Button size="small" type="primary" onClick={() => navigate('/system/setting?tab=ai')}>
                去系统设置
              </Button>
            }
          />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--bp-hint)' }}>
            配好之后点下面的「重新检查」就能开始对话。
          </div>
        </div>
      )}


      <div
        ref={listRef}
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {!messages.length && !sending && (
          <div style={{ paddingTop: 8 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: 12 }}>可以直接让我办事：批卷、组卷、体检题库、写通知</span>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={!ready}
                  onClick={() => {
                    setDraft(example);
                    inputRef.current?.focus();
                  }}
                  style={{
                    textAlign: 'left',
                    cursor: ready ? 'pointer' : 'not-allowed',
                    background: 'var(--bp-panel-strong)',
                    border: '1px solid var(--bp-line-soft)',
                    color: 'var(--bp-text)',
                    padding: '6px 8px',
                    fontSize: 12,
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((bubble) => (
          <Bubble key={bubble.id} bubble={bubble} />
        ))}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--bp-text-soft)' }}>
            <Spin size="small" />
            正在处理…（批改类动作会在后台继续跑，关掉窗口也不影响）
          </div>
        )}
      </div>


      <div style={{ flex: '0 0 auto', borderTop: '1px solid var(--bp-line-soft)', padding: '8px 10px 10px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {AI_TOOL_SHORTCUTS.map((tool) => {
            const link = tool.link(context);
            return (
              <Tooltip key={tool.key} title={link ? '打开「' + tool.label + '」面板' : tool.hint}>
                <Button size="small" disabled={!link} onClick={() => link && navigate(link)}>
                  {tool.label}
                </Button>
              </Tooltip>
            );
          })}
        </div>
        <Input.TextArea
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={ready ? '直接说要做什么，例如「把这个班没批的卷子批了」' : 'AI 还没配置好，先按上面的提示配一下模型'}
          autoSize={{ minRows: 2, maxRows: 5 }}
          maxLength={2000}
          disabled={!ready}
          onPressEnter={(event) => {
            if (event.shiftKey) {
              return;
            }
            event.preventDefault();
            submit();
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{ flex: 1, fontSize: 10, color: 'var(--bp-hint)', lineHeight: 1.5 }}>{usageLine}</span>
          {!ready && status && (
            <Button size="small" loading={statusLoading} onClick={refreshStatus}>
              重新检查
            </Button>
          )}
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            loading={sending}
            disabled={!draft.trim() || !ready}
            onClick={submit}
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}


function Bubble({ bubble }: { bubble: AiChatBubble }) {
  if (bubble.error) {
    return <Alert type="error" showIcon title={bubble.error} />;
  }
  const mine = bubble.role === 'user';
  const meta = [
    bubble.contextLabel ? '已带上：' + bubble.contextLabel : '',
    bubble.totalTokens ? bubble.totalTokens + ' tokens' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: mine ? '88%' : '100%' }}>
        <div
          style={{
            background: mine ? 'var(--bp-blue-weak)' : 'var(--bp-panel-strong)',
            border: '1px solid var(--bp-line-soft)',
            padding: '7px 9px',
            fontSize: 12.5,
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {bubble.content}
          {!mine && meta && <div style={{ marginTop: 4, fontSize: 10, color: 'var(--bp-hint)' }}>{meta}</div>}
        </div>
        {!mine && bubble.action && <AiActionCard action={bubble.action} />}
      </div>
    </div>
  );
}
