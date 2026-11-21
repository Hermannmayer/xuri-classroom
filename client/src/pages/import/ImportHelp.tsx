/** 题目导入：「支持哪些题型」折叠说明 + 预览里的题型/提示/图片渲染（task-37） */
import type { ReactNode } from 'react';
import { Alert, Collapse, Tag } from 'antd';
import { InfoCircleOutlined, PictureOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { ImportAttachments, ImportFormat, ImportWarning } from '../../api/import';








export const SUPPORTED_TYPE_LABELS: string[] = [
  '单选',
  '多选',
  '判断',
  '填空',
  '简答',
  '下拉',
  '级联',
  '评分',
  'NPS',
  '矩阵单选',
  '矩阵多选',
  '矩阵填空',
  '上传题',
];






export const IMPORT_TYPE_LABEL: Record<string, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  MultipleBlank: '多填空',
  Textarea: '简答',
  Select: '下拉',
  Score: '评分',
  Nps: 'NPS',
  MatrixRadio: '矩阵单选',
  MatrixCheckbox: '矩阵多选',
  MatrixScore: '矩阵评分（后端支持，前端暂未渲染）',
  MatrixNps: '矩阵 NPS（后端支持，前端暂未渲染）',
  MatrixFillBlank: '矩阵填空',
  MatrixAuto: '矩阵自动',
  Cascader: '级联',
  Signature: '签名',
  Upload: '上传题',
  HorzBlank: '横向填空',
  Address: '地址',
  Barcode: '条码',
  RichText: '富文本',
  QuestionSet: '题组',
  Survey: '试卷',
  Pagination: '分页',
  Remark: '备注',
  SplitLine: '分割线',
  Option: '选项',
  User: '人员',
  Dept: '部门',
  RandomSurvey: '随机试卷',
};

/** byType 的 key → 中文；未知 key 原样显示 */
export function importTypeLabel(key: string): string {
  return IMPORT_TYPE_LABEL[key] ?? key;
}

/** 解析出的图片张数 */
export function countImportAttachments(attachments?: unknown): number {
  if (attachments === undefined || attachments === null) return 0;
  if (typeof attachments === 'number') {
    return Number.isFinite(attachments) && attachments > 0 ? Math.floor(attachments) : 0;
  }
  if (Array.isArray(attachments)) return attachments.length;
  if (typeof attachments === 'object') {
    const record = attachments as Record<string, unknown>;
    for (const key of ['count', 'total', 'size', 'length']) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
    }
    return Object.keys(record).length;
  }
  return 0;
}

export interface ImportWarningGroups {

  errors: ImportWarning[];

  warns: ImportWarning[];

  infos: ImportWarning[];
}

/** 按级别把 warnings 分三组：error / warn 走 Alert，info 走灰色文字 */
export function splitImportWarnings(warnings?: ImportWarning[] | null): ImportWarningGroups {
  const groups: ImportWarningGroups = { errors: [], warns: [], infos: [] };
  for (const item of warnings ?? []) {
    const level = (item.level ?? '').toLowerCase();
    if (level === 'error') groups.errors.push(item);
    else if (level === 'warn' || level === 'warning') groups.warns.push(item);
    else groups.infos.push(item);
  }
  return groups;
}


const FORMAT_RULES: Partial<Record<ImportFormat, { title: string; items: string[] }>> = {
  excel: {
    title: 'Excel',
    items: ['一个题型一个 sheet', '图片直接贴在题干所在行即可，会按行归属', '复杂题型可用「高级配置(JSON)」列'],
  },
  word: {
    title: 'Word',
    items: ['题干前用【单选】【矩阵单选】等标记题型', '矩阵用「行：/列：/答案：」三行'],
  },
  text: { title: '文本', items: ['题目之间空一行，题型用【单选题】等标记'] },
  json: { title: 'JSON', items: ['系统导出的试卷 JSON，原样导入'] },
};

const HELP_PANEL_KEY = 'types';

export interface ImportHelpProps {

  formats?: ImportFormat[];

  defaultOpen?: boolean;
}

/** 「支持哪些题型」折叠说明 */
export function ImportHelp({ formats = ['excel', 'word'], defaultOpen = false }: ImportHelpProps) {
  const rules = formats.flatMap((format) => {
    const rule = FORMAT_RULES[format];
    return rule ? [rule] : [];
  });
  return (
    <Collapse
      size="small"
      ghost
      style={{ marginTop: 4 }}
      defaultActiveKey={defaultOpen ? [HELP_PANEL_KEY] : undefined}
      items={[
        {
          key: HELP_PANEL_KEY,
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <QuestionCircleOutlined />
              支持哪些题型
            </span>
          ),
          children: (
            <div style={{ fontSize: 12, lineHeight: 1.9, color: 'var(--bp-text-soft)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {SUPPORTED_TYPE_LABELS.map((label) => (
                  <Tag key={label} style={{ marginInlineEnd: 0 }}>
                    {label}
                  </Tag>
                ))}
              </div>
              {rules.map((rule) => (
                <div key={rule.title} style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{rule.title}</span>
                  <ul style={{ margin: '2px 0 0', paddingInlineStart: 18 }}>
                    {rule.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}

/** 预览里的题型分布（stats.byType）：Fragment 不带 DOM 节点，父级 flex/Space 直接排版每个 Tag */
export function ImportTypeTags({ byType }: { byType?: Record<string, number> }) {
  return (
    <>
      {Object.entries(byType ?? {}).map(([type, count]) => (
        <Tag key={type}>
          {importTypeLabel(type)} {count}
        </Tag>
      ))}
    </>
  );
}

function WarningLines({ items }: { items: ImportWarning[] }): ReactNode {
  return (
    <div style={{ maxHeight: 96, overflow: 'auto', fontSize: 12 }}>
      {items.map((item, index) => (
        <div key={index}>
          <WarningOutlined /> {item.message}
        </div>
      ))}
    </div>
  );
}


const BACKEND_IMAGE_NOTICE = /已提取\s*\d+\s*张图片/;

/** 同一句图片提示只说一次：attachments 已经提示过，就把后端那条措辞雷同的 info 收起来 */
export function isRedundantImageWarning(item: ImportWarning, imageCount: number): boolean {
  return imageCount > 0 && BACKEND_IMAGE_NOTICE.test(item.message);
}

export interface ImportPreviewNoticesProps {
  warnings?: ImportWarning[];

  attachments?: ImportAttachments | null;
}

/** 预览页顶部的提示区：图片提示 + warn/error 走 Alert + info 走灰色文字 */
export function ImportPreviewNotices({ warnings, attachments }: ImportPreviewNoticesProps) {
  const { errors, warns, infos } = splitImportWarnings(warnings);
  const imageCount = countImportAttachments(attachments);
  const visibleInfos = infos.filter((item) => !isRedundantImageWarning(item, imageCount));
  return (
    <>
      {imageCount > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<PictureOutlined />}
          style={{ marginBottom: 10 }}
          title={'本次导入包含 ' + imageCount + ' 张图片，导入后随题干展示'}
        />
      )}
      {errors.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 10 }}
          title={errors.length + ' 条解析错误'}
          description={<WarningLines items={errors} />}
        />
      )}
      {warns.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 10 }}
          title={warns.length + ' 条解析提示（不影响已识别的题目）'}
          description={<WarningLines items={warns} />}
        />
      )}
      {visibleInfos.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
          {visibleInfos.map((item, index) => (
            <div key={index}>
              <InfoCircleOutlined /> {item.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
