/** 显隐/必填规则编辑器：条件构建器 + JSON 序列化到 attribute 字段。 */
import { useMemo } from 'react';
import type { FlatQuestion } from '../schema/flatten';
import type { RuleConfig } from '../schema/rules/buildExpression';
import ConditionBuilder from './ConditionBuilder';

export interface RuleEditorProps {
  value?: string;

  questions: FlatQuestion[];
  onChange: (next: string | undefined) => void;
}

const EMPTY: RuleConfig = { conditionLogic: 'AND', conditionItem: [] };

/** 可视化条件编辑器：题目 → 条件 → 选项/比较值 */
export default function RuleEditor({ value, questions, onChange }: RuleEditorProps) {
  const rule = useMemo<RuleConfig>(() => {
    if (!value) return EMPTY;
    try {
      const parsed = JSON.parse(value) as RuleConfig;
      return parsed?.conditionItem?.length ? parsed : EMPTY;
    } catch {
      return EMPTY;
    }
  }, [value]);

  return (
    <ConditionBuilder
      questions={questions}
      value={rule}
      onChange={(next) => onChange(next.conditionItem.length ? JSON.stringify(next) : undefined)}
    />
  );
}
