/**
 * 规则配置 → 表达式字符串。
 * 移植自逆向产物（前端模块 86343 的 d()），语义与原文逐条对齐。
 *
 * 输入是设计器保存的 RuleConfig（JSON 字符串里解出来的对象），
 * 输出交给 engine.ts 求值。
 */

export interface ConditionItem {
  qId: string;
  condition: 'CHECKED' | 'UNCHECKED' | 'ANSWERED' | 'NOT_ANSWERED' | 'SHOW' | 'HIDE' | '>' | '<' | '==';
  oId?: string[];
  compare?: string;
}

export interface RuleConfig {
  conditionLogic: 'AND' | 'OR';
  conditionItem: ConditionItem[];
}

/**
 * 输出形如 `AND(AND(#{q1.o1} ,#{q1.o2}) ,NOT(#{+q2}))`。
 * 注意分隔符是 " ,"（空格+逗号），求值器按此切分，不要改成 ","。
 */
export function buildExpression(rule: RuleConfig): string {
  const parts: string[] = [];

  for (const item of rule.conditionItem) {
    const { qId, condition } = item;

    if (condition === 'CHECKED' || condition === 'UNCHECKED') {
      const options = (item.oId ?? []).map((o) => `#{${qId}.${o}}`).join(' ,');
      parts.push(condition === 'CHECKED' ? `AND(${options})` : `NOT(AND(${options}))`);
    } else if (condition === 'ANSWERED') {
      parts.push(`AND(#{+${qId}})`);
    } else if (condition === 'NOT_ANSWERED') {
      parts.push(`NOT(#{+${qId}})`);
    } else if (condition === 'SHOW') {
      parts.push(`AND(#{-${qId}})`);
    } else if (condition === 'HIDE') {
      parts.push(`NOT(#{-${qId}})`);
    } else if (condition === '>' || condition === '<' || condition === '==') {
      parts.push(`#{${qId}} ${condition} ${item.compare ?? ''}`);
    }
  }

  return rule.conditionLogic === 'AND' ? `AND(${parts.join(' ,')})` : `OR(${parts.join(' ,')})`;
}

/** 设计器里存的是 JSON 字符串；兼容已经解析过的对象 */
export function parseRule(raw?: string | RuleConfig | null): RuleConfig | undefined {
  if (!raw) return undefined;
  if (typeof raw !== 'string') return raw;
  try {
    const parsed = JSON.parse(raw) as RuleConfig;
    if (parsed && Array.isArray(parsed.conditionItem)) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}
