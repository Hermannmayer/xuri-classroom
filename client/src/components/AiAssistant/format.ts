/**
 * 侧栏里的小格式化工具（与 `pages/survey/ai/AiPaperModal.tsx` 同一口径）。
 *
 * 抽成单独文件是为了让面板组件只关心交互；后续出卷弹窗也可以从这里 import，
 * 免得两处对「万」的写法不一致。
 */

/** 万为单位、0.1 精度：额度这种量级写全数字反而难读 */
export function formatTokens(value?: number): string {
  if (value === undefined || value === null) {
    return '—';
  }
  if (value < 10000) {
    return String(value);
  }
  return (value / 10000).toFixed(1) + ' 万';
}

/** 上限文案：后端约定 null / <=0 表示不限 */
export function limitText(limit?: number): string {
  if (limit === undefined || limit === null || limit <= 0) {
    return '不限';
  }
  return formatTokens(limit);
}
