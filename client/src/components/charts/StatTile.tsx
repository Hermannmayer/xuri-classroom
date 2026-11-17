import type { CSSProperties, ReactNode } from 'react';
import { segments, smoothPath } from './util';

export interface StatTileProps {
  /** 左上角小标题（指标名） */
  label: string;
  /** 主数字；null/undefined = 没有数据，显示 —；也允许直接传格式化好的字符串 */
  value: number | string | null | undefined;
  /** 数字后缀：人 / 份 / 分… */
  unit?: string;
  /** 副标题：补充口径或第二个数字，一行小字 */
  hint?: ReactNode;
  /** 环比（正数向上、负数向下、0 或空不显示） */
  delta?: number | null;
  /** 环比的单位，默认 % */
  deltaUnit?: string;
  /** 右上角图标 */
  icon?: ReactNode;
  /** 底部迷你走势（可选，最多取最后 20 个点） */
  spark?: ReadonlyArray<number | null>;
  /** 左侧竖条与图标的强调色 */
  tone?: 'blue' | 'orange' | 'plain';
  /** 请求中：主数字显示 … */
  loading?: boolean;
  /** 请求失败的原因：主数字显示 —，原因作为小字提示 */
  error?: string | null;
  /** 整块可点（跳转到明细页） */
  onClick?: () => void;
  /** 可点时的悬浮提示 */
  title?: string;
}

const TONE: Record<NonNullable<StatTileProps['tone']>, string> = {
  blue: 'var(--bp-blue)',
  orange: 'var(--bp-orange)',
  plain: 'var(--bp-line)',
};

/** 主数字：整数带千分位，小数保留一位；空值给破折号 */
function formatValue(value: StatTileProps['value']): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '—';
  if (Number.isInteger(value)) return value.toLocaleString('zh-CN');
  return value.toFixed(1);
}

/** 底部迷你折线：只有形状，没有坐标轴（60×18 的「趋势暗示」） */
function Spark({ values, color }: { values: ReadonlyArray<number | null>; color: string }) {
  const series = values.slice(-20);
  const finite = series.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (finite.length === 0) return null;
  const width = 64;
  const height = 18;
  const max = Math.max(...finite);
  const min = Math.min(...finite);
  const span = max - min || 1;
  const points = segments(
    series,
    (index) => (series.length === 1 ? width / 2 : (index / (series.length - 1)) * width),
    (value) => height - 2 - ((value - min) / span) * (height - 4),
  );
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ marginTop: 2 }}>
      {points.map((part, index) => (
        <path
          key={index}
          d={smoothPath(part)}
          fill="none"
          stroke={color}
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

/**
 * 首页的大数字卡片。
 *
 * 结构：小标题 + 大数字（+单位/环比）+ 一行副标题 + 可选图标/迷你走势。
 * 颜色全部走 --bp-* 变量，因此暗色蓝图与米白图纸两套主题都不用改代码。
 */
export function StatTile({
  label,
  value,
  unit,
  hint,
  delta,
  deltaUnit = '%',
  icon,
  spark,
  tone = 'blue',
  loading,
  error,
  onClick,
  title,
}: StatTileProps) {
  const accent = TONE[tone];
  const failed = Boolean(error);
  const shown = loading ? '…' : failed ? '—' : formatValue(value);
  const muted = loading || failed || value === null || value === undefined;

  const deltaNode =
    !loading && !failed && delta !== null && delta !== undefined && Number.isFinite(delta) && delta !== 0 ? (
      <span
        title="与上一个统计周期的对比"
        style={{
          fontSize: 11,
          lineHeight: '16px',
          padding: '0 5px',
          marginLeft: 6,
          whiteSpace: 'nowrap',
          color: delta > 0 ? 'var(--bp-blue)' : 'var(--bp-orange)',
          border: `1px solid ${delta > 0 ? 'var(--bp-blue-strong)' : 'var(--bp-orange-line)'}`,
        }}
      >
        {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
        {deltaUnit}
      </span>
    ) : null;

  const style: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    height: '100%',
    minHeight: 104,
    padding: '14px 14px 12px 18px',
    border: '1px solid var(--bp-line)',
    background: 'var(--bp-panel-soft)',
    cursor: onClick ? 'pointer' : undefined,
  };

  return (
    <div
      className="bp-corners"
      style={style}
      onClick={onClick}
      title={title}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--bp-text-soft)' }}>{label}</div>
        {icon ? <span style={{ color: accent, fontSize: 15, lineHeight: 1 }}>{icon}</span> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
            color: muted ? 'var(--bp-text-soft)' : 'var(--bp-text)',
          }}
        >
          {shown}
        </span>
        {unit && !failed ? (
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginLeft: 5 }}>{unit}</span>
        ) : null}
        {deltaNode}
      </div>
      {failed ? (
        <div style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--bp-orange)' }} title={error ?? undefined}>
          统计未就绪：{error}
        </div>
      ) : hint ? (
        <div style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--bp-text-soft)' }}>{hint}</div>
      ) : null}
      {!failed && spark && spark.length > 1 ? <Spark values={spark} color={accent} /> : null}
    </div>
  );
}
