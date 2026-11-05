import { useMemo } from 'react';
import { Button, Input, Select, Space } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { FlatQuestion } from '../schema/flatten';
import type { ConditionItem, RuleConfig } from '../schema/rules/buildExpression';

const CONDITIONS = [
  { value: 'CHECKED', label: '选中了' },
  { value: 'UNCHECKED', label: '没有选中' },
  { value: 'ANSWERED', label: '已作答' },
  { value: 'NOT_ANSWERED', label: '未作答' },
  { value: 'SHOW', label: '已显示' },
  { value: 'HIDE', label: '未显示' },
  { value: '>', label: '大于' },
  { value: '<', label: '小于' },
  { value: '==', label: '等于' },
] as const;

const NEEDS_OPTION = new Set(['CHECKED', 'UNCHECKED']);
const NEEDS_VALUE = new Set(['>', '<', '==']);

export interface RuleEditorProps {
  /** RuleConfig 的 JSON 字符串；空串即无条件 */
  value?: string;
  /** 可作为条件来源的题目（通常是当前题之前的题） */
  questions: FlatQuestion[];
  onChange: (next: string | undefined) => void;
}

const EMPTY: RuleConfig = { conditionLogic: 'AND', conditionItem: [] };

/**
 * 可视化条件编辑器：题目 → 条件 → 选项/比较值。
 * 产出的仍然是 RuleConfig JSON，与后端存储格式一致，存量问卷不受影响。
 */
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

  const commit = (next: RuleConfig) =>
    onChange(next.conditionItem.length ? JSON.stringify(next) : undefined);

  const patchItem = (index: number, patch: Partial<ConditionItem>) => {
    commit({
      ...rule,
      conditionItem: rule.conditionItem.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (index: number) =>
    commit({ ...rule, conditionItem: rule.conditionItem.filter((_, i) => i !== index) });

  const questionOptions = questions.map((q) => ({
    value: q.id,
    label: `${q.number ?? '-'}. ${q.title || q.type}`,
  }));

  const optionsOf = (qId: string) =>
    (questions.find((q) => q.id === qId)?.schema.dataSource ?? []).map((o) => ({
      value: o.value,
      label: o.label,
    }));

  return (
    <div style={{ fontSize: 12 }}>
      <Space size={6} style={{ marginBottom: 8 }}>
        <Select
          size="small"
          value={rule.conditionLogic}
          style={{ width: 132 }}
          options={[
            { value: 'AND', label: '满足全部 (AND)' },
            { value: 'OR', label: '满足任一 (OR)' },
          ]}
          onChange={(conditionLogic) => commit({ ...rule, conditionLogic })}
        />
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() =>
            commit({
              ...rule,
              conditionItem: [...rule.conditionItem, { qId: '', condition: 'CHECKED', oId: [] }],
            })
          }
        >
          条件
        </Button>
      </Space>

      {questionOptions.length === 0 && (
        <div style={{ color: 'var(--bp-orange)', fontSize: 11, marginBottom: 6 }}>
          这道题前面没有可引用的题目，先把条件题放在它上面
        </div>
      )}

      {rule.conditionItem.length === 0 && (
        <div style={{ color: 'var(--bp-text-soft)', fontSize: 11 }}>没有条件时规则不生效</div>
      )}

      {rule.conditionItem.map((item, index) => (
        <div
          key={index}
          style={{
            border: '1px dashed var(--bp-line)',
            padding: 8,
            marginBottom: 6,
            background: 'rgba(0,0,0,0.12)',
          }}
        >
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Select
                size="small"
                placeholder="选择题目"
                style={{ flex: 1 }}
                value={item.qId || undefined}
                options={questionOptions}
                showSearch
                optionFilterProp="label"
                onChange={(qId) => patchItem(index, { qId, oId: [] })}
              />
              <Button size="small" type="text" danger icon={<CloseOutlined />} onClick={() => removeItem(index)} />
            </div>
            <Select
              size="small"
              style={{ width: '100%' }}
              value={item.condition}
              options={CONDITIONS as unknown as { value: string; label: string }[]}
              onChange={(condition) => patchItem(index, { condition: condition as ConditionItem['condition'] })}
            />
            {NEEDS_OPTION.has(item.condition) && (
              <Select
                size="small"
                mode="multiple"
                style={{ width: '100%' }}
                placeholder={item.qId ? '选择选项' : '先选题目'}
                disabled={!item.qId}
                value={item.oId ?? []}
                options={optionsOf(item.qId)}
                onChange={(oId: string[]) => patchItem(index, { oId })}
              />
            )}
            {NEEDS_VALUE.has(item.condition) && (
              <Input
                size="small"
                placeholder="比较值，例如 5 或 是"
                value={item.compare ?? ''}
                onChange={(e) => patchItem(index, { compare: e.target.value })}
              />
            )}
          </Space>
        </div>
      ))}
    </div>
  );
}
