/** 模型目录：维护模型 ID、显示名与单模型参数，模型 ID 列表仍由 AI 网关直接使用。 */
import { useEffect, useState } from 'react';
import { Button, Checkbox, Input, InputNumber, Tag } from 'antd';
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
  UpOutlined,
} from '@ant-design/icons';

export interface ModelMeta {
  displayName?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  inputTypes?: string[];
}

interface Props {
  models: string[];
  modelMeta: Record<string, ModelMeta>;
  defaultModel?: string;
  onChange: (models: string[], modelMeta: Record<string, ModelMeta>) => void;
  onDefaultModelChange: (model?: string) => void;
  onFetch: () => void;
  fetching: boolean;
  canFetch?: boolean;
  fetchHint?: string;
}

export default function AiModelCatalog({
  models,
  modelMeta,
  defaultModel,
  onChange,
  onDefaultModelChange,
  onFetch,
  fetching,
  canFetch = true,
  fetchHint,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const metaOf = (id: string): ModelMeta => modelMeta[id] ?? {};

  const updateMeta = (id: string, patch: Partial<ModelMeta>) => {
    onChange(models, { ...modelMeta, [id]: { ...metaOf(id), ...patch } });
  };

  const rename = (index: number, nextValue: string): boolean => {
    const next = nextValue.trim();
    const old = models[index];
    if (!next || next === old || models.includes(next)) return false;
    const nextModels = [...models];
    nextModels[index] = next;
    const nextMeta = { ...modelMeta };
    if (nextMeta[old]) {
      nextMeta[next] = nextMeta[old];
      delete nextMeta[old];
    }
    if (defaultModel === old) onDefaultModelChange(next);
    setExpanded((prev) => {
      if (!prev.has(old)) return prev;
      const nextSet = new Set(prev);
      nextSet.delete(old);
      nextSet.add(next);
      return nextSet;
    });
    onChange(nextModels, nextMeta);
    return true;
  };

  const remove = (index: number) => {
    const old = models[index];
    const nextModels = models.filter((_, i) => i !== index);
    const nextMeta = { ...modelMeta };
    delete nextMeta[old];
    if (defaultModel === old) onDefaultModelChange(undefined);
    onChange(nextModels, nextMeta);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= models.length) return;
    const next = [...models];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next, modelMeta);
  };

  const add = () => {
    const id = 'model-' + Date.now().toString(36);
    onChange([...models, id], { ...modelMeta, [id]: { inputTypes: ['text'] } });
    setExpanded((prev) => new Set(prev).add(id));
    if (!defaultModel) onDefaultModelChange(id);
  };

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="sk-ai-catalog">
      <div className="sk-ai-catalog-actions">
        <Button
          size="small"
          icon={<CloudDownloadOutlined />}
          loading={fetching}
          disabled={!canFetch}
          title={fetchHint}
          onClick={onFetch}
        >
          获取可用模型
        </Button>
        <Button size="small" icon={<PlusOutlined />} onClick={add}>
          添加模型
        </Button>
      </div>
      {models.length === 0 ? (
        <div className="sk-ai-catalog-empty">还没有模型。先选供应商并获取模型，或手动添加。</div>
      ) : null}
      {!canFetch && fetchHint ? <div className="sk-ai-catalog-empty">{fetchHint}</div> : null}
      {models.map((id, index) => {
        const meta = metaOf(id);
        const isOpen = expanded.has(id);
        return (
          <div className="sk-ai-model-row" key={id}>
            <div className="sk-ai-model-main">
              <ModelIdInput value={id} onCommit={(next) => rename(index, next)} />
              <Input
                value={meta.displayName ?? ''}
                aria-label="模型显示名称"
                placeholder="显示名称（可选）"
                onChange={(event) => updateMeta(id, { displayName: event.target.value })}
              />
              {defaultModel === id ? <Tag color="orange">默认</Tag> : null}
              <Button
                type="text"
                size="small"
                aria-label={isOpen ? '收起模型参数' : '展开模型参数'}
                icon={isOpen ? <UpOutlined /> : <DownOutlined />}
                onClick={() => toggle(id)}
              />
              <Button
                type="text"
                size="small"
                aria-label="上移模型"
                icon={<UpOutlined />}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              />
              <Button
                type="text"
                size="small"
                aria-label="下移模型"
                icon={<DownOutlined />}
                disabled={index === models.length - 1}
                onClick={() => move(index, 1)}
              />
              <Button
                type="text"
                size="small"
                danger
                aria-label="删除模型"
                icon={<DeleteOutlined />}
                onClick={() => remove(index)}
              />
            </div>
            {isOpen ? (
              <div className="sk-ai-model-advanced">
                <label>
                  上下文窗口
                  <InputNumber
                    min={1}
                    value={meta.contextWindow}
                    placeholder="例如 128000"
                    onChange={(value) => updateMeta(id, { contextWindow: value ?? undefined })}
                  />
                </label>
                <label>
                  最大输出 token
                  <InputNumber
                    min={1}
                    value={meta.maxOutputTokens}
                    placeholder="例如 8192"
                    onChange={(value) => updateMeta(id, { maxOutputTokens: value ?? undefined })}
                  />
                </label>
                <label className="sk-ai-model-types">
                  输入类型
                  <Checkbox.Group
                    value={meta.inputTypes ?? ['text']}
                    options={[
                      { label: '文本', value: 'text' },
                      { label: '图片', value: 'image' },
                    ]}
                    onChange={(value) => updateMeta(id, { inputTypes: value as string[] })}
                  />
                </label>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface ModelIdInputProps {
  value: string;
  onCommit: (value: string) => boolean;
}

function ModelIdInput({ value, onCommit }: ModelIdInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (!onCommit(draft)) setDraft(value);
  };

  return (
    <Input
      value={draft}
      aria-label="模型 ID"
      placeholder="模型 ID"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onPressEnter={commit}
    />
  );
}