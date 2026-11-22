import { useEffect, useRef, useState } from 'react';
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
import { InboxOutlined } from '@ant-design/icons';
import type { SurveySchema } from '../../schema/types';
import { getAiStatus, type AiStatus } from '../../api/ai';
import { parseAiImport, parseImport, type ImportFormat, type ImportPreview } from '../../api/import';
import { download } from '../../api';
import { ImportHelp, ImportPreviewNotices, ImportTypeTags, importTypeLabel } from './ImportHelp';

export type ImportDestination =
  | { type: 'new-paper' }
  | { type: 'new-group'; title: string }
  | { type: 'existing-group'; groupId: string }
  | { type: 'whole-paper' }
  | { type: 'repo' };

export interface ImportSubmitPayload {
  preview: ImportPreview;
  destination: ImportDestination;
  format: ImportFormat;
  sourceText?: string;
  sourceFile?: File;
}

interface Props {
  open: boolean;
  target: 'paper' | 'repo';

  formats?: ImportFormat[];

  paperName?: string;

  repoName?: string;

  wholePaper?: boolean;

  presetGroupId?: string;

  groups?: Array<{ id: string; title: string }>;

  embedded?: boolean;
  onClose: () => void;
  onSubmit: (payload: ImportSubmitPayload) => Promise<void>;
}

const FORMAT_LABEL: Record<ImportFormat, string> = {
  ai: 'AI 智能识别',
  word: 'Word 试卷',
  excel: 'Excel 表格',
  text: '文本',
  json: 'JSON 备份',
};

const FORMAT_HINT: Record<ImportFormat, string> = {
  ai: '上传 Word / PDF / Excel 文档或图片，AI 先读懂再转成题目',
  word: '按模板用「一、二、三」写大题、用「1. 2.」写小题',
  excel: '按题型分表，表头按名字识别',
  text: '粘贴题目文本',
  json: '系统导出的试卷 JSON',
};

const AI_ACCEPT = '.docx,.pdf,.xlsx,.xls,.txt,.md,.csv,.png,.jpg,.jpeg';

const AI_UNAVAILABLE = 'AI 功能未启用，请先在系统设置里配置模型';

const AI_FORBIDDEN = '没有 AI 使用权限';

const AI_IMAGE_DISABLED =
  '当前模型未开启图片输入，图片题会被跳过；请到 系统设置 → AI → 模型目录 勾选「图片」';

const IMAGE_FILE = /\.(png|jpe?g)$/i;

function isImageFile(file?: File): boolean {
  return Boolean(file && IMAGE_FILE.test(file.name));
}

