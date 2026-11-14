import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Steps,
  Tabs,
  Tag,
  Upload,
  message,
} from 'antd';
import { InboxOutlined, WarningOutlined } from '@ant-design/icons';
import type { SurveySchema } from '../../schema/types';
import { parseImport, type ImportFormat, type ImportPreview } from '../../api/import';

export type ImportDestination =
  | { type: 'new-paper' }
  | { type: 'new-group'; title: string }
  | { type: 'existing-group'; groupId: string }
  | { type: 'repo' };

export interface ImportSubmitPayload {
  preview: ImportPreview;
  destination: ImportDestination;
  sourceText?: string;
}

interface Props {
  open: boolean;
  target: 'paper' | 'repo';
  /** 允许的来源；不传时只开放文本 */
  formats?: ImportFormat[];
  /** 从列表新建时：要创建的试卷名 */
  paperName?: string;
  /** 题库导入时：题库名 */
  repoName?: string;
  /** 从某个题组进来时的预选值 */
  presetGroupId?: string;
  /** 当前试卷已有题组，用于“导入到现有题组” */
  groups?: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSubmit: (payload: ImportSubmitPayload) => Promise<void>;
}

const FORMAT_LABEL: Record<ImportFormat, string> = {
  word: 'Word 试卷',
  excel: 'Excel 表格',
  text: '文本',
  json: 'JSON 备份',
};

const FORMAT_HINT: Record<ImportFormat, string> = {
  word: '整卷含大题（即将开放）',
  excel: '按题型分表（即将开放）',
  text: '粘贴题目文本',
  json: '系统导出的备份（即将开放）',
};

const TYPE_LABEL: Record<string, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  MultipleBlank: '多填空',
  Textarea: '简答',
  QuestionSet: '题组',
};

const SAMPLE = [
  '办公安全知识考试',
  '请认真阅读题目后作答。【欢迎语】',
  '',
  '离开工位时，应如何保护电脑中的信息？（10分）【单选题】',
  '直接离开',
  '锁定电脑屏幕（正确答案）',
  '关闭显示器即可',
  '答案解析：锁定屏幕可以防止他人未经授权访问电脑。',
  '',
  '下列哪些属于强密码特征？（5分）【多选题】',
  'A. 长度超过 12 位（正确答案）',
  'B. 包含大小写与数字（正确答案）',
  'C. 使用生日',
  '',
  '公司的英文缩写是______。（5分）【填空题】',
  '答案：XURI',
].join('\n');

function answerSummary(question: SurveySchema): string {
  if (question.type === 'Radio' || question.type === 'Checkbox' || question.type === 'Judge') {
    const letters = (question.children ?? [])
      .map((child, index) => (child.attribute?.examCorrectAnswer ? String.fromCharCode(65 + index) : ''))
      .filter(Boolean);
    return letters.length ? '答案 ' + letters.join('') : '未设答案';
  }
  const text = (question.children ?? [])
    .map((child) => child.attribute?.examCorrectAnswer)
    .filter(Boolean)
    .join(' / ');
  return text ? '答案 ' + text : '未设答案';
}

function subsetPreview(preview: ImportPreview, selected: Set<string>): ImportPreview {
  const flat = preview.flat.filter((item) => selected.has(item.id));
  const children = (preview.tree?.children ?? [])
    .map((node) => {
      if (node.type === 'QuestionSet') {
        const kept = (node.children ?? []).filter((child) => selected.has(child.id));
        return kept.length ? { ...node, children: kept } : null;
      }
      return selected.has(node.id) ? node : null;
    })
    .filter(Boolean) as SurveySchema[];
  const byType: Record<string, number> = {};
  let score = 0;
  for (const item of flat) {
    byType[item.type] = (byType[item.type] ?? 0) + 1;
    score += item.attribute?.examScore ?? 5;
  }
  return {
    ...preview,
    tree: { ...preview.tree, children },
    flat,
    stats: { ...preview.stats, total: flat.length, score, byType },
  };
}

