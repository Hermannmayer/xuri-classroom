/**
 * 前端评分口径（唯一出口）——**只用于即时反馈 / 预览**。
 *
 * 最终成绩以服务端 `AnswerScoreEvaluator` 算出的 `exam_score` / `exam_info.questionScore` 为准，
 * 前端这份实现不参与落库、也不会被后端读取。出现「预览判对、服务端 0 分」时以后端为准。
 *
 * 与后端对齐的规则（`AnswerScoreEvaluator#optionValueMatchCorrectAnswer`）：
 * - 正确答案支持用换行分隔多个可接受写法，命中任意一个即算对；
 * - `completeSame`：用户答案与某一条标准答案完全一致；
 * - `contain`：**标准答案包含用户答案**（方向不要写反）；
 * - 选择题按「所选集合 == 正确集合」判定，少选、多选、选错都算错。
 *
 * 与后端的已知差异（都是「前端略宽松」，只影响预览徽标）：
 * 1. 后端是严格 `String#equals` / `String#contains`：不去空白、大小写敏感；
 *    前端默认去掉每行首尾空白并折叠内部连续空白（`normalizeWhitespace`，默认开），
 *    大小写默认**不忽略**（`ignoreCase` 默认关，可用参数打开），因此绝大多数场景与后端一致；
 * 2. 后端按 `"\n"` 切分，答案里若存成 CRLF 会留下 `\r`；前端按 `/\r?\n/` 切分，顺手兼容这种情况。
 */
import type { Attribute, ExamMatchRule } from '../schema/types';

/** 空分/无效分统一显示为「—」，不要显示 0（0 分是有效成绩） */
export const EMPTY_SCORE = '—';

export interface TextMatchOptions {
  /** 判分规则；后端为空时等价于「永远判错」，前端按 completeSame 处理更符合直觉 */
  rule?: ExamMatchRule | null;
  /** 忽略大小写，默认 false（与后端一致） */
  ignoreCase?: boolean;
  /** 去掉首尾空白、折叠内部空白，默认 true（后端不去空白，这里只为了粘贴场景） */
  normalizeWhitespace?: boolean;
}

type NormalizeOptions = Pick<TextMatchOptions, 'ignoreCase' | 'normalizeWhitespace'>;

/** 归一化一段答案文本：默认去首尾空白 + 折叠内部空白；大小写按需处理 */
export function normalizeFreeText(text: string, options: NormalizeOptions = {}): string {
  const { ignoreCase = false, normalizeWhitespace = true } = options;
  const value = normalizeWhitespace ? text.trim().replace(/\s+/g, ' ') : text;
  return ignoreCase ? value.toLowerCase() : value;
}

/**
 * 填空 / 简答的文本判定。
 *
 * @param mine       用户答案（原始文本）
 * @param correctRaw 标准答案原始文本，可含换行分隔的多个可接受写法
 * @param options    判分规则与归一化开关
 */
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

/**
 * 选择题判定：所选集合与正确集合完全一致才算对（与后端 OnlyOne / SelectAll 口径一致）。
 * 传重复 id 不影响结果，按集合比较。
 */
export function sameOptionSet(picked: readonly string[], correct: readonly string[]): boolean {
  const pickedSet = new Set(picked.filter(Boolean));
  const correctSet = new Set(correct.filter(Boolean));
  if (pickedSet.size !== correctSet.size) return false;
  for (const id of pickedSet) {
    if (!correctSet.has(id)) return false;
  }
  return true;
}

/**
 * 是否「人工打分」题：后端 `manual` 模式没有 evaluator，会把这类题直接算 0 分，
 * 前端只做展示（标注「待人工评分」），不要假装已经判分。
 */
export function isManualGraded(attribute?: Partial<Attribute> | null): boolean {
  return attribute?.examAnswerMode === 'manual';
}

/**
 * 是否计为一次作答。
 * 草稿（`tempSave === 0`）不算一次作答，不应出现在成绩单/次数统计里。
 */
export function countsAsAttempt(tempSave?: number | null): boolean {
  return tempSave !== 0;
}

/**
 * 分数展示：null / undefined / NaN / 非数字一律「—」，0 分原样显示 0。
 * 用于成绩单等「没有分数」和「真的 0 分」必须区分开的场景。
 */
export function formatScore(score?: number | null): string {
  return typeof score === 'number' && Number.isFinite(score) ? String(score) : EMPTY_SCORE;
}

/** 排名展示：排名从 1 开始，0 / 负数 / 非数字都视为无效（后端可能因 0 分占位卷算出 0） */
export function formatRank(rank?: number | null): string {
  return typeof rank === 'number' && Number.isFinite(rank) && rank > 0 ? String(rank) : EMPTY_SCORE;
}
