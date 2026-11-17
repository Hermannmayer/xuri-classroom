import { useEffect, useRef, useState } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import { Alert, Button, Empty, Input, Spin, Tag, Tooltip } from 'antd';
import {
  BarChartOutlined,
  BookOutlined,
  BulbOutlined,
  DeleteOutlined,
  EditOutlined,
  FileAddOutlined,
  MenuFoldOutlined,
  RobotOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAiUsageToday, type AiUsageToday } from '../../api/ai';
import { AI_GUIDE_PATH } from '../../pages/ai-guide/constants';
import { useAiAssistant, type AiChatBubble } from './AiAssistantContext';
import { formatTokens, limitText } from './format';
import { AI_QUICK_ACTIONS, type AiQuickAction } from './quickActions';

/**
 * 侧栏面板本体：头部（状态 / 说明 / 清空 / 收起）+ 上下文行 + 对话区 + 快捷指令 + 输入框。
 *
 * 桌面与手机渲染的是同一个组件，区别只在外面那层容器（停靠列 / 抽屉），见 `AiAssistantSidebar`。
 */

/** 快捷指令的图标：文案在 `quickActions.ts`，图标留在这里（那边保持零依赖的纯数据） */
const QUICK_ICONS: Record<string, ReactNode> = {
  paper: <FileAddOutlined />,
  rewrite: <EditOutlined />,
  explain: <BulbOutlined />,
  grade: <BarChartOutlined />,
};

/** 空会话时的示例问题：点一下填进输入框，给不知道能问什么的人一个起点 */
const EXAMPLES = ['这份试卷的难度分布合理吗？', '帮我出一份 20 题的单元测验', '这道题的考点怎么讲更清楚？'];

export default function AiAssistantPanel({ onCollapse }: { onCollapse?: () => void }) {
  const { messages, sending, status, statusLoading, context, send, clear, refreshStatus } = useAiAssistant();
  const [draft, setDraft] = useState('');
  const [usage, setUsage] = useState<AiUsageToday>();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ComponentRef<typeof Input.TextArea>>(null);
  const navigate = useNavigate();

  /** 状态还没拿到时不拦用户（网络抖动不该让人以为 AI 坏了），明确 false 才禁用输入 */
  const ready = status?.ready !== false;

  // 新消息 / 正在思考时贴到底部：侧栏一屏放不下几轮，不自动滚就会以为没反应
  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages.length, sending]);

  // 用量随每轮回复刷新：让老师知道这一问问掉了多少额度（拿不到就显示提示语，不拦主流程）
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

  /** 快捷指令只填不发：模板的第一句往往还要改成自己的学科/题量 */
  const fill = (action: AiQuickAction) => {
    setDraft(action.prompt(context));
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const usageLine = usage
    ? `今日额度：我 ${formatTokens(usage.userTokens)} / ${limitText(usage.userLimit)} · 全站 ${formatTokens(usage.dailyTokens)} / ${limitText(usage.dailyLimit)}`
    : 'AI 生成内容仅供参考，重要结论请自己核对';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--bp-panel)',
        borderRight: '1px solid var(--bp-line-soft)',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          flex: '0 0 auto',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px 0 12px',
          borderBottom: '1px solid var(--bp-line-soft)',
        }}
      >
        <RobotOutlined style={{ color: 'var(--bp-orange)' }} />
        <span className="bp-title" style={{ fontSize: 12, letterSpacing: '0.08em' }}>
          AI 助手
        </span>
        {status?.ready ? (
          <Tooltip title={status.model ? `当前模型：${status.model}` : undefined}>
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
        <Tooltip title="AI 能做什么、怎么配模型">
          <Button
            type="text"
            size="small"
            aria-label="AI 使用说明"
            icon={<BookOutlined />}
            onClick={() => navigate(AI_GUIDE_PATH)}
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
        {onCollapse && (
          <Tooltip title="收起 AI 侧栏">
            <Button type="text" size="small" aria-label="收起 AI 侧栏" icon={<MenuFoldOutlined />} onClick={onCollapse} />
          </Tooltip>
        )}
      </div>

      {/* 上下文行：发送之前就让用户知道 AI 会看到哪份试卷 */}
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
        title={context.label ? `AI 会看到：${context.label}` : '当前页面没有可用的上下文'}
      >
        {context.label ? `上下文：${context.label}` : '当前页面没有可用的上下文，可以直接问通用问题'}
      </div>

      {/* 未配置模型：直接给引导，而不是让用户打完字才收到 400 */}
      {status && !status.ready && (
        <div style={{ flex: '0 0 auto', padding: '10px 12px 0' }}>
          <Alert
            type="warning"
            showIcon
            title="AI 还没配好"
            description={status.reason || '请先在系统设置里启用 AI 并填写模型与 API Key'}
            action={
              <Button size="small" type="primary" onClick={() => navigate('/system/setting')}>
                去系统设置
              </Button>
            }
          />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--bp-hint)' }}>
            配好之后点下面的「重新检查」就能开始对话；完整的开通步骤见
            <a style={{ marginLeft: 2 }} onClick={() => navigate(AI_GUIDE_PATH)}>
              AI 使用说明
            </a>
            。
          </div>
        </div>
      )}

      {/* 对话区 */}
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
              description={<span style={{ fontSize: 12 }}>可以问试卷、题目、成绩，也可以让我出题</span>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={!ready}
                  onClick={() => {
                    setDraft(example);
                    window.setTimeout(() => inputRef.current?.focus(), 0);
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
            正在想…（最长可能要 120 秒）
          </div>
        )}
      </div>

      {/* 快捷指令 + 输入 */}
      <div style={{ flex: '0 0 auto', borderTop: '1px solid var(--bp-line-soft)', padding: '8px 10px 10px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {AI_QUICK_ACTIONS.map((action) => (
            <Button
              key={action.key}
              size="small"
              icon={QUICK_ICONS[action.key]}
              disabled={!ready || sending}
              onClick={() => fill(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
        <Input.TextArea
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={ready ? '问点什么…（Enter 发送，Shift+Enter 换行）' : 'AI 还没配置好，先按上面的提示配一下模型'}
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

/** 一条消息：用户靠右、助手靠左；出错时只显示错误原因（红色 Alert） */
function Bubble({ bubble }: { bubble: AiChatBubble }) {
  if (bubble.error) {
    return <Alert type="error" showIcon title={bubble.error} />;
  }
  const mine = bubble.role === 'user';
  const meta = [
    bubble.contextLabel ? `已带上：${bubble.contextLabel}` : '',
    bubble.totalTokens ? `${bubble.totalTokens} tokens` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: mine ? '88%' : '100%',
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
    </div>
  );
}
