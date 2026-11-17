/**
 * 左侧 AI 助手侧栏（task-15）。
 *
 * 对外只需要三个东西：
 * - `AiAssistantProvider`：挂在 BasicLayout 里，持有对话历史与页面上下文（全站唯一一份）；
 * - `AiAssistantSidebar`：停靠面板 / 手机抽屉，挂在 provider 里面；
 * - `pushAiAssistantContext`：页面**可选**地把路由表达不了的上下文（当前题目 / 当前答卷）推给侧栏。
 */
export { AiAssistantProvider, useAiAssistant } from './AiAssistantContext';
export type { AiAssistantValue, AiChatBubble } from './AiAssistantContext';
export { default as AiAssistantSidebar } from './AiAssistantSidebar';
export { AI_ASSISTANT_CONTEXT_EVENT, pushAiAssistantContext } from './usePageContext';
export type { AiPageContextInfo, AiPushedContext } from './usePageContext';
