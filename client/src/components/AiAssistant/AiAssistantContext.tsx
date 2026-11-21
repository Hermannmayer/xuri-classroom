import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { chatWithAi, getAiStatus, type AiChatAction, type AiStatus } from '../../api/ai';
import { usePageContext, type AiPageContextInfo } from './usePageContext';

















export interface AiChatBubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;

  error?: string;

  contextLabel?: string;

  model?: string;

  totalTokens?: number;

  action?: AiChatAction;
}

export interface AiAssistantValue {
  messages: AiChatBubble[];
  sending: boolean;

  status?: AiStatus;
  statusLoading: boolean;

  context: AiPageContextInfo;

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
