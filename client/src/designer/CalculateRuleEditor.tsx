/** 计算规则编辑器：计算方式 + 参与题目 + 系数与小数位，供属性面板的规则弹窗使用。 */
import { Alert, Button, InputNumber, Select } from 'antd';
import type { FlatQuestion } from '../schema/flatten';
import {
  CALCULATE_OPERATION_LABELS,
  CALCULATE_OPERATION_OPTIONS,
  buildCalculateRule,
  parseCalculateRule,
  type CalculateOperation,
  type CalculateRuleConfig,
} from '../schema/rules/calculate';

const DEFAULT_RULE: CalculateRuleConfig = { operation: 'sum', questionIds: [], coefficient: 1, precision: 0 };

export interface CalculateRuleEditorProps {
  value?: string;

  questions: FlatQuestion[];
  onChange: (next: string | undefined) => void;
}

/** 属性面板行摘要：未设置 / 求和 · K 道来源题 [× 系数] [· N 位小数] / 配置无法识别 */
export function calculateRuleSummary(raw?: string): string {
  if (!raw?.trim()) return '未设置';
  const rule = parseCalculateRule(raw);
  if (!rule) return '配置无法识别，请重新设置';
  if (!rule.questionIds.length) return '未设置';
  let text = `${CALCULATE_OPERATION_LABELS[rule.operation]} · ${rule.questionIds.length} 道来源题`;
  if (rule.coefficient !== 1) text += ` × ${rule.coefficient}`;
  if (rule.precision > 0) text += ` · ${rule.precision} 位小数`;
  return text;
}

function shortTitle(question: FlatQuestion): string {
  const title = question.title || question.type;
  return title.length > 24 ? title.slice(0, 24) + '…' : title;
}

/** 弹窗内容：来源题清空即写 undefined，旧配置无法解析时只给提示与重置 */
export default function CalculateRuleEditor({ value, questions, onChange }: CalculateRuleEditorProps) {
  const parsed = parseCalculateRule(value);
  const invalid = Boolean(value?.trim()) && !parsed;

  if (invalid) {
    return (
      <div style={{ fontSize: 12 }}>
        <Alert
          type="warning"
          showIcon
          title="计算配置无法识别"
          description="现有内容是旧版本的 JSON 文本或已经损坏，重置后请重新设置计算方式与参与题目。"
        />
        <Button size="small" style={{ marginTop: 8 }} onClick={() => onChange(undefined)}>
          重置配置
        </Button>
      </div>
    );
  }

  const rule = parsed ?? DEFAULT_RULE;
  const commit = (patch: Partial<CalculateRuleConfig>) => onChange(buildCalculateRule({ ...rule, ...patch }));

  return (
    <div style={{ fontSize: 12 }}>
      <div className="bp-rule-section">计算方式</div>
      <Select
        size="small"
        style={{ width: '100%' }}
        value={rule.operation}
        options={CALCULATE_OPERATION_OPTIONS}
        onChange={(operation: CalculateOperation) => commit({ operation })}
      />

      <div className="bp-rule-section">参与题目</div>
      <Select
        size="small"
        mode="multiple"
        style={{ width: '100%' }}
        placeholder="选择参与计算的题目"
        value={rule.questionIds}
        showSearch
        optionFilterProp="label"
        options={questions.map((item) => ({
          value: item.id,
          label: `${item.number ?? '-'}. ${shortTitle(item)}`,
        }))}
        onChange={(questionIds: string[]) => commit({ questionIds })}
      />

      <div className="bp-rule-section">系数与小数位</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--bp-text-soft)', fontSize: 10, marginBottom: 2 }}>系数</div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            step={0.1}
            value={rule.coefficient}
            onChange={(coefficient) => commit({ coefficient: typeof coefficient === 'number' ? coefficient : 1 })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--bp-text-soft)', fontSize: 10, marginBottom: 2 }}>小数位</div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={4}
            step={1}
            value={rule.precision}
            onChange={(precision) => commit({ precision: typeof precision === 'number' ? precision : 0 })}
          />
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 10, lineHeight: 1.7, color: 'var(--bp-hint)' }}>
        结果会自动填到本题；建议本题设为数字填空或单行文本，且不要把本题选为来源题目。
      </div>
    </div>
  );
}
