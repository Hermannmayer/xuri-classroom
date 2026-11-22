import { useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { DeleteOutlined, FontSizeOutlined, PlusOutlined } from '@ant-design/icons';
import RichTextContent from '../components/RichTextContent';
import RichTextEditor from '../components/RichTextEditor';
import { isRichOptionLabel } from '../renderer/questions/answers';
import type { SurveySchema } from '../schema/types';

interface OptionDraft {
  index: number;
  value: string;
}

/** 选项编辑：普通选项直接改文字，富文本选项用弹窗编辑并插入图片 */
export default function OptionEditor({
  schema,
  onPatch,
  ownerType,
  ownerId,
  questionId,
}: {
  schema: SurveySchema;
  onPatch: (patch: Partial<SurveySchema>) => void;
  ownerType?: 'project' | 'repo';
  ownerId?: string;
  questionId?: string;
}) {
  const options = schema.dataSource ?? [];
  const [editing, setEditing] = useState<OptionDraft>();
  const [draft, setDraft] = useState('');
  if (options.length === 0) return null;

  const richOf = (value: string, label: string) => {
    const child = (schema.children ?? []).find((item) => item.id === value);
    return Boolean(child?.attribute?.richTitle) || isRichOptionLabel(label);
  };

  const sync = (next: { label: string; value: string }[]) => {
    const children = (schema.children ?? []).map((child) => {
      const hit = next.find((option) => option.value === child.id);
      if (!hit) return child;
      const attribute = { ...(child.attribute ?? {}) };
      if (isRichOptionLabel(hit.label)) attribute.richTitle = true;
      else delete attribute.richTitle;
      return { ...child, title: hit.label, attribute };
    });

    for (const option of next) {
      if (!children.some((child) => child.id === option.value)) {
        children.push({
          id: option.value,
          title: option.label,
          type: 'Option',
          attribute: isRichOptionLabel(option.label) ? { richTitle: true } : {},
        });
      }
    }
    onPatch({ dataSource: next, children });
  };

  const changeLabel = (index: number, label: string) => {
    sync(options.map((option, i) => (i === index ? { ...option, label } : option)));
  };

  const remove = (index: number) => {
    if (options.length <= 1) return;
    const removed = options[index];
    const nextOptions = options.filter((_, i) => i !== index);
    const children = (schema.children ?? [])
      .filter((child) => child.id !== removed.value)
      .map((child) => {
        const hit = nextOptions.find((option) => option.value === child.id);
        if (!hit) return child;
        const attribute = { ...(child.attribute ?? {}) };
        if (isRichOptionLabel(hit.label)) attribute.richTitle = true;
        else delete attribute.richTitle;
        return { ...child, title: hit.label, attribute };
      });
    for (const option of nextOptions) {
      if (!children.some((child) => child.id === option.value)) {
        children.push({
          id: option.value,
          title: option.label,
          type: 'Option',
          attribute: isRichOptionLabel(option.label) ? { richTitle: true } : {},
        });
      }
    }
    onPatch({ dataSource: nextOptions, children });
  };

  const add = () => {
    if (options.length >= 8) return;
    const value = 'opt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    sync([...options, { label: '', value }]);
  };

  const openRich = (index: number, value: string) => {
    setEditing({ index, value });
    setDraft(options[index]?.label ?? '');
  };

  const saveRich = () => {
    if (!editing) return;
    const html = draft.trim();
    changeLabel(editing.index, html === '<p></p>' ? '' : html);
    setEditing(undefined);
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>选项</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map((option, index) => {
          const rich = richOf(option.value, option.label);
          return (
            <div key={option.value} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ width: 16, fontSize: 11, color: 'var(--bp-text-soft)' }}>
                {String.fromCharCode(65 + index)}
              </span>
              {rich ? (
                <div className="option-rich-preview">
                  <RichTextContent html={option.label} className="rich-text-content" />
                </div>
              ) : (
                <Input
                  size="small"
                  value={option.label}
                  placeholder={'选项 ' + String.fromCharCode(65 + index)}
                  onChange={(e) => changeLabel(index, e.target.value)}
                />
              )}
              <Button
                size="small"
                type="text"
                icon={<FontSizeOutlined />}
                title="富文本 / 图片"
                onClick={() => openRich(index, option.value)}
              />
              <Button
                size="small"
                type="text"
                icon={<DeleteOutlined />}
                disabled={options.length <= 1}
                onClick={() => remove(index)}
              />
            </div>
          );
        })}
      </div>
      <Button
        size="small"
        type="dashed"
        block
        icon={<PlusOutlined />}
        style={{ marginTop: 6 }}
        disabled={options.length >= 8}
        onClick={add}
      >
        添加选项
      </Button>

      <Modal
        open={Boolean(editing)}
        title={'选项 ' + (editing ? String.fromCharCode(65 + editing.index) : '') + ' 富文本'}
        width={680}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
        onOk={saveRich}
        onCancel={() => setEditing(undefined)}
      >
        <RichTextEditor
          value={draft}
          onChange={setDraft}
          minHeight={160}
          placeholder="输入选项文字，可插入图片、公式和加粗"
          ownerType={ownerType}
          ownerId={ownerId}
          questionId={questionId}
        />
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--bp-text-soft)' }}>
          支持在选项里插入图片；保存后按富文本渲染。
        </div>
      </Modal>
    </div>
  );
}
