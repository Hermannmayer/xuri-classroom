/** 跳转规则编辑器：触发条件 + 跳转目标，供属性面板的规则弹窗使用。 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Select } from 'antd';
import type { FlatQuestion } from '../schema/flatten';
import { buildJumpRule, parseJumpRule, type JumpRuleConfig } from '../schema/rules/jump';
import type { RuleConfig } from '../schema/rules/buildExpression';
import ConditionBuilder from './ConditionBuilder';

const END_TARGET = '__end__';
const EMPTY_CONDITION: RuleConfig = { conditionLogic: 'AND', conditionItem: [] };

export interface JumpRuleEditorProps {
  value?: string;

  questions: FlatQuestion[];

  targets: FlatQuestion[];
  onChange: (next: string | undefined) => void;
}

/** 属性面板行摘要：未设置 / 始终跳转 → 第 N 题 / K 个条件 → 结束答题 / 配置无法识别 */
export function jumpRuleSummary(raw: string | undefined, questions: FlatQuestion[]): string {
  if (!raw?.trim()) return '未设置';
  const rule = parseJumpRule(raw);
  if (!rule) return '配置无法识别，请重新设置';
  const head = rule.conditionItem.length ? `${rule.conditionItem.length} 个条件` : '始终跳转';
  if (rule.targetType === 'end') return `${head} → 结束答题`;
  const target = questions.find((item) => item.id === rule.targetQuestionId);
  return target ? `${head} → 第 ${target.number ?? '?'} 题` : `${head} → 目标题已删除`;
}

function conditionsOf(rule?: JumpRuleConfig): RuleConfig {
  return rule ? { conditionLogic: rule.conditionLogic, conditionItem: rule.conditionItem } : EMPTY_CONDITION;
}

function shortTitle(question: FlatQuestion): string {
  const title = question.title || question.type;
  return title.length > 24 ? title.slice(0, 24) + '…' : title;
}

/** 弹窗内容：条件为空表示始终跳转，没有目标时不落库 */
export default function JumpRuleEditor({ value, questions, targets, onChange }: JumpRuleEditorProps) {
  const parsed = useMemo(() => parseJumpRule(value), [value]);
  const invalid = Boolean(value?.trim()) && !parsed;
  const [condition, setCondition] = useState<RuleConfig>(() => conditionsOf(parsed));

  useEffect(() => {
    setCondition(conditionsOf(parseJumpRule(value)));
  }, [value]);

  if (invalid) {
    return (
      <div style={{ fontSize: 12 }}>
        <Alert
          type="warning"
          showIcon
          title="跳转配置无法识别"
          description="现有内容是旧版本的 JSON 文本或已经损坏，重置后请重新选择跳转目标。"
        />
        <Button size="small" style={{ marginTop: 8 }} onClick={() => onChange(undefined)}>
          重置配置
        </Button>
      </div>
    );
  }

  const targetType = parsed?.targetType;
  const targetQuestionId = parsed?.targetQuestionId;
  const missingTarget = targetType === 'question' && !targets.some((item) => item.id === targetQuestionId);

  const commit = (
    nextType: JumpRuleConfig['targetType'] | undefined,
    nextTargetId: string | undefined,
    nextCondition: RuleConfig,
  ) => {
    setCondition(nextCondition);
    if (!nextType) return;
    onChange(buildJumpRule({ targetType: nextType, targetQuestionId: nextTargetId, ...nextCondition }));
  };

  const pickTarget = (next?: string) => {
    if (!next) {
      onChange(undefined);
      return;
    }
    if (next === END_TARGET) commit('end', undefined, condition);
    else commit('question', next, condition);
  };

  return (
    <div style={{ fontSize: 12 }}>
      <div className="bp-rule-section">触发条件</div>
      <ConditionBuilder
        questions={questions}
        value={condition}
        onChange={(next) => commit(targetType, targetQuestionId, next)}
        emptyHint="没有条件时 = 始终跳转"
      />
      {condition.conditionItem.length > 0 && (
        <Button size="small" onClick={() => commit(targetType, targetQuestionId, EMPTY_CONDITION)}>
          清空条件
        </Button>
      )}

      <div className="bp-rule-section">跳转到</div>
      <Select
        size="small"
        allowClear
        style={{ width: '100%' }}
        placeholder="选择跳转目标"
        value={targetType === 'end' ? END_TARGET : targetQuestionId}
        showSearch
        optionFilterProp="label"
        options={[
          ...targets.map((item) => ({
            value: item.id,
            label: `${item.number ?? '-'}. ${shortTitle(item)}`,
          })),
          { value: END_TARGET, label: '结束答题（不再显示后面的题，仍需手动交卷）' },
        ]}
        onChange={pickTarget}
      />

      {targets.length === 0 && (
        <div style={{ color: 'var(--bp-orange)', fontSize: 11, marginTop: 6 }}>
          后面没有可跳转的题目，只能选择结束答题
        </div>
      )}
      {missingTarget && (
        <div style={{ color: 'var(--bp-orange)', fontSize: 11, marginTop: 6 }}>
          原来的跳转目标已不存在，请重新选择
        </div>
      )}
      {!targetType && condition.conditionItem.length > 0 && (
        <div style={{ color: 'var(--bp-hint)', fontSize: 10, marginTop: 6 }}>
          选好跳转目标后才会保存这条规则
        </div>
      )}
    </div>
  );
}