/** AI 页签不可用的中文原因：无权限、未启用或未配置模型；可用时返回 undefined */
function aiBlocker(status: AiStatus | undefined, forbidden: boolean, loading: boolean): string | undefined {
  if (forbidden) return AI_FORBIDDEN;
  if (loading || !status || status.ready) return undefined;
  if (status.enabled === false) return AI_UNAVAILABLE;
  return status.reason?.trim() || AI_UNAVAILABLE;
}

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
  wholePaper = false,
  presetGroupId,
  groups = [],
  onClose,
  onSubmit,
  embedded = false,
}: Props) {
  const hasAi = formats.includes('ai');
  const [step, setStep] = useState(0);
  const [format, setFormat] = useState<ImportFormat>(formats[0] ?? 'text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | undefined>();
  const [parsing, setParsing] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus>();
  const [aiStatusLoading, setAiStatusLoading] = useState(false);
  const [aiForbidden, setAiForbidden] = useState(false);
  const textFileRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!open || !hasAi) return;
    let alive = true;
    setAiStatusLoading(true);
    setAiStatus(undefined);
    setAiForbidden(false);
    getAiStatus()
      .then((next) => {
        if (alive) setAiStatus(next);
      })
      .catch(() => {
        if (alive) setAiForbidden(true);
      })
      .finally(() => {
        if (alive) setAiStatusLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, hasAi]);

  const warnings = preview?.warnings ?? [];
  const stats = preview?.stats;
  const aiReason = hasAi ? aiBlocker(aiStatus, aiForbidden, aiStatusLoading) : undefined;
  const aiReady = hasAi && !aiStatusLoading && !aiForbidden && aiStatus?.ready === true;
  const aiSupportsImage = aiStatus?.supportsImage === true;
  const aiImageBlocked = aiReady && !aiSupportsImage && isImageFile(file);

  const applyPreview = (result: ImportPreview, emptyHint: string) => {
    if (!result?.flat?.length) {
      message.warning(emptyHint);
      return;
    }
    setPreview(result);
    setSelected(new Set(result.flat.map((item) => item.id)));
    setStep(1);
  };

  const loadTextFile = async (picked: File) => {
    try {
      const content = await picked.text();
      setText(content.replace(/^\uFEFF/, ''));
      message.success('已读入 ' + picked.name);
    } catch (e) {
      message.error('读取文本文件失败：' + (e as Error).message);
    }
  };

  const doParse = async () => {
    const isAi = format === 'ai';
    if (isAi) {
      if (!aiReady) {
        message.warning(aiReason ?? 'AI 暂时不可用，请稍后再试');
        return;
      }
      if (!file) {
        message.warning('请先选择文档');
        return;
      }
      if (aiImageBlocked) {
        message.warning(AI_IMAGE_DISABLED);
        return;
      }
    } else if (format === 'text') {
      if (!text.trim()) {
        message.warning('请先粘贴题目文本');
        return;
      }
    } else if (!file) {
      message.warning('请先选择文件');
      return;
    }
    setParsing(true);
    try {
      const result = isAi
        ? await parseAiImport({ file, target })
        : await parseImport({ kind: format, text: format === 'text' ? text : undefined, file, target });
      applyPreview(result, isAi ? 'AI 没有识别到题目，请检查文档内容后重试' : '没有识别到题目，请检查格式');
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

    const finalPreview = selectable ? subsetPreview(preview, selected) : preview;
    if (!finalPreview.flat.length) {
      message.warning('请至少保留一道题');
      return;
    }
    let destination: ImportDestination;
    if (wholePaper) {
      destination = { type: 'whole-paper' };
    } else if (target === 'repo') {
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
      await onSubmit({
        preview: finalPreview,
        destination,
        format,
        sourceText: format === 'text' ? text : undefined,
        sourceFile: format === 'text' ? undefined : file,
      });
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
        <Button
          key="parse"
          type="primary"
          loading={parsing}
          disabled={format === 'ai' && (!aiReady || aiImageBlocked)}
          onClick={doParse}
        >
          解析并预览
        </Button>,
      ];
    }
    if (step === 1) {
      return [
        <Button key="prev" onClick={() => setStep(0)}>
          上一步
        </Button>,
        <Button
          key="next"
          type="primary"
          disabled={!selected.size}
          loading={submitting}
          onClick={() => (wholePaper ? submit() : setStep(2))}
        >
          {wholePaper ? '导入到试卷' : '下一步'}
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

  const renderSource = (item: ImportFormat) => {
    if (item === 'ai') {
      return (
        <div>
          {aiReason && (
            <Alert type={aiForbidden ? 'error' : 'warning'} showIcon style={{ marginBottom: 10 }} title={aiReason} />
          )}
          {aiReady && !aiSupportsImage && (
            <Alert type="warning" showIcon style={{ marginBottom: 10 }} title={AI_IMAGE_DISABLED} />
          )}
          {aiReady && (
            <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
              当前模型：{aiStatus?.model || '默认模型'}（{aiSupportsImage ? '支持图片' : '仅文本'}）
            </div>
          )}
          <Upload.Dragger
            accept={AI_ACCEPT}
            beforeUpload={(next) => {
              setFile(next);
              return false;
            }}
            onRemove={() => {
              setFile(undefined);
              return true;
            }}
            maxCount={1}
            disabled={!aiReady || parsing}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文档/图片到这里</p>
            <p className="ant-upload-hint">{FORMAT_HINT.ai}</p>
          </Upload.Dragger>
          <Space style={{ marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
              支持 .docx / .pdf / .xlsx / .xls / .txt / .md / .csv；图片支持 png / jpg / jpeg
            </span>
            {file && <span style={{ fontSize: 12 }}>已选择：{file.name}</span>}
          </Space>
          <ImportHelp formats={['ai']} />
        </div>
      );
    }
    if (item === 'text') {
      return (
        <>
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="把题目文本粘贴到这里：首行可以是试卷标题，题目之间空一行，题型用【单选题】等标记"
            autoSize={{ minRows: 12, maxRows: 18 }}
            disabled={parsing}
          />
          <Space style={{ marginTop: 8 }}>
            <Button size="small" onClick={() => setText(SAMPLE)} disabled={parsing}>
              填入示例
            </Button>
            <Button size="small" disabled={parsing} onClick={() => textFileRef.current?.click()}>
              从 .txt / .md 文件读入
            </Button>
            <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
              支持【欢迎语】【单选题】【多选题】【判断题】【填空题】【多项填空】【简答题】
            </span>
          </Space>
          <input
            ref={textFileRef}
            type="file"
            accept=".txt,.md"
            style={{ display: 'none' }}
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (picked) void loadTextFile(picked);
              e.target.value = '';
            }}
          />
        </>
      );
    }
    return (
      <div>
        <Upload.Dragger
          accept={item === 'word' ? '.docx' : item === 'excel' ? '.xlsx,.xls' : '.json'}
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
        <Space style={{ marginTop: 8 }}>
          <Button
            size="small"
            onClick={() =>
              void download(
                '/api/file/downloadTemplate',
                { name: item === 'word' ? '试卷导入模板' : '题库导入模板' },
                item === 'word' ? '试卷导入模板.docx' : '题库导入模板.xlsx',
              ).catch((e) => message.error((e as Error).message))
            }
          >
            下载模板
          </Button>
          {file && <span style={{ fontSize: 12 }}>已选择：{file.name}</span>}
        </Space>
        <ImportHelp formats={[item]} />
      </div>
    );
  };

  const body = (
    <>
      <Steps
        size="small"
        current={step}
        style={{ marginBottom: 16 }}
        items={
          wholePaper
            ? [{ title: '选择来源' }, { title: '预览确认' }]
            : [{ title: '选择来源' }, { title: '预览确认' }, { title: '选择去向' }]
        }
      />

      {step === 0 && (
        <Tabs
          activeKey={format}
          onChange={(key) => setFormat(key as ImportFormat)}
          items={formats.map((item) => ({
            key: item,
            label: FORMAT_LABEL[item],
            children: renderSource(item),
          }))}
        />
      )}

      {step === 1 && preview && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Tag color="blue">共 {stats?.total ?? 0} 题</Tag>
            <Tag color="cyan">总分 {stats?.score ?? 0}</Tag>
            <ImportTypeTags byType={stats?.byType} />
          </div>

          <ImportPreviewNotices warnings={warnings} attachments={preview.attachments} />

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
          {target === 'repo' && <Alert type="info" showIcon title={'导入到题库：' + (repoName || '当前题库')} />}
          {target === 'paper' && paperName && (
            <Alert
              type="info"
              showIcon
              title={'将创建试卷：' + paperName}
              description="先解析后建卷：创建失败不会留下空试卷。"
            />
          )}
          {target === 'paper' && !paperName && (
            <div style={{ marginTop: 8 }}>
              <Radio.Group value={destType} onChange={(e) => setDestType(e.target.value)}>
                <Space orientation="vertical">
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
          {format === 'ai' && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--bp-text-soft)' }}>
              AI 正在逐段识别，长文档可能需要 1-2 分钟
            </div>
          )}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div>
        {body}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>{footer()}</div>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      title={target === 'repo' ? '导入题目到题库' : '导入试卷'}
      width={920}
      onCancel={onClose}
      mask={{ closable: false }}
      destroyOnHidden
      footer={footer()}
    >
      {body}
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
      <Tag style={{ marginInlineEnd: 0 }}>{importTypeLabel(question.type)}</Tag>
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
