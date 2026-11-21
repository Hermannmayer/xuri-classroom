import { Button, Collapse, Form, Input, InputNumber, Select, Switch } from 'antd';
import type { Attribute, SurveySchema } from '../schema/types';
import type { FlatQuestion } from '../schema/flatten';
import { ATTRIBUTE_GROUPS, attributeSchema, type AttributeField } from './attributeSchema';
import RuleEditor from './RuleEditor';
import OptionEditor from './OptionEditor';

export interface AttributePanelProps {
  schema: SurveySchema;

  onChange: (patch: Partial<Attribute>) => void;

  questions?: FlatQuestion[];

  onPatchNode?: (patch: Partial<SurveySchema>) => void;

  scoring?: boolean;
}

const ITEM_STYLE = { marginBottom: 12 };

/** 数据驱动的属性面板：字段全部来自 attributeSchema，按 group 折叠 */
export function AttributePanel({ schema, onChange, questions, onPatchNode, scoring = true }: AttributePanelProps) {
  const attribute: Attribute = schema.attribute ?? {};
  const choiceTypes = new Set(['Radio', 'Checkbox', 'Judge', 'Select']);
  const isChoice = choiceTypes.has(schema.type);
  const isMultiChoice = schema.type === 'Checkbox';
  const isMultipleBlank = schema.type === 'MultipleBlank';
  const optionNodes = (schema.children ?? []).filter((child) => child.type === 'Option' || !child.type);
  const answerOptions = optionNodes.map((child, index) => {
    const letter = String.fromCharCode(65 + index);
    return {
      value: child.id,
      label: schema.type === 'Judge' ? child.title || letter : letter + '. ' + (child.title || '(未填写)'),
    };
  });
  const correctIds = optionNodes
    .filter((child) => Boolean(child.attribute?.examCorrectAnswer))
    .map((child) => child.id);
  const patchChoiceAnswer = (ids: string[]) => {
    if (!onPatchNode) return;
    onPatchNode({
      children: (schema.children ?? []).map((child) => ({
        ...child,
        attribute: { ...child.attribute, examCorrectAnswer: ids.includes(child.id) ? '1' : undefined },
      })),
    });
  };
  const answerText =
    (attribute.examCorrectAnswer as string | undefined) ??
    (schema.children?.[0]?.attribute?.examCorrectAnswer as string | undefined) ??
    '';
  const patchTextAnswer = (value: string, index = 0) => {
    if (isMultipleBlank && schema.children?.[index]) {
      if (!onPatchNode) return;
      onPatchNode({
        children: schema.children.map((child, i) =>
          i === index ? { ...child, attribute: { ...child.attribute, examCorrectAnswer: value } } : child,
        ),
      });
      return;
    }
    if (schema.children?.[0] && onPatchNode) {
      onPatchNode({
        children: schema.children.map((child, i) =>
          i === 0 ? { ...child, attribute: { ...child.attribute, examCorrectAnswer: value } } : child,
        ),
      });
      return;
    }
    onChange({ examCorrectAnswer: value } as Partial<Attribute>);
  };

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

  const items = ATTRIBUTE_GROUPS.filter((group) => scoring || group !== '考试').map((group) => ({
    key: group,
    label: group,
    children: (
      <div>
        {attributeSchema
          .filter((f) => f.group === group)
          .filter((f) => !['required', 'examScore', 'examAnalysis'].includes(String(f.key)))
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
      {onPatchNode && MATRIX_TYPES.has(schema.type) && <MatrixEditor schema={schema} onPatch={onPatchNode} />}

      <Form layout="vertical" size="small" requiredMark={false}>
        {scoring && isChoice ? (
          <Form.Item label="正确答案" extra="选择题答案存在选项节点上，选中后画布/打印/判分都按它来" style={ITEM_STYLE}>
            <Select
              mode={isMultiChoice ? 'multiple' : undefined}
              allowClear
              placeholder="选择正确选项"
              value={isMultiChoice ? correctIds : (correctIds[0] ?? undefined)}
              onChange={(value) =>
                patchChoiceAnswer(Array.isArray(value) ? value : value ? [value] : [])
              }
              options={answerOptions}
            />
          </Form.Item>
        ) : scoring && isMultipleBlank ? (
          <Form.Item label="正确答案（逐空）" style={ITEM_STYLE}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(schema.children ?? []).map((child, index) => (
                <Input
                  key={child.id}
                  value={(child.attribute?.examCorrectAnswer as string | undefined) ?? ''}
                  placeholder={'第 ' + (index + 1) + ' 空答案'}
                  onChange={(e) => patchTextAnswer(e.target.value, index)}
                />
              ))}
            </div>
          </Form.Item>
        ) : scoring ? (
          <Form.Item label="正确答案" style={ITEM_STYLE}>
            <Input
              value={answerText}
              placeholder="填空题/简答题的标准答案"
              onChange={(e) => patchTextAnswer(e.target.value)}
            />
          </Form.Item>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item label="必填" style={{ marginBottom: 12 }}>
            <Switch checked={Boolean(attribute.required)} onChange={(checked) => set('required', checked)} />
          </Form.Item>
          {scoring && (
            <Form.Item label="分值" style={{ marginBottom: 12 }}>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.5}
                value={typeof attribute.examScore === 'number' ? attribute.examScore : undefined}
                onChange={(value) => set('examScore', value ?? undefined)}
              />
            </Form.Item>
          )}
        </div>
        {scoring && (
          <Form.Item label="答案解析" style={{ marginBottom: 12 }}>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 6 }}
              value={(attribute.examAnalysis as string | undefined) ?? ''}
              onChange={(e) => set('examAnalysis', e.target.value)}
            />
          </Form.Item>
        )}
        <Collapse size="small" defaultActiveKey={[]} items={items} />
      </Form>
    </div>
  );
}

const MATRIX_TYPES = new Set(['MatrixRadio', 'MatrixCheckbox', 'MatrixFillBlank', 'MatrixScore', 'MatrixNps']);


function MatrixEditor({
  schema,
  onPatch,
}: {
  schema: SurveySchema;
  onPatch: (patch: Partial<SurveySchema>) => void;
}) {
  const rows = schema.row ?? [];
  const columns = schema.dataSource ?? [];
  const nextId = (prefix: string) => prefix + Math.random().toString(36).slice(2, 8);

  const patchRows = (next: { id: string; title: string }[]) => onPatch({ row: next });
  const patchColumns = (next: { label: string; value: string }[]) => {
    const children = (schema.children ?? []).map((child) => {
      const found = next.find((column) => column.value === child.id);
      return found ? { ...child, title: found.label } : child;
    });
    for (const column of next) {
      if (!children.some((child) => child.id === column.value)) {
        children.push({ id: column.value, title: column.label, type: 'Option', attribute: {} });
      }
    }
    onPatch({ dataSource: next, children });
  };

  return (
    <div style={{ marginBottom: 14, padding: '8px 10px', border: '1px solid var(--bp-line-soft)' }}>
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>矩阵行</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row, index) => (
          <div key={row.id} style={{ display: 'flex', gap: 6 }}>
            <Input
              size="small"
              value={row.title}
              placeholder={'第 ' + (index + 1) + ' 行'}
              onChange={(e) => patchRows(rows.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)))}
            />
            <Button
              size="small"
              danger
              type="text"
              disabled={rows.length <= 1}
              onClick={() => patchRows(rows.filter((_, i) => i !== index))}
            >
              删除
            </Button>
          </div>
        ))}
        <Button size="small" onClick={() => patchRows([...rows, { id: nextId('row_'), title: '新行' }])}>
          添加行
        </Button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '10px 0 6px' }}>矩阵列</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {columns.map((column, index) => (
          <div key={column.value} style={{ display: 'flex', gap: 6 }}>
            <Input
              size="small"
              value={column.label}
              placeholder={'第 ' + (index + 1) + ' 列'}
              onChange={(e) =>
                patchColumns(columns.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)))
              }
            />
            <Button
              size="small"
              danger
              type="text"
              disabled={columns.length <= 1}
              onClick={() => patchColumns(columns.filter((_, i) => i !== index))}
            >
              删除
            </Button>
          </div>
        ))}
        <Button
          size="small"
          onClick={() => patchColumns([...columns, { label: '新列', value: nextId('col_') }])}
        >
          添加列
        </Button>
      </div>
    </div>
  );
}

export default AttributePanel;