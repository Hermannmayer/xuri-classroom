/**
 * AI 助手（右下角悬浮对话框）的出口。
 *
 * - `AiAssistantProvider`：全站唯一一份对话状态，挂在 BasicLayout；
 * - `AiAssistantFloat`：悬浮按钮 + 对话框（手机为全屏抽屉）；
 * - `usePageContext` / `pushAiAssistantContext`：页面上下文（路由推断 + 页面主动补充）。
 */
export { AiAssistantProvider, useAiAssistant } from './AiAssistantContext';
export { default as AiAssistantFloat } from './AiAssistantFloat';
export { pushAiAssistantContext, usePageContext } from './usePageContext';
export type { AiPushedContext } from './usePageContext';
