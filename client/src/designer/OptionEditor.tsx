import { Button, Input } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { SurveySchema } from '../schema/types';

/**
 * 选项编辑：画布上的题目是只读的，选项只能在这里改。
 * 同时同步 dataSource（渲染用）和 children 里的 Option 节点（答案 key / 计分用）。
 */
export default function OptionEditor({
  schema,
  onPatch,
}: {
  schema: SurveySchema;
  onPatch: (patch: Partial<SurveySchema>) => void;
}) {
  const options = schema.dataSource ?? [];
  if (options.length === 0) return null;

  const sync = (next: { label: string; value: string }[]) => {
    const children = (schema.children ?? []).map((child) => {
      const hit = next.find((option) => option.value === child.id);
      return hit ? { ...child, title: hit.label } : child;
    });
    // 新增的选项要补 Option 节点，答案 key 才能对上
    for (const option of next) {
      if (!children.some((child) => child.id === option.value)) {
        children.push({ id: option.value, title: option.label, type: 'Option', attribute: {} });
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
    sync(options.filter((_, i) => i !== index));
    // 顺带清掉被删选项的 children（避免残留孤儿节点）
    const children = (schema.children ?? []).filter((child) => child.id !== removed.value);
    onPatch({ children });
  };

  const add = () => {
    if (options.length >= 8) return;
    const value = `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    sync([...options, { label: '', value }]);
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>选项</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map((option, index) => (
          <div key={option.value} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 16, fontSize: 11, color: 'var(--bp-text-soft)' }}>
              {String.fromCharCode(65 + index)}
            </span>
            <Input
              size="small"
              value={option.label}
              placeholder={`选项 ${String.fromCharCode(65 + index)}`}
              onChange={(e) => changeLabel(index, e.target.value)}
            />
            <Button
              size="small"
              type="text"
              icon={<DeleteOutlined />}
              disabled={options.length <= 1}
              onClick={() => remove(index)}
            />
          </div>
        ))}
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
    </div>
  );
}
