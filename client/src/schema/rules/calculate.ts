/** 计算规则（来源题 → 运算 → 结果回填本题）的解析、序列化与运行时求值。 */
import type { QuestionType } from '../types';

export type CalculateOperation = 'sum' | 'avg' | 'product' | 'max' | 'min' | 'count';

export interface CalculateRuleConfig {
  operation: CalculateOperation;
  questionIds: string[];
  coefficient: number;
  precision: number;
}

export const CALCULATE_OPERATION_LABELS: Record<CalculateOperation, string> = {
  sum: '求和',
  avg: '平均值',
  product: '乘积',
  max: '最大值',
  min: '最小值',
  count: '计数',
};

export const CALCULATE_OPERATIONS: CalculateOperation[] = ['sum', 'avg', 'product', 'max', 'min', 'count'];

export const CALCULATE_OPERATION_OPTIONS: { value: CalculateOperation; label: string }[] = CALCULATE_OPERATIONS.map(
  (value) => ({ value, label: CALCULATE_OPERATION_LABELS[value] }),
);

export const CALCULATE_TARGET_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>([
  'FillBlank',
  'Textarea',
  'HorzBlank',
]);

const OPERATION_SET: ReadonlySet<string> = new Set<string>(CALCULATE_OPERATIONS);

/** 小数位收敛到 0-4，非法值按 0 */
export function normalizePrecision(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.min(4, Math.max(0, Math.round(value)));
}

/** 系数非法值按 1 */
export function normalizeCoefficient(raw: unknown): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : 1;
}

/** 解析 attribute.calculate；空值、非法 JSON、缺 operation 的旧值一律返回 undefined，不抛异常 */
export function parseCalculateRule(raw?: string): CalculateRuleConfig | undefined {
  if (!raw || !raw.trim()) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  const operation = typeof record.operation === 'string' ? record.operation : '';
  if (!OPERATION_SET.has(operation)) return undefined;
  const questionIds = Array.isArray(record.questionIds)
    ? Array.from(
        new Set(
          record.questionIds
            .filter((id): id is string => typeof id === 'string')
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      )
    : [];
  return {
    operation: operation as CalculateOperation,
    questionIds,
    coefficient: normalizeCoefficient(record.coefficient),
    precision: normalizePrecision(record.precision),
  };
}

/** 序列化为 attribute.calculate；没有来源题返回 undefined（表示未配置） */
export function buildCalculateRule(config?: CalculateRuleConfig): string | undefined {
  if (!config || !config.questionIds.length) return undefined;
  return JSON.stringify({
    operation: config.operation,
    questionIds: config.questionIds,
    coefficient: normalizeCoefficient(config.coefficient),
    precision: normalizePrecision(config.precision),
  });
}

/** 从一道题的答案取数值：未作答返回 undefined，有作答但不是数字按 0，对象取第一个空位 */
export function sourceNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return undefined;
    const value = Number(text);
    return Number.isFinite(value) ? value : 0;
  }
  if (Array.isArray(raw)) return undefined;
  if (typeof raw === 'object') {
    const values = Object.values(raw as Record<string, unknown>);
    if (!values.length) return undefined;
    return sourceNumber(values[0]);
  }
  return undefined;
}

/** 按规则计算：来源全为空返回 undefined（调用方应清空目标题），否则返回按小数位四舍五入后的结果 */
export function calculateValue(
  rule: CalculateRuleConfig,
  read: (questionId: string) => unknown,
): number | undefined {
  const numbers: number[] = [];
  for (const questionId of rule.questionIds) {
    const value = sourceNumber(read(questionId));
    if (value !== undefined) numbers.push(value);
  }
  if (!numbers.length) return undefined;
  let result: number;
  switch (rule.operation) {
    case 'avg':
      result = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      break;
    case 'product':
      result = numbers.reduce((product, value) => product * value, 1);
      break;
    case 'max':
      result = Math.max(...numbers);
      break;
    case 'min':
      result = Math.min(...numbers);
      break;
    case 'count':
      result = numbers.length;
      break;
    default:
      result = numbers.reduce((sum, value) => sum + value, 0);
  }
  const scaled = result * normalizeCoefficient(rule.coefficient);
  if (!Number.isFinite(scaled)) return undefined;
  const factor = 10 ** normalizePrecision(rule.precision);
  return Math.round(scaled * factor) / factor;
}
