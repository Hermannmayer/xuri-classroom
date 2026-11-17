import { useReducedMotion } from './hooks';
import { ChartEmpty } from './State';

export interface ProgressRingProps {
  /** 0~100 的百分数；null = 算不出来（例如 0/0），显示 — */
  percent: number | null | undefined;
  /** 圆环下方的标题 */
  label?: string;
  /** 额外的说明行（例如「已批 120 / 待批 8」） */
  hint?: string;
  /** 直径（px），默认 132 */
  height?: number;
  /** 主色，默认 var(--bp-blue) */
  color?: string;
  /** 中心数字的小数位，默认 1 */
  digits?: number;
  loading?: boolean;
  error?: string | null;
}

/**
 * 圆环进度（及格率 / 批改进度）。
 *
 * 用 stroke-dasharray 画弧：dash 长度 = 百分比 × 周长，rotate(-90) 从 12 点方向开始。
 * 百分比超过 100 或小于 0 时截断，避免画成「反向弧」。
 */
export function ProgressRing({
  percent,
  label,
  hint,
  height = 132,
  color = 'var(--bp-blue)',
  digits = 1,
  loading,
  error,
}: ProgressRingProps) {
  const reduced = useReducedMotion();

  if (loading) return <ChartEmpty height={height} loading />;
  if (error) return <ChartEmpty height={height} reason={error} />;

  const size = Math.max(80, height);
  const stroke = Math.max(8, Math.round(size * 0.075));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const value = percent === null || percent === undefined || !Number.isFinite(percent) ? null : percent;
  const clamped = value === null ? 0 : Math.min(100, Math.max(0, value));
  const arc = (clamped / 100) * circumference;
  const text = value === null ? '—' : `${value.toFixed(digits)}%`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label ?? '进度'} ${text}`}
        style={{ display: 'block' }}
      >
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={stroke} style={{ stroke: 'var(--bp-track)' }} />
        {value !== null && arc > 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${arc} ${circumference}`}
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              stroke: color,
              transition: reduced ? 'none' : 'stroke-dasharray 320ms ease-out',
            }}
          />
        ) : null}
        <text
          x={center}
          y={center + 2}
          textAnchor="middle"
          fontSize={Math.round(size * 0.2)}
          fontWeight={700}
          style={{ fill: value === null ? 'var(--bp-text-soft)' : 'var(--bp-text)', fontVariantNumeric: 'tabular-nums' }}
        >
          {text}
        </text>
      </svg>
      {label ? (
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', letterSpacing: '0.06em' }}>{label}</div>
      ) : null}
      {hint ? <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', textAlign: 'center' }}>{hint}</div> : null}
    </div>
  );
}
