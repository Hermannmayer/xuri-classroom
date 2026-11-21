/**
 * 首页图表：全部手写 SVG，不引第三方图表库。
 *
 * 设计约定（所有数据驱动图表共用一套 props 形状）：
 * - `data`：数值序列，null 表示「这个点没有数据」（折线断开、柱子跳过、绝不按 0 画）；
 * - `labels`：与 data 等长的横轴/图例标签；
 * - `height`：绘图区高度（px）；
 * - `color`：主色，取值一律是 CSS 变量字符串（`var(--bp-blue)` 等），
 *   这样暗色蓝图 / 米白图纸两套主题都不用改代码；

 *
 * 另外两个非序列组件：
 * - `StatTile`：大数字卡片（指标名 + 数字 + 环比 + 副标题 + 可选图标/迷你走势）；
 * - `ProgressRing`：单值圆环（`percent` 0~100）。
 *
 * 动效：只做 hover / 进度的过渡，且都受 `prefers-reduced-motion` 控制（见 hooks.ts）；
 * 没有入场动画，页面切换不会闪。
 */
export { StatTile } from './StatTile';
export type { StatTileProps } from './StatTile';
export { Donut } from './Donut';
export type { DonutProps } from './Donut';
export { BarSeries } from './BarSeries';
export type { BarSeriesProps } from './BarSeries';
export { AreaTrend } from './AreaTrend';
export type { AreaTrendProps } from './AreaTrend';
export { ProgressRing } from './ProgressRing';
export type { ProgressRingProps } from './ProgressRing';
export { ChartEmpty } from './State';
export { useReducedMotion, useWidth } from './hooks';
export {
  areaPath,
  fmtCompact,
  fmtDecimal,
  fmtInt,
  fmtPercent,
  labelStep,
  niceCeil,
  niceScale,
  num,
  ratioPercent,
  segments,
  smoothPath,
  tickValues,
} from './util';
export type { Point } from './util';
