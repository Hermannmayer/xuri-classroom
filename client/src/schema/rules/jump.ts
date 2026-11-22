/** 跳转规则（条件 → 跳到后面的题 / 结束答题）的解析、序列化与运行时求值。 */
import { evaluateRule, type EvalContext } from './engine';
import type { ConditionItem, RuleConfig } from './buildExpression';

export type JumpTargetType = 'question' | 'end';

export interface JumpRuleConfig extends RuleConfig {
  targetType: JumpTargetType;
  targetQuestionId?: string;
}

export interface JumpResult {
  targetQuestionId?: string;
  end: boolean;
}

const CONDITION_KINDS: ReadonlySet<string> = new Set([
  'CHECKED',
  'UNCHECKED',
  'ANSWERED',
  'NOT_ANSWERED',
  'SHOW',
  'HIDE',
  '>',
  '<',
  '==',
]);

/** 过滤掉结构不完整的条件项；非数组返回空数组 */
function normalizeConditions(raw: unknown): ConditionItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ConditionItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const qId = typeof record.qId === 'string' ? record.qId.trim() : '';
    const condition = typeof record.condition === 'string' ? record.condition : '';
    if (!qId || !CONDITION_KINDS.has(condition)) continue;
    const next: ConditionItem = { qId, condition: condition as ConditionItem['condition'] };
    if (Array.isArray(record.oId)) {
      next.oId = record.oId.filter((id): id is string => typeof id === 'string' && id !== '');
    }
    if (typeof record.compare === 'string') next.compare = record.compare;
    out.push(next);
  }
  return out;
}

/** 解析 attribute.jumpRule；空值、非法 JSON、缺 targetType 的旧值一律返回 undefined，不抛异常 */
export function parseJumpRule(raw?: string): JumpRuleConfig | undefined {
  if (!raw || !raw.trim()) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  const conditionLogic = record.conditionLogic === 'OR' ? 'OR' : 'AND';
  const conditionItem = normalizeConditions(record.conditionItem);
  const targetType = typeof record.targetType === 'string' ? record.targetType : '';
  if (targetType === 'end') return { targetType: 'end', conditionLogic, conditionItem };
  const targetQuestionId = typeof record.targetQuestionId === 'string' ? record.targetQuestionId.trim() : '';
  if (targetType !== 'question' || !targetQuestionId) return undefined;
  return { targetType: 'question', targetQuestionId, conditionLogic, conditionItem };
}

/** 序列化为 attribute.jumpRule；缺目标题时返回 undefined（表示未配置） */
export function buildJumpRule(config?: JumpRuleConfig): string | undefined {
  if (!config) return undefined;
  const conditionLogic = config.conditionLogic === 'OR' ? 'OR' : 'AND';
  const conditionItem = normalizeConditions(config.conditionItem);
  if (config.targetType === 'end') {
    return JSON.stringify({ targetType: 'end', conditionLogic, conditionItem });
  }
  const targetQuestionId = (config.targetQuestionId ?? '').trim();
  if (!targetQuestionId) return undefined;
  return JSON.stringify({ targetType: 'question', targetQuestionId, conditionLogic, conditionItem });
}

/** 求值跳转：条件成立返回目标（或 end）；条件不成立 / 求值失败 / 未配置返回 undefined，调用方按默认下一题处理 */
export function evaluateJump(rule: JumpRuleConfig | undefined, ctx: EvalContext): JumpResult | undefined {
  if (!rule) return undefined;
  const passes = rule.conditionItem.length
    ? evaluateRule({ conditionLogic: rule.conditionLogic, conditionItem: rule.conditionItem }, ctx)
    : { success: true, result: true };
  if (!passes.success || !passes.result) return undefined;
  if (rule.targetType === 'end') return { end: true };
  return rule.targetQuestionId ? { targetQuestionId: rule.targetQuestionId, end: false } : undefined;
}
