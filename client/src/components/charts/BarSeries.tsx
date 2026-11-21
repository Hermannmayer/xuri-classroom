import { useState } from 'react';
import { useReducedMotion, useWidth } from './hooks';
import { ChartEmpty } from './State';
import { fmtInt, labelStep, niceScale, num, tickValues } from './util';

export interface BarSeriesProps {

  data: ReadonlyArray<number | null | undefined>;

  labels?: string[];

  compare?: ReadonlyArray<number | null | undefined>;

  seriesLabel?: string;

  compareLabel?: string;

  height?: number;

  color?: string;

  compareColor?: string;

  unit?: string;
  format?: (value: number) => string;

  tooltipLabels?: string[];
  loading?: boolean;
  error?: string | null;
}


const PAD = { top: 24, right: 8, bottom: 24, left: 42 };
const SOFT = 'var(--bp-text-soft)';
const LINE_SOFT = 'var(--bp-line-soft)';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** 柱状图（近 N 天答卷量） */
export function BarSeries({
  data,
  labels = [],
  compare,
  seriesLabel,
  compareLabel,
  height = 200,
  color = 'var(--bp-blue)',
  compareColor = 'var(--bp-orange)',
  unit,
  format = fmtInt,
  tooltipLabels,
  loading,
  error,
}: BarSeriesProps) {
  const { ref, width } = useWidth(640);
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const values = data.map((value) => num(value));
  const compareValues = (compare ?? []).map((value) => num(value));
  const count = Math.max(values.length, labels.length);
  const hasCompare = compareValues.some((value) => value !== null);

  const finite = [...values, ...(hasCompare ? compareValues : [])].filter((value): value is number => value !== null);

  if (loading) return <ChartEmpty height={height} loading />;
  if (error) return <ChartEmpty height={height} reason={error} />;
  if (count === 0 || finite.length === 0) return <ChartEmpty height={height} reason="这个区间内还没有数据" />;

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = Math.max(1, height - PAD.top - PAD.bottom);
  const { top, step: yStep } = niceScale(Math.max(...finite, 0), 4);
  const band = innerW / count;
  const barW = hasCompare ? Math.min(14, band * 0.3) : Math.min(26, band * 0.62);
  const pairGap = hasCompare ? Math.min(3, band * 0.08) : 0;
  const pairW = hasCompare ? barW * 2 + pairGap : barW;
  const baseline = PAD.top + innerH;
  const yOf = (value: number) => PAD.top + innerH * (1 - value / top);

  const xOfBand = (index: number) => PAD.left + index * band;
  const xOfBar = (index: number) => xOfBand(index) + (band - pairW) / 2;

  const step = labelStep(count, innerW, 46);
  const ticks = tickValues(0, top, yStep);

  const tipName = (index: number) => tooltipLabels?.[index] ?? labels[index] ?? `第 ${index + 1} 天`;
  const tipW = 136;
  const tipH = hasCompare ? 56 : 40;

  /** hover 那一列「最高的那根柱子」的 y，用来把提示框摆在它上方 */
  const columnTop = (index: number) => {
    const candidates: number[] = [];
    const main = values[index];
    if (main !== null && main !== undefined) candidates.push(yOf(main));
    const cmp = compareValues[index];
    if (cmp !== null && cmp !== undefined) candidates.push(yOf(cmp));
    return candidates.length > 0 ? Math.min(...candidates) : baseline;
  };

  const tipX =
    hover === null ? 0 : clamp(xOfBand(hover) + band / 2 - tipW / 2, 2, Math.max(2, width - tipW - 2));
  const tipY = hover === null ? 0 : clamp(columnTop(hover) - tipH - 10, 2, Math.max(2, baseline - tipH));

  const labelOf = (value: number | null | undefined) => (value === null || value === undefined ? '—' : format(value));

  return (
    <div ref={ref} style={{ width: '100%', overflow: 'hidden' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={seriesLabel ? `${seriesLabel}柱状图` : '柱状图'}
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {hasCompare ? (
          <g transform={`translate(${PAD.left} ${PAD.top - 8})`}>
            <rect x={0} y={-7} width={8} height={8} style={{ fill: color }} />
            <text x={12} y={0} fontSize={10} style={{ fill: SOFT }}>
              {seriesLabel ?? '全部'}
            </text>
            <rect x={76} y={-7} width={8} height={8} style={{ fill: compareColor }} />
            <text x={88} y={0} fontSize={10} style={{ fill: SOFT }}>
              {compareLabel ?? '对比'}
            </text>
          </g>
        ) : null}

        {ticks.map((tick, index) => {
          const y = yOf(tick);
          return (
            <g key={`tick-${index}`}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y}
                y2={y}
                style={{ stroke: LINE_SOFT }}
                strokeDasharray={index === 0 ? undefined : '2 4'}
              />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize={10} style={{ fill: SOFT }}>
                {format(Math.round(tick))}
              </text>
            </g>
          );
        })}

        {hover !== null ? (
          <rect
            x={xOfBand(hover)}
            y={PAD.top}
            width={band}
            height={innerH}
            style={{
              fill: 'var(--bp-fill-soft)',
              transition: reduced ? 'none' : 'opacity 120ms ease',
            }}
          />
        ) : null}

        {Array.from({ length: count }, (_, index) => {
          const value = values[index] ?? null;
          const compareValue = hasCompare ? compareValues[index] ?? null : null;
          const x = xOfBar(index);
          const mainY = value === null ? baseline : yOf(value);
          const mainH = Math.max(0, baseline - mainY);
          const cmpY = compareValue === null ? baseline : yOf(compareValue);
          const cmpH = Math.max(0, baseline - cmpY);
          return (
            <g key={`bar-${index}`} onMouseEnter={() => setHover(index)}>
              <rect x={xOfBand(index)} y={PAD.top} width={band} height={innerH} fill="transparent" />
              {mainH > 0 ? (
                <rect
                  x={x}
                  y={mainY}
                  width={barW}
                  height={mainH}
                  opacity={hover === null || hover === index ? 0.95 : 0.55}
                  style={{
                    fill: color,
                    transition: reduced ? 'none' : 'opacity 120ms ease',
                  }}
                />
              ) : null}
              {hasCompare && cmpH > 0 ? (
                <rect
                  x={x + barW + pairGap}
                  y={cmpY}
                  width={barW}
                  height={cmpH}
                  opacity={hover === null || hover === index ? 0.85 : 0.45}
                  style={{
                    fill: compareColor,
                    transition: reduced ? 'none' : 'opacity 120ms ease',
                  }}
                />
              ) : null}
            </g>
          );
        })}

        {Array.from({ length: count }, (_, index) =>
          index % step === 0 ? (
            <text
              key={`x-${index}`}
              x={xOfBand(index) + band / 2}
              y={height - 7}
              textAnchor="middle"
              fontSize={10}
              style={{ fill: SOFT }}
            >
              {labels[index] ?? index + 1}
            </text>
          ) : null,
        )}

        {hover !== null ? (
          <g pointerEvents="none">
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
            <circle cx={tipX + 12} cy={tipY + 28} r={3} style={{ fill: color }} />
            <text x={tipX + 20} y={tipY + 31} fontSize={11} style={{ fill: SOFT }}>
              {seriesLabel ?? '答卷'} {labelOf(values[hover])}
              {unit ?? ''}
            </text>
            {hasCompare ? (
              <>
                <circle cx={tipX + 12} cy={tipY + 44} r={3} style={{ fill: compareColor }} />
                <text x={tipX + 20} y={tipY + 47} fontSize={11} style={{ fill: SOFT }}>
                  {compareLabel ?? '已批改'} {labelOf(compareValues[hover])}
                  {unit ?? ''}
                </text>
              </>
            ) : null}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
