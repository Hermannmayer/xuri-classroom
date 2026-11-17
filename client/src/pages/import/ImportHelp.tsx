/**
 * 题目导入：「支持哪些题型」折叠说明 + 预览里的题型/提示/图片渲染（task-37）。
 *
 * 这里只有纯展示与纯函数，导入链路仍然是 ImportWizard → parseImport：
 * - importTypeLabel / countImportAttachments / splitImportWarnings 是纯函数，
 *   importHelp.check.ts 用假数据自检（不连后端）；
 * - 组件只吃 stats / warnings / attachments，自己不发起任何请求。
 */
import type { ReactNode } from 'react';
import { Alert, Collapse, Tag } from 'antd';
import { InfoCircleOutlined, PictureOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { ImportAttachments, ImportFormat, ImportWarning } from '../../api/import';

/**
 * 说明面板里的题型清单（顺序与导入模板里的 sheet / 标记一致）。
 *
 * <p>只列编辑器里**真的能渲染**的题型：排序题没有对应 QuestionType（DSL 里没有 Rank），
 * 矩阵评分（MatrixScore）也还没注册渲染器，写进来会引导老师导出一批「未注册题型」，
 * 因此不列。上传题是已注册题型，导入只建题、不收答卷。
 */
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

/**
 * 后端 stats.byType 的 key（QuestionType 枚举名）→ 中文标签。
 * 没收录的 key 由 importTypeLabel 原样返回：后端以后加新题型，预览里最多露一次英文，
 * 不会因为查不到标签而渲染成空白。
 */
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

/**
 * 解析出的图片张数。
 *
 * 后端还没把 attachments 的形状定死，这里三种形状都认：
 * 张数（3）、明细数组（[{...}]）、占位 token → 文件的映射；认不出来的值按 0 处理，
 * 宁可少提示一句，也不要在预览里显示「包含 NaN 张图片」。
 */
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
  /** level=error：解析失败的硬错误 */
  errors: ImportWarning[];
  /** level=warn：能继续导入，但要让人看见（用 Alert） */
  warns: ImportWarning[];
  /** level=info 以及后端以后新加的级别：灰色文字，不抢眼 */
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

/** 各格式的填写规则；只渲染当前可选格式那几条 */
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
  /** 当前可选的导入格式；面板只列出这些格式的填写规则 */
  formats?: ImportFormat[];
  /** 默认展开（题库页那种只有 Excel 入口的场景用得上） */
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

/** 后端解析器里那句「已提取 N 张图片，导入后随题干展示」；有 attachments 时前端已经单独提示过同一件事 */
const BACKEND_IMAGE_NOTICE = /已提取\s*\d+\s*张图片/;

/** 同一句图片提示只说一次：attachments 已经提示过，就把后端那条措辞雷同的 info 收起来 */
export function isRedundantImageWarning(item: ImportWarning, imageCount: number): boolean {
  return imageCount > 0 && BACKEND_IMAGE_NOTICE.test(item.message);
}

export interface ImportPreviewNoticesProps {
  warnings?: ImportWarning[];
  /** 解析出的图片（张数 / 明细数组 / token 映射），形状见 countImportAttachments */
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
