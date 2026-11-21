import type { ReactNode } from 'react';

/**
 * 图表的空态/失败态占位。
 *

 * 至少告诉用户「这里本来有东西，但现在取不到」，而不是留一块空白让人以为页面坏了。
 */
export function ChartEmpty({
  height,
  reason,
  text = '—',
  loading = false,
}: {
  height: number;
  reason?: string | null;
  text?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div
      role="status"
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '0 12px',
        border: '1px dashed var(--bp-line-soft)',
        background: 'var(--bp-fill-weak)',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1.2, color: 'var(--bp-text-soft)' }}>{loading ? '…' : text}</span>
      <span
        style={{
          fontSize: 11,
          lineHeight: 1.5,
          color: 'var(--bp-text-soft)',
          textAlign: 'center',
          maxWidth: 460,
        }}
      >
        {loading ? '正在读取统计…' : reason || '暂无数据'}
      </span>
    </div>
  );
}
