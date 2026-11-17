import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { chatWithAi, getAiStatus, type AiChatAction, type AiStatus } from '../../api/ai';
import { usePageContext, type AiPageContextInfo } from './usePageContext';

/**
 * AI 助手（右下角悬浮对话框）的状态容器，挂在 BasicLayout 里，全站唯一一份。
 *
 * <p>为什么状态放在布局层而不是对话框组件里：
 * <ol>
 * <li>对话历史要<b>跨页面保留</b>——老师从编辑器跳到报表，刚才那一轮对话不该消失；</li>
 * <li>对话框在桌面是浮层、在手机上是全屏抽屉，两处渲染的是同一份状态；</li>
 * <li>页面上下文要跟着路由变，而路由只在布局层能拿到。</li>
 * </ol>
 *
 * <p>历史只存在内存里：刷新即丢（不落库，也就不需要为它设计表和迁移）。
 *
 * <p>2026-11 起多了一件事：一条助手回复可能带 {@code action}（真的批改了答卷、打开了工具、
 * 给出了统计）。那份结构化结果跟着气泡一起存，界面就能在对话里渲染「进度 / 去查看 / 撤销」。
 */

export interface AiChatBubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 出错时的中文原因（气泡里只显示这段，没有正文） */
  error?: string;
  /** 助手回复时后端实际带上的上下文摘要 */
  contextLabel?: string;
  /** 这次回复用的模型 */
  model?: string;
  /** 这次回复消耗的 token */
  totalTokens?: number;
  /** 这次回复真的干了什么（批改 / 打开工具 / 统计直答） */
  action?: AiChatAction;
}

export interface AiAssistantValue {
  messages: AiChatBubble[];
  sending: boolean;
  /** 可用性自检结果；undefined 表示还没拿到（网络抖动时不拦用户） */
  status?: AiStatus;
  statusLoading: boolean;
  /** 当前页面上下文（发给后端之前就显示出来，用户知道 AI 看得到什么） */
  context: AiPageContextInfo;
  /** 对话框是否展开（不记住上次状态：悬浮按钮每次进站都是收起的，避免挡内容） */
  open: boolean;
  setOpen: (open: boolean) => void;
  send: (text: string) => Promise<void>;
  clear: () => void;
  refreshStatus: () => void;
}

const AiAssistantContext = createContext<AiAssistantValue | null>(null);

let bubbleSeq = 0;

function newBubbleId(): string {
  bubbleSeq += 1;
  return `ai-bubble-${Date.now()}-${bubbleSeq}`;
}

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const context = usePageContext();
  const [messages, setMessages] = useState<AiChatBubble[]>([]);
  const messagesRef = useRef<AiChatBubble[]>([]);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [status, setStatus] = useState<AiStatus>();
  const [statusLoading, setStatusLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const refreshStatus = useCallback(() => {
    setStatusLoading(true);
    getAiStatus()
      .then((next) => setStatus(next))
      // 拿不到状态不算错误：真正的错误会在发送时以中文原因返回，这里不挡用户
      .catch(() => setStatus(undefined))
      .finally(() => setStatusLoading(false));
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sendingRef.current) {
        return;
      }
      const userBubble: AiChatBubble = { id: newBubbleId(), role: 'user', content };
      // 出错的气泡没有正文，不能算进历史（否则下一轮会把「出错了」当成 AI 说过的话发回去）
      const history = [...messagesRef.current, userBubble]
        .filter((item) => !item.error && item.content.trim().length > 0)
        .map((item) => ({ role: item.role, content: item.content }));
      messagesRef.current = [...messagesRef.current, userBubble];
      setMessages(messagesRef.current);
      sendingRef.current = true;
      setSending(true);
      try {
        const reply = await chatWithAi({ messages: history, context: context.payload });
        const bubble: AiChatBubble = {
          id: newBubbleId(),
          role: 'assistant',
          content: reply.reply || '（AI 没有返回内容）',
          contextLabel: reply.contextLabel,
          model: reply.model,
          totalTokens: reply.totalTokens,
          action: reply.action,
        };
        messagesRef.current = [...messagesRef.current, bubble];
        setMessages(messagesRef.current);
      } catch (error) {
        const message = (error as Error)?.message || 'AI 暂时不可用，请稍后再试';
        const bubble: AiChatBubble = { id: newBubbleId(), role: 'assistant', content: '', error: message };
        messagesRef.current = [...messagesRef.current, bubble];
        setMessages(messagesRef.current);
        // 多半是「还没配模型 / 额度用完」这类配置问题：顺手刷一次状态，让引导浮出来
        refreshStatus();
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [context.payload, refreshStatus],
  );

  const clear = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
  }, []);

  const value = useMemo<AiAssistantValue>(
    () => ({
      messages,
      sending,
      status,
      statusLoading,
      context,
      open,
      setOpen,
      send,
      clear,
      refreshStatus,
    }),
    [clear, context, messages, open, refreshStatus, send, sending, status, statusLoading],
  );

  return <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>;
}

/** 组件内部用它拿状态；放在 provider 外面时会直接抛错（比拿到 undefined 再炸更容易定位） */
export function useAiAssistant(): AiAssistantValue {
  const value = useContext(AiAssistantContext);
  if (!value) {
    throw new Error('useAiAssistant 必须在 <AiAssistantProvider> 内使用');
  }
  return value;
}
