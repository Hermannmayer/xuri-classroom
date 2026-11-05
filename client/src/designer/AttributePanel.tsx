import { Collapse, Form, Input, InputNumber, Select, Switch } from 'antd';
import type { Attribute, SurveySchema } from '../schema/types';
import { ATTRIBUTE_GROUPS, attributeSchema, type AttributeField } from './attributeSchema';

export interface AttributePanelProps {
  schema: SurveySchema;
  /** 只回传被改动的字段，由调用方合并进 schema.attribute */
  onChange: (patch: Partial<Attribute>) => void;
}

const ITEM_STYLE = { marginBottom: 12 };

/**
 * 数据驱动的属性面板：字段全部来自 attributeSchema，按 group 折叠。
 * 值直接取自 schema.attribute（受控），不另建表单状态，避免与设计器其它入口互相覆盖。
 */
export function AttributePanel({ schema, onChange }: AttributePanelProps) {
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

  const items = ATTRIBUTE_GROUPS.map((group) => ({
    key: group,
    label: group,
    children: (
      <div>
        {attributeSchema
          .filter((f) => f.group === group)
          .map((field) => (
            <Form.Item
              key={field.key}
              label={field.label}
              extra={field.hint}
              style={ITEM_STYLE}
            >
              {renderControl(field)}
            </Form.Item>
          ))}
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

      <Form layout="vertical" size="small" requiredMark={false}>
        <Collapse size="small" defaultActiveKey={[...ATTRIBUTE_GROUPS]} items={items} />
      </Form>
    </div>
  );
}

export default AttributePanel;
