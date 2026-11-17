import { useId, useState } from 'react';
import { useReducedMotion, useWidth } from './hooks';
import { ChartEmpty } from './State';
import { areaPath, labelStep, niceCeil, num, segments, smoothPath, tickValues } from './util';

export interface AreaTrendProps {
  /** 序列；null = 断点（当天没有分数），折线在这里断开而不是掉到 0 */
  data: ReadonlyArray<number | null | undefined>;
  /** 横轴标签，与 data 一一对应 */
  labels?: string[];
  /** 绘图区高度（px） */
  height?: number;
  /** 主色，默认 var(--bp-blue) */
  color?: string;
  /** y 轴范围；不传按数据自适应（并在两端留余量后取整） */
  domain?: [number, number];
  /** 数值单位：分 / 份… */
  unit?: string;
  format?: (value: number) => string;
  /** tooltip 第一行用更可读的名字（如考试名），缺省用 labels */
  tooltipLabels?: string[];
  /** 是否画数据点，默认 true */
  dots?: boolean;
  loading?: boolean;
  error?: string | null;
}

const PAD = { top: 16, right: 14, bottom: 24, left: 42 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * 面积折线图（平均分走势）。
 *
 * - Catmull-Rom 平滑，null 处断开成多段（缺数据的日期不会画成 0 分）；
 * - 面积用同色渐变填充，颜色全走 --bp-* 变量；
 * - hover 显示竖线 + 数据点 + 提示框。
 */
export function AreaTrend({
  data,
  labels = [],
  height = 200,
  color = 'var(--bp-blue)',
  domain,
  unit,
  format = (value) => value.toFixed(1),
  tooltipLabels,
  dots = true,
  loading,
  error,
}: AreaTrendProps) {
  const { ref, width } = useWidth(640);
  const reduced = useReducedMotion();
  const gradientId = `bp-area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [hover, setHover] = useState<number | null>(null);

  const values = data.map((value) => num(value));
  const count = Math.max(values.length, labels.length);
  const finite = values.filter((value): value is number => value !== null);

  if (loading) return <ChartEmpty height={height} loading />;
  if (error) return <ChartEmpty height={height} reason={error} />;
  if (count === 0 || finite.length === 0) return <ChartEmpty height={height} reason="这个区间内还没有数据" />;

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = Math.max(1, height - PAD.top - PAD.bottom);
  const baseline = PAD.top + innerH;

  let lo: number;
  let hi: number;
  if (domain) {
    [lo, hi] = domain;
  } else {
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    const spread = max - min;
    const pad = spread > 0 ? spread * 0.18 : Math.max(1, Math.abs(max) * 0.1);
    lo = min - pad;
    hi = max + pad;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
    lo = 0;
    hi = 1;
  }
  // 刻度取整：让 y 轴标签落在整数上（分数/份数都不需要小数刻度）
  const step = niceCeil((hi - lo) / 3);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  if (hi <= lo) hi = lo + step;

  const xOf = (index: number) => PAD.left + (count <= 1 ? innerW / 2 : (index / (count - 1)) * innerW);
  const yOf = (value: number) => PAD.top + innerH * (1 - (value - lo) / (hi - lo));
  const parts = segments(values, xOf, yOf);
  const tickStep = labelStep(count, innerW, 44);
  const ticks = tickValues(lo, hi, step);
  const tipName = (index: number) => tooltipLabels?.[index] ?? labels[index] ?? `第 ${index + 1} 点`;
  const tipW = 140;
  const tipH = 40;

  const handleMove = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left + PAD.left;
    const ratio = count <= 1 ? 0 : (x - PAD.left) / innerW;
    const index = clamp(Math.round(ratio * (count - 1)), 0, count - 1);
    setHover(index);
  };

  const hoverValue = hover === null ? null : values[hover] ?? null;
  const hoverX = hover === null ? 0 : xOf(hover);
  const hoverY = hoverValue === null ? baseline : yOf(hoverValue);
  const tipX = hover === null ? 0 : clamp(hoverX + 10, 2, Math.max(2, width - tipW - 2));
  const tipY = hover === null ? 0 : clamp(hoverY - tipH - 8, 2, Math.max(2, baseline - tipH));

  return (
    <div ref={ref} style={{ width: '100%', overflow: 'hidden' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="走势图"
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.32 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>

        {ticks.map((tick, index) => {
          const y = yOf(tick);
          return (
            <g key={`tick-${index}`}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y}
                y2={y}
                style={{ stroke: 'var(--bp-line-soft)' }}
                strokeDasharray={index === 0 ? undefined : '2 4'}
              />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize={10} style={{ fill: 'var(--bp-text-soft)' }}>
                {format(tick)}
              </text>
            </g>
          );
        })}

        {parts.map((part, index) => (
          <path
            key={`area-${index}`}
            d={areaPath(part, baseline)}
            style={{ fill: `url(#${gradientId})` }}
            stroke="none"
          />
        ))}
        {parts.map((part, index) => (
          <path
            key={`line-${index}`}
            d={smoothPath(part)}
            fill="none"
            style={{ stroke: color, transition: reduced ? 'none' : 'opacity 140ms ease' }}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {dots && parts.length > 0 && count <= 60
          ? parts.map((part, partIndex) =>
              part.map((point, pointIndex) => (
                <circle
                  key={`dot-${partIndex}-${pointIndex}`}
                  cx={point.x}
                  cy={point.y}
                  r={2.4}
                  style={{ fill: color }}
                  opacity={0.9}
                />
              )),
            )
          : null}

        {Array.from({ length: count }, (_, index) =>
          index % tickStep === 0 ? (
            <text
              key={`x-${index}`}
              x={xOf(index)}
              y={height - 7}
              textAnchor="middle"
              fontSize={10}
              style={{ fill: 'var(--bp-text-soft)' }}
            >
              {labels[index] ?? index + 1}
            </text>
          ) : null,
        )}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        />

        {hover !== null ? (
          <g pointerEvents="none">
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD.top}
              y2={baseline}
              style={{ stroke: 'var(--bp-line)' }}
              strokeDasharray="3 3"
            />
            {hoverValue !== null ? (
              <circle cx={hoverX} cy={hoverY} r={4} style={{ fill: color, stroke: 'var(--bp-bg)' }} strokeWidth={2} />
            ) : null}
            <rect
              x={tipX}
              y={tipY}
              width={tipW}
              height={tipH}
              style={{ fill: 'var(--bp-modal-bg, var(--bp-panel))', stroke: 'var(--bp-line)' }}
            />
            <text x={tipX + 8} y={tipY + 15} fontSize={11} style={{ fill: 'var(--bp-text)' }}>
              {tipName(hover)}
            </text>
            <text x={tipX + 8} y={tipY + 31} fontSize={11} style={{ fill: 'var(--bp-text-soft)' }}>
              {hoverValue === null ? '当天没有数据' : `${format(hoverValue)}${unit ?? ''}`}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