export default function ImportWizard({
  open,
  target,
  formats = ['text'],
  paperName,
  repoName,
  presetGroupId,
  groups = [],
  onClose,
  onSubmit,
}: Props) {
  const [step, setStep] = useState(0);
  const [format, setFormat] = useState<ImportFormat>(formats[0] ?? 'text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | undefined>();
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ImportPreview>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destType, setDestType] = useState<'new-group' | 'existing-group'>('new-group');
  const [groupTitle, setGroupTitle] = useState('导入的题目');
  const [groupId, setGroupId] = useState<string | undefined>(presetGroupId ?? groups[0]?.id);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFormat(formats[0] ?? 'text');
    setText('');
    setFile(undefined);
    setPreview(undefined);
    setSelected(new Set());
    setDestType('new-group');
    setGroupTitle('导入的题目');
    setGroupId(presetGroupId ?? groups[0]?.id);
    // 只在打开时重置；groups/formats 变化不应清空用户已填内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const warnings = preview?.warnings ?? [];
  const stats = preview?.stats;

  const doParse = async () => {
    if (format === 'text' && !text.trim()) {
      message.warning('请先粘贴题目文本');
      return;
    }
    if (format !== 'text' && !file) {
      message.warning('请先选择文件');
      return;
    }
    setParsing(true);
    try {
      const result = await parseImport({ kind: format, text: format === 'text' ? text : undefined, file, target });
      if (!result.flat?.length) {
        message.warning('没有识别到题目，请检查格式');
        return;
      }
      setPreview(result);
      setSelected(new Set(result.flat.map((item) => item.id)));
      setStep(1);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked && preview ? new Set(preview.flat.map((item) => item.id)) : new Set());
  };

  const selectable = target !== 'repo';

  const submit = async () => {
    if (!preview) return;
    // 题库导入走服务端重新解析文本，逐题剔除无法传递，因此整批导入
    const finalPreview = selectable ? subsetPreview(preview, selected) : preview;
    if (!finalPreview.flat.length) {
      message.warning('请至少保留一道题');
      return;
    }
    let destination: ImportDestination;
    if (target === 'repo') {
      destination = { type: 'repo' };
    } else if (paperName) {
      destination = { type: 'new-paper' };
    } else if (destType === 'existing-group') {
      if (!groupId) {
        message.warning('请选择题组');
        return;
      }
      destination = { type: 'existing-group', groupId };
    } else {
      if (!groupTitle.trim()) {
        message.warning('请填写题组名称');
        return;
      }
      destination = { type: 'new-group', title: groupTitle.trim() };
    }
    setSubmitting(true);
    try {
      await onSubmit({ preview: finalPreview, destination, sourceText: format === 'text' ? text : undefined });
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = () => {
    if (step === 0) {
      return [
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="parse" type="primary" loading={parsing} onClick={doParse}>
          解析并预览
        </Button>,
      ];
    }
    if (step === 1) {
      return [
        <Button key="prev" onClick={() => setStep(0)}>
          上一步
        </Button>,
        <Button key="next" type="primary" disabled={!selected.size} onClick={() => setStep(2)}>
          下一步
        </Button>,
      ];
    }
    return [
      <Button key="prev" onClick={() => setStep(1)}>
        上一步
      </Button>,
      <Button key="submit" type="primary" loading={submitting} onClick={submit}>
        {target === 'repo' ? '导入题库' : paperName ? '导入并创建' : '导入到试卷'}
      </Button>,
    ];
  };

  const selectedAll = Boolean(preview && preview.flat.length && selected.size === preview.flat.length);
  const indeterminate = Boolean(selected.size && preview && selected.size < preview.flat.length);

  return (
    <Modal
      open={open}
      title={target === 'repo' ? '导入题目到题库' : '导入试卷'}
      width={920}
      onCancel={onClose}
      maskClosable={false}
      destroyOnClose
      footer={footer()}
    >
      <Steps
        size="small"
        current={step}
        style={{ marginBottom: 16 }}
        items={[{ title: '选择来源' }, { title: '预览确认' }, { title: '选择去向' }]}
      />

      {step === 0 && (
        <Tabs
          activeKey={format}
          onChange={(key) => setFormat(key as ImportFormat)}
          items={formats.map((item) => ({
            key: item,
            label: FORMAT_LABEL[item],
            children: (
              <div>
                {item === 'text' ? (
                  <>
                    <Input.TextArea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="把题目文本粘贴到这里：首行可以是试卷标题，题目之间空一行，题型用【单选题】等标记"
                      autoSize={{ minRows: 12, maxRows: 18 }}
                    />
                    <Space style={{ marginTop: 8 }}>
                      <Button size="small" onClick={() => setText(SAMPLE)}>
                        填入示例
                      </Button>
                      <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                        支持【欢迎语】【单选题】【多选题】【判断题】【填空题】【多项填空】【简答题】
                      </span>
                    </Space>
                  </>
                ) : (
                  <Upload.Dragger
                    accept={item === 'word' ? '.docx,.doc' : item === 'excel' ? '.xlsx,.xls' : '.json'}
                    beforeUpload={(next) => {
                      setFile(next);
                      return false;
                    }}
                    maxCount={1}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件到这里</p>
                    <p className="ant-upload-hint">{FORMAT_HINT[item]}</p>
                  </Upload.Dragger>
                )}
              </div>
            ),
          }))}
        />
      )}

      {step === 1 && preview && (
        <div>
          <Space wrap style={{ marginBottom: 10 }}>
            <Tag color="blue">共 {stats?.total ?? 0} 题</Tag>
            <Tag color="cyan">总分 {stats?.score ?? 0}</Tag>
            {Object.entries(stats?.byType ?? {}).map(([type, count]) => (
              <Tag key={type}>
                {TYPE_LABEL[type] ?? type} {count}
              </Tag>
            ))}
          </Space>

          {warnings.length > 0 && (
            <Alert
              type={warnings.some((item) => item.level === 'warn' || item.level === 'error') ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 10 }}
              message={warnings.length + ' 条解析提示（不影响已识别的题目）'}
              description={
                <div style={{ maxHeight: 96, overflow: 'auto', fontSize: 12 }}>
                  {warnings.map((item, index) => (
                    <div key={index}>
                      <WarningOutlined /> {item.message}
                    </div>
                  ))}
                </div>
              }
            />
          )}

          <div
            style={{
              border: '1px solid var(--bp-line)',
              maxHeight: 360,
              overflow: 'auto',
              padding: 8,
            }}
          >
            <div style={{ padding: '0 4px 8px' }}>
              {selectable ? (
                <Checkbox
                  checked={selectedAll}
                  indeterminate={indeterminate}
                  onChange={(e) => toggleAll(e.target.checked)}
                >
                  全选（已选 {selected.size} / {preview.flat.length}）
                </Checkbox>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                  题库导入会导入全部 {preview.flat.length} 道题
                </span>
              )}
            </div>
            {(preview.tree?.children ?? []).map((node) => {
              if (node.type === 'QuestionSet') {
                return (
                  <div key={node.id} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, margin: '6px 0' }}>{node.title || '未命名题组'}</div>
                    {(node.children ?? []).map((child, index) => (
                      <QuestionRow
                        key={child.id}
                        question={child}
                        index={index + 1}
                        checked={selectable ? selected.has(child.id) : true}
                        disabled={!selectable}
                        onToggle={(checked) => {
                          const next = new Set(selected);
                          if (checked) next.add(child.id);
                          else next.delete(child.id);
                          setSelected(next);
                        }}
                      />
                    ))}
                  </div>
                );
              }
              const index = preview.flat.findIndex((item) => item.id === node.id);
              return (
                <QuestionRow
                  key={node.id}
                  question={node}
                  index={index + 1}
                  checked={selectable ? selected.has(node.id) : true}
                  disabled={!selectable}
                  onToggle={(checked) => {
                    const next = new Set(selected);
                    if (checked) next.add(node.id);
                    else next.delete(node.id);
                    setSelected(next);
                  }}
                />
              );
            })}
            {!preview.flat.length && <Empty description="没有可导入的题目" />}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          {target === 'repo' && <Alert type="info" showIcon message={'导入到题库：' + (repoName || '当前题库')} />}
          {target === 'paper' && paperName && (
            <Alert
              type="info"
              showIcon
              message={'将创建试卷：' + paperName}
              description="先解析后建卷：创建失败不会留下空试卷。"
            />
          )}
          {target === 'paper' && !paperName && (
            <div style={{ marginTop: 8 }}>
              <Radio.Group value={destType} onChange={(e) => setDestType(e.target.value)}>
                <Space direction="vertical">
                  <Radio value="new-group">新建题组</Radio>
                  <Radio value="existing-group" disabled={!groups.length}>
                    导入到现有题组
                  </Radio>
                </Space>
              </Radio.Group>
              <div style={{ marginTop: 12, paddingLeft: 24 }}>
                {destType === 'new-group' ? (
                  <Input
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    placeholder="题组名称"
                    style={{ maxWidth: 320 }}
                  />
                ) : (
                  <Select
                    value={groupId}
                    onChange={setGroupId}
                    style={{ width: 320 }}
                    placeholder="选择题组"
                    options={groups.map((group) => ({ value: group.id, label: group.title || '未命名题组' }))}
                  />
                )}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bp-text-soft)' }}>
                导入后记得点右上角「保存」；一次导入可以用 Ctrl+Z 整体撤销。
              </div>
            </div>
          )}
        </div>
      )}

      {parsing && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin />
        </div>
      )}
    </Modal>
  );
}

function QuestionRow({
  question,
  index,
  checked,
  disabled,
  onToggle,
}: {
  question: SurveySchema;
  index: number;
  checked: boolean;
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '6px 4px',
        borderTop: '1px dashed var(--bp-line)',
      }}
    >
      <Checkbox checked={checked} disabled={disabled} onChange={(e) => onToggle(e.target.checked)} />
      <span style={{ width: 22, color: 'var(--bp-text-soft)', fontSize: 12 }}>{index}</span>
      <Tag style={{ marginInlineEnd: 0 }}>{TYPE_LABEL[question.type] ?? question.type}</Tag>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {question.title || '（无题干）'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 2 }}>{answerSummary(question)}</div>
      </div>
      <span style={{ fontSize: 12 }}>{question.attribute?.examScore ?? 5} 分</span>
    </div>
  );
}
