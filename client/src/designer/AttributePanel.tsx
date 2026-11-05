import { Collapse, Form, Input, InputNumber, Select, Switch } from 'antd';
import type { Attribute, SurveySchema } from '../schema/types';
import type { FlatQuestion } from '../schema/flatten';
import { ATTRIBUTE_GROUPS, attributeSchema, type AttributeField } from './attributeSchema';
import RuleEditor from './RuleEditor';
import OptionEditor from './OptionEditor';

export interface AttributePanelProps {
  schema: SurveySchema;
  /** 只回传被改动的字段，由调用方合并进 schema.attribute */
  onChange: (patch: Partial<Attribute>) => void;
  /** 规则条件可选的题目（通常传当前题之前的题） */
  questions?: FlatQuestion[];
  /** 改非 attribute 的节点字段（选项等），由设计器传入 patchNode */
  onPatchNode?: (patch: Partial<SurveySchema>) => void;
}

const ITEM_STYLE = { marginBottom: 12 };

/**
 * 数据驱动的属性面板：字段全部来自 attributeSchema，按 group 折叠。
 * 值直接取自 schema.attribute（受控），不另建表单状态，避免与设计器其它入口互相覆盖。
 */
export function AttributePanel({ schema, onChange, questions, onPatchNode }: AttributePanelProps) {
  const attribute: Attribute = schema.attribute ?? {};

  const set = (key: keyof Attribute, value: unknown) => {
    onChange({ [key]: value } as Partial<Attribute>);
  };

  const renderControl = (field: AttributeField) => {
    const value = attribute[field.key];
    switch (field.control) {
      case 'switch':
        return (
          <Switch checked={Boolean(value)} onChange={(checked) => set(field.key, checked)} />
        );
      case 'number':
        return (
          <InputNumber
            style={{ width: '100%' }}
            value={typeof value === 'number' ? value : undefined}
            onChange={(v) => set(field.key, v ?? undefined)}
          />
        );
      case 'select':
        return (
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder="未设置"
            options={field.options}
            value={value as string | undefined}
            onChange={(v) => set(field.key, v)}
          />
        );
      case 'textarea':
        return (
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 8 }}
            value={(value as string | undefined) ?? ''}
            onChange={(e) => set(field.key, e.target.value)}
          />
        );
      default:
        return (
          <Input
            allowClear
            value={(value as string | undefined) ?? ''}
            onChange={(e) => set(field.key, e.target.value)}
          />
        );
    }
  };

  const renderField = (field: AttributeField) => (
    <Form.Item key={field.key} label={field.label} extra={field.hint} style={ITEM_STYLE}>
      {renderControl(field)}
    </Form.Item>
  );

  /** 规则字段默认收起：四个 textarea 各占一大块，展开才编辑 */
  const renderRuleField = (field: AttributeField) => {
    const raw = attribute[field.key];
    const filled = typeof raw === 'string' && raw.trim().length > 0;
    return (
      <Collapse
        key={field.key}
        size="small"
        ghost
        className="bp-rule-collapse"
        items={[
          {
            key: field.key,
            label: (
              <span style={{ fontSize: 12 }}>
                {field.label}
                {filled ? <span style={{ color: 'var(--bp-orange)', marginLeft: 6 }}>●</span> : null}
              </span>
            ),
            children: (
              <div>
                <Input.TextArea
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  value={(raw as string | undefined) ?? ''}
                  onChange={(e) => set(field.key, e.target.value)}
                />
                {field.hint && <pre className="bp-hint">{field.hint}</pre>}
              </div>
            ),
          },
        ]}
      />
    );
  };

  /** 可视化规则编辑器：显隐 / 必填用条件构建器，其余仍是 JSON（动作语义等 P3） */
  const renderConditionalField = (field: AttributeField) => (
    <div key={field.key} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--bp-text)' }}>{field.label}</div>
      <RuleEditor
        value={attribute[field.key] as string | undefined}
        questions={questions ?? []}
        onChange={(next) => set(field.key, next)}
      />
    </div>
  );

  const items = ATTRIBUTE_GROUPS.map((group) => ({
    key: group,
    label: group,
    children: (
      <div>
        {attributeSchema
          .filter((f) => f.group === group)
          .map((field) => {
            if (group === '规则') {
              const conditional = field.key === 'visibleRule' || field.key === 'requiredRule';
              if (conditional) return renderConditionalField(field);
              return renderRuleField(field);
            }
            return renderField(field);
          })}
      </div>
    ),
  }));

  return (
    <div className="attribute-panel">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          className="bp-title"
          style={{
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {schema.title || schema.id}
        </span>
        <span className="bp-tag">{schema.type}</span>
      </div>
      <hr className="bp-dim" style={{ margin: '0 0 10px' }} />

      {onPatchNode && <OptionEditor schema={schema} onPatch={onPatchNode} />}

      <Form layout="vertical" size="small" requiredMark={false}>
        <Collapse size="small" defaultActiveKey={[...ATTRIBUTE_GROUPS]} items={items} />
      </Form>
    </div>
  );
}

export default AttributePanel;
