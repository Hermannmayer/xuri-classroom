/**
 * 手写 SVG 图表的共用小工具。
 *
 * 这里的函数全部是纯函数（不碰 window / document），所以能在 node 里直接冒烟验证
 * （见 client/scripts/smoke-charts.tsx）；组件里只负责把坐标算出来交给 SVG。
 */

export interface Point {
  x: number;
  y: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 把后端/接口里可能出现的 null、undefined、NaN、数字字符串统一收敛成 number | null。
 *
 * 首页的统计接口是并行开发的，字段缺失、JSON 里给字符串数字都可能发生；
 * 图表和卡片只认 number | null，null 一律按「没有这个数据」处理（显示 —）。
 */
export function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** 整数 + 千分位；空值给破折号（首页统一「没数据 = —」） */
export function fmtInt(value: number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return Math.round(value).toLocaleString('zh-CN');
}

/** 保留 digits 位小数；空值给破折号 */
export function fmtDecimal(value: number | null | undefined, digits = 1, fallback = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return value.toFixed(digits);
}

/**
 * 百分数：入参就是 0~100 的百分数（后端 DashboardOverviewView.Scores.passRate 的口径），
 * 只补百分号与位数，不做 0~1 与 0~100 的猜测 —— 猜错会把 1% 显示成 100%。
 */
export function fmtPercent(value: number | null | undefined, digits = 1, fallback = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return `${value.toFixed(digits)}%`;
}

/** 比例 → 0~100 的百分数；分母 <= 0 时返回 null（「0/0」显示 —，不要假装 0%） */
export function ratioPercent(part: number | null | undefined, total: number | null | undefined): number | null {
  if (part === null || part === undefined || total === null || total === undefined) return null;
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null;
  return (part / total) * 100;
}

/** 大数字压缩：12345 → 1.2万（表格里放 token 数用） */
export function fmtCompact(value: number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  const abs = Math.abs(value);
  if (abs >= 1e8) return `${(value / 1e8).toFixed(1)}亿`;
  if (abs >= 1e4) return `${(value / 1e4).toFixed(1)}万`;
  return Math.round(value).toLocaleString('zh-CN');
}

/** 坐标轴取一个「好看」的上界：1 / 2 / 5 × 10^k */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const scaled = value / base;
  if (scaled <= 1.0001) return base;
  if (scaled <= 2.0001) return 2 * base;
  if (scaled <= 5.0001) return 5 * base;
  return 10 * base;
}

/**
 * 算出纵轴的上界与刻度间隔：`top` 一定落在 step 的整数倍上，刻度从 0 到 top 均匀分布。
 *
 * 比「直接 niceCeil(max)」更贴合数据：最大值 129 时给 top=150（刻度 0/50/100/150），
 * 而不是 200（柱子只占 65% 高度，看着像被压扁）。
 */
export function niceScale(max: number, ticks = 4): { top: number; step: number } {
  if (!Number.isFinite(max) || max <= 0) return { top: 1, step: 1 };
  const rough = max / Math.max(1, ticks - 1);
  const step = niceCeil(rough);
  return { top: Math.ceil(max / step) * step, step };
}

/** 从 lo 到 hi 按 step 生成刻度值（含两端，最多 8 个，防呆） */
export function tickValues(lo: number, hi: number, step: number): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isFinite(step) || step <= 0) return [lo, hi];
  const out: number[] = [];
  for (let value = lo; value <= hi + step / 2 && out.length < 8; value += step) out.push(value);
  return out.length >= 2 ? out : [lo, hi];
}

/** 按可用宽度决定横轴标签的抽稀步长（1 = 每个点都显示） */
export function labelStep(count: number, width: number, minGap = 44): number {
  if (count <= 1 || width <= 0) return 1;
  const room = Math.max(1, Math.floor(width / minGap));
  return Math.max(1, Math.ceil(count / room));
}

/** 把带断点（null）的序列切成若干连续段，每段是一组坐标点 */
export function segments(
  values: ReadonlyArray<number | null | undefined>,
  xOf: (index: number) => number,
  yOf: (value: number) => number,
): Point[][] {
  const out: Point[][] = [];
  let current: Point[] = [];
  values.forEach((value, index) => {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      if (current.length > 0) out.push(current);
      current = [];
      return;
    }
    current.push({ x: xOf(index), y: yOf(value) });
  });
  if (current.length > 0) out.push(current);
  return out;
}

/**
 * 平滑折线（Catmull-Rom → 三次贝塞尔，tension 固定 1/6 的等价换算）。
 * 单点时只画一个起点，调用方自己补圆点。
 */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${round2(points[0].x)} ${round2(points[0].y)}`;
  let d = `M ${round2(points[0].x)} ${round2(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const prev = points[i - 1] ?? points[i];
    const start = points[i];
    const end = points[i + 1];
    const next = points[i + 2] ?? end;
    const c1x = start.x + (end.x - prev.x) / 6;
    const c1y = start.y + (end.y - prev.y) / 6;
    const c2x = end.x - (next.x - start.x) / 6;
    const c2y = end.y - (next.y - start.y) / 6;
    d +=
      ` C ${round2(c1x)} ${round2(c1y)}, ${round2(c2x)} ${round2(c2y)}, ` +
      `${round2(end.x)} ${round2(end.y)}`;
  }
  return d;
}

/** 包住折线的面积路径（用于渐变填充） */
export function areaPath(points: Point[], baseline: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${smoothPath(points)} L ${round2(last.x)} ${round2(baseline)} L ${round2(first.x)} ${round2(
    baseline,
  )} Z`;
}
