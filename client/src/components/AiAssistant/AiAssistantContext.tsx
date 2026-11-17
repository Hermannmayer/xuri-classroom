import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { chatWithAi, getAiStatus, type AiStatus } from '../../api/ai';
import { usePageContext, type AiPageContextInfo } from './usePageContext';

/**
 * 侧栏 AI 助手的状态容器（挂在 BasicLayout 里，全站唯一一份）。
 *
 * 为什么状态放在布局层而不是侧栏组件里：
 * 1. 对话历史要**跨页面保留**——老师从编辑器跳到报表，刚才那轮对话不该消失（任务要求「会话内保留」）；
 * 2. 侧栏在桌面是停靠面板、在手机上是一个抽屉，两处渲染的是同一份状态；
 * 3. 页面上下文要跟着路由变，而路由只在布局层能拿到。
 *
 * 历史只存在内存里：刷新即丢（任务允许），也就不需要为它设计表和迁移。
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
}

export interface AiAssistantValue {
  messages: AiChatBubble[];
  sending: boolean;
  /** 可用性自检结果；undefined 表示还没拿到（网络抖动时不拦用户） */
  status?: AiStatus;
  statusLoading: boolean;
  /** 当前页面上下文（发给后端之前就显示出来，用户知道 AI 看得到什么） */
  context: AiPageContextInfo;
  /** 桌面端是否展开停靠面板（手机上用抽屉，状态在侧栏组件里） */
  docked: boolean;
  setDocked: (docked: boolean) => void;
  send: (text: string) => Promise<void>;
  clear: () => void;
  refreshStatus: () => void;
}

const AiAssistantContext = createContext<AiAssistantValue | null>(null);

/** 桌面端面板展开状态：记住上次的选择，别每次都手动点开 */
const DOCKED_KEY = 'ai-assistant:docked';

function readDocked(): boolean {
  try {
    return localStorage.getItem(DOCKED_KEY) !== '0';
  } catch {
    return true;
  }
}

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
  const [docked, setDockedState] = useState<boolean>(() => readDocked());

  const setDocked = useCallback((next: boolean) => {
    setDockedState(next);
    try {
      localStorage.setItem(DOCKED_KEY, next ? '1' : '0');
    } catch {
      // 隐私模式禁用了 localStorage：本次会话仍然生效，只是下次进来回到默认展开
    }
  }, []);

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
        };
        messagesRef.current = [...messagesRef.current, bubble];
        setMessages(messagesRef.current);
      } catch (error) {
        const message = (error as Error)?.message || 'AI 暂时不可用，请稍后再试';
        const bubble: AiChatBubble = { id: newBubbleId(), role: 'assistant', content: '', error: message };
        messagesRef.current = [...messagesRef.current, bubble];
        setMessages(messagesRef.current);
        // 多半是「还没配模型 / 额度用完」这类配置问题：顺手刷一次状态，让引导和「去系统设置」浮出来
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
      docked,
      setDocked,
      send,
      clear,
      refreshStatus,
    }),
    [clear, context, docked, messages, refreshStatus, send, sending, setDocked, status, statusLoading],
  );

  return <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>;
}

/** 侧栏内部组件用它拿状态；放在 provider 外面时会直接抛错（比拿到 undefined 再炸更容易定位） */
export function useAiAssistant(): AiAssistantValue {
  const value = useContext(AiAssistantContext);
  if (!value) {
    throw new Error('useAiAssistant 必须在 <AiAssistantProvider> 内使用');
  }
  return value;
}
