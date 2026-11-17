import { useState } from 'react';
import { ChartEmpty } from './State';
import { fmtInt, num } from './util';

export interface DonutProps {
  /** 各分段的值（null/负数按 0 处理） */
  data: ReadonlyArray<number | null | undefined>;
  /** 各分段名称，与 data 一一对应 */
  labels?: string[];
  /** 分段颜色，缺省用蓝图色板 */
  colors?: string[];
  /** 主色：给第一个分段 */
  color?: string;
  /** 直径（px），默认 168 */
  height?: number;
  /** 圆心小字，默认「合计」 */
  centerLabel?: string;
  /** 圆心大数字；不传则自动求和 */
  centerValue?: number | null;
  /** 数值格式化（图例与圆心用） */
  format?: (value: number) => string;
  /** 单位后缀：人 / 份… */
  unit?: string;
  loading?: boolean;
  error?: string | null;
}

const PALETTE = ['var(--bp-blue)', 'var(--bp-orange)', 'var(--bp-text-soft)', 'var(--bp-blue-strong)'];

/**
 * 环形图（用户构成）。
 *
 * 用 stroke-dasharray 画弧，不写 path 弧线数学：每段一个 circle，
 * dash 长度 = 占比 × 周长，offset 累积。分段之间留一点缝，看起来更清楚。
 *
 * 注意：颜色一律写在 style 里（`style={{ stroke: 'var(--bp-blue)' }}`），
 * 不写 SVG 呈现属性（`stroke="var(--bp-blue)"`）—— 后者不解析 CSS 变量。
 */
export function Donut({
  data,
  labels = [],
  colors,
  color,
  height = 168,
  centerLabel = '合计',
  centerValue,
  format = fmtInt,
  unit,
  loading,
  error,
}: DonutProps) {
  const [active, setActive] = useState<number | null>(null);

  const swatches = colors ?? (color ? [color, ...PALETTE] : PALETTE);
  const values = data.map((value) => {
    const parsed = num(value) ?? 0;
    return parsed > 0 ? parsed : 0;
  });
  const total = values.reduce((sum, value) => sum + value, 0);

  if (loading) return <ChartEmpty height={height} loading />;
  if (error) return <ChartEmpty height={height} reason={error} />;

  const size = Math.max(96, height);
  const stroke = Math.max(10, Math.min(24, Math.round(size * 0.14)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const gap = values.length > 1 ? Math.min(2.5, circumference * 0.008) : 0;

  let cursor = 0;
  const arcs = values.map((value, index) => {
    const fraction = total > 0 ? value / total : 0;
    const length = Math.max(0, fraction * circumference - gap);
    const offset = cursor * circumference + gap / 2;
    cursor += fraction;
    return { index, value, length, offset };
  });

  const centerShown = centerValue === undefined ? format(total) : format(num(centerValue) ?? 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${centerLabel} ${centerShown}`}
        style={{ flex: '0 0 auto', display: 'block' }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          style={{ stroke: 'var(--bp-track)' }}
        />
        {total > 0
          ? arcs.map((arc) =>
              arc.length <= 0 ? null : (
                <circle
                  key={arc.index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  strokeWidth={active === arc.index ? stroke + 3 : stroke}
                  strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                  strokeDashoffset={-arc.offset}
                  transform={`rotate(-90 ${center} ${center})`}
                  opacity={active === null || active === arc.index ? 1 : 0.5}
                  style={{
                    stroke: swatches[arc.index % swatches.length],
                    transition: 'opacity 140ms ease, stroke-width 140ms ease',
                  }}
                  onMouseEnter={() => setActive(arc.index)}
                  onMouseLeave={() => setActive(null)}
                >
                  <title>{`${labels[arc.index] ?? ''} ${format(arc.value)}${unit ?? ''}`}</title>
                </circle>
              ),
            )
          : null}
        <text
          x={center}
          y={center - 2}
          textAnchor="middle"
          fontSize={Math.round(size * 0.16)}
          fontWeight={700}
          style={{
            fill: total > 0 ? 'var(--bp-text)' : 'var(--bp-text-soft)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {total > 0 ? centerShown : '—'}
        </text>
        <text
          x={center}
          y={center + Math.round(size * 0.15)}
          textAnchor="middle"
          fontSize={Math.round(size * 0.075)}
          letterSpacing="0.12em"
          style={{ fill: 'var(--bp-text-soft)' }}
        >
          {centerLabel}
        </text>
      </svg>

      <div style={{ flex: '1 1 120px', minWidth: 110, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(labels.length > 0 ? labels : values.map((_, index) => `第 ${index + 1} 项`)).map((label, index) => {
          const value = values[index] ?? 0;
          const percent = total > 0 ? (value / total) * 100 : null;
          return (
            <div
              key={`${label}-${index}`}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                padding: '1px 2px',
                background: active === index ? 'var(--bp-fill-soft)' : 'transparent',
              }}
            >
              <span style={{ width: 8, height: 8, background: swatches[index % swatches.length], flex: '0 0 auto' }} />
              <span style={{ flex: 1, color: 'var(--bp-text-soft)', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{format(value)}</span>
              <span
                style={{
                  color: 'var(--bp-text-soft)',
                  width: 46,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {percent === null ? '—' : `${percent.toFixed(1)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
