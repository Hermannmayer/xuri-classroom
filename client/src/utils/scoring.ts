/** 前端评分口径（唯一出口）——**只用于即时反馈 / 预览** */
import type { Attribute, ExamMatchRule } from '../schema/types';


export const EMPTY_SCORE = '—';

export interface TextMatchOptions {

  rule?: ExamMatchRule | null;

  ignoreCase?: boolean;

  normalizeWhitespace?: boolean;
}

type NormalizeOptions = Pick<TextMatchOptions, 'ignoreCase' | 'normalizeWhitespace'>;

/** 归一化一段答案文本：默认去首尾空白 + 折叠内部空白；大小写按需处理 */
export function normalizeFreeText(text: string, options: NormalizeOptions = {}): string {
  const { ignoreCase = false, normalizeWhitespace = true } = options;
  const value = normalizeWhitespace ? text.trim().replace(/\s+/g, ' ') : text;
  return ignoreCase ? value.toLowerCase() : value;
}

/** 填空 / 简答的文本判定 */
export function matchFreeText(
  mine: string,
  correctRaw: string,
  options: TextMatchOptions = {},
): boolean {
  const { rule, ignoreCase = false, normalizeWhitespace = true } = options;
  const value = normalizeFreeText(mine ?? '', { ignoreCase, normalizeWhitespace });
  if (!value) return false;
  const candidates = (correctRaw ?? '')
    .split(/\r?\n/)
    .map((line) => normalizeFreeText(line, { ignoreCase, normalizeWhitespace }))
    .filter(Boolean);
  if (candidates.length === 0) return false;
  return candidates.some((line) => (rule === 'contain' ? line.includes(value) : line === value));
}

/** 选择题判定：所选集合与正确集合完全一致才算对（与后端 OnlyOne / SelectAll 口径一致） */
export function sameOptionSet(picked: readonly string[], correct: readonly string[]): boolean {
  const pickedSet = new Set(picked.filter(Boolean));
  const correctSet = new Set(correct.filter(Boolean));
  if (pickedSet.size !== correctSet.size) return false;
  for (const id of pickedSet) {
    if (!correctSet.has(id)) return false;
  }
  return true;
}

/** 是否「人工打分」题：后端 `manual` 模式没有 evaluator，会把这类题直接算 0 分， 前端只做展示（标注「待人工评分」），不要假装已经判分 */
export function isManualGraded(attribute?: Partial<Attribute> | null): boolean {
  return attribute?.examAnswerMode === 'manual';
}

/** 是否计为一次作答 */
export function countsAsAttempt(tempSave?: number | null): boolean {
  return tempSave !== 0;
}

/** 分数展示：null / undefined / NaN / 非数字一律「—」，0 分原样显示 0 */
export function formatScore(score?: number | null): string {
  return typeof score === 'number' && Number.isFinite(score) ? String(score) : EMPTY_SCORE;
}

/** 排名展示：排名从 1 开始，0 / 负数 / 非数字都视为无效（后端可能因 0 分占位卷算出 0） */
export function formatRank(rank?: number | null): string {
  return typeof rank === 'number' && Number.isFinite(rank) && rank > 0 ? String(rank) : EMPTY_SCORE;
}
