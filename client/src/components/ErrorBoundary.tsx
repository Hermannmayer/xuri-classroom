import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error?: Error;
}

const CARD_STYLE = {
  maxWidth: 640,
  width: '100%',
  border: '1px solid var(--bp-line)',
  background: 'var(--bp-panel)',
  padding: 28,
} as const;

const PRIMARY_BTN = {
  height: 34,
  padding: '0 16px',
  border: '1px solid var(--bp-primary-border)',
  background: 'var(--bp-primary-bg)',
  color: 'var(--bp-primary-text)',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
} as const;

const PLAIN_BTN = {
  height: 34,
  padding: '0 16px',
  border: '1px solid var(--bp-control-border)',
  background: 'transparent',
  color: 'var(--bp-text)',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
} as const;

/**
 * 全局渲染异常兜底。
 *
 * 之前 `main.tsx` 直接渲染 RouterProvider：任意页面在 render 阶段抛错（例如某个
 * 字段是 undefined 又去 `.map`），React 会卸载整棵树 → 整页白屏、没有任何提示。
 * 这里用 class 组件接住，给出中文兜底页 + 刷新/回首页，技术细节折叠展示（默认不刷屏）。
 *
 * 只捕获 render / 生命周期 / 构造函数里的错误；事件回调和异步请求里的异常仍走
 * 各页面的 message.error（或全局 unhandledrejection），不要把它当万能兜底。
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 控制台留全量信息方便排障；页面默认只显示折叠区，不把堆栈糊在用户脸上
    console.error('[ErrorBoundary] 页面渲染异常', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const details = `${error.name}: ${error.message}\n\n${error.stack ?? ''}`;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bp-bg)',
          color: 'var(--bp-text)',
        }}
      >
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            SYSTEM / 页面异常
          </div>
          <h1 style={{ fontSize: 20, margin: '10px 0 8px', fontWeight: 600 }}>页面出了点问题</h1>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--bp-text-soft)', margin: '0 0 18px' }}>
            当前页面在渲染时发生异常，其它功能不受影响。可以先刷新页面重试；如果反复出现，请把下面的技术细节发给管理员。
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <button type="button" style={PRIMARY_BTN} onClick={() => window.location.reload()}>
              刷新页面
            </button>
            <button
              type="button"
              style={PLAIN_BTN}
              onClick={() => {
                window.location.href = '/home';
              }}
            >
              回首页
            </button>
          </div>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--bp-text-soft)' }}>技术细节</summary>
            <pre
              style={{
                marginTop: 10,
                maxHeight: 240,
                overflow: 'auto',
                fontSize: 11,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                border: '1px dashed var(--bp-line)',
                padding: 10,
                color: 'var(--bp-text-soft)',
              }}
            >
              {details}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
