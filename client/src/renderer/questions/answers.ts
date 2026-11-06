/**
 * 题型答案格式的唯一出口（与后端一致，改这里就够）：
 * - 选择类：{ [optionId]: true }，后端只判 key 存在（单选必须恰好一个 key）
 * - 填空/文本：{ [空位id]: 文本 }，空位 id 来自 schema.children[0].id
 * - 评分：{ [optionId]: 数值 } 或数值
 */
import type { Attribute, DataSource, SurveySchema } from '../../schema/types';
import { isOptionSelected, type AnswerValue } from '../types';

export interface Option {
  label: string;
  value: string;
}

/** dataSource → 选项；value 即后端 answer 里的 optionId */
export function toOptions(dataSource?: DataSource[]): Option[] {
  return (dataSource ?? []).map(({ label, value }) => ({ label, value }));
}

/**
 * 取一道题的选项，带兜底：
 * - 设计器新建的题把选项放在 dataSource 里；
 * - **Excel 导入的题没有 dataSource**，选项只写在 children 里（且这些 Option 子节点连 type 都没有），
 *   不兜底的话渲染层会整题显示「未配置选项」——这是存量题库里大量存在的问题。
 */
export function optionsOf(schema: SurveySchema): Option[] {
  const fromDataSource = toOptions(schema.dataSource);
  if (fromDataSource.length) return fromDataSource;
  return (schema.children ?? [])
    .filter((child) => Boolean(child.id) && String(child.title ?? '').trim() !== '')
    .map((child) => ({ label: child.title ?? '', value: child.id }));
}

/** 已选的 optionId（key 存在即选中，不看值真假） */
export function selectedIds(answer: AnswerValue, options: Option[]): string[] {
  return options.filter((o) => isOptionSelected(answer, o.value)).map((o) => o.value);
}

/** 单选题答案：{ [optionId]: true } */
export function optionAnswer(option: Option): Record<string, true> {
  return { [option.value]: true };
}

/** 多选题答案：只保留选中的 option，退选即删 key */
export function answersOf(options: Option[], ids: string[]): Record<string, true> {
  const picked = new Set(ids.map(String));
  const out: Record<string, true> = {};
  for (const o of options) if (picked.has(o.value)) out[o.value] = true;
  return out;
}

/** 填空题的"空位"节点 id：后端 answer 的 key 就是它（见 AnswerServiceImpl 造 schema 的方式） */
export function blankId(schema: Partial<SurveySchema>): string | undefined {
  return schema.children?.[0]?.id;
}

/** 填空答案：{ [空位id]: 文本 }；没有空位节点时退化成字符串（兼容早期数据） */
export function blankAnswer(id: string | undefined, text: string): AnswerValue {
  return id ? { [id]: text } : text;
}

export function blankText(answer: AnswerValue, id?: string): string {
  if (typeof answer === 'string') return answer;
  if (id && answer && typeof answer === 'object' && !Array.isArray(answer)) {
    const raw = (answer as Record<string, unknown>)[id];
    return typeof raw === 'string' ? raw : '';
  }
  return '';
}

/* ---------------- 多空填空 ---------------- */

/** 多空填空答案：{ [空位id]: 文本 }；空位列表来自 schema.children */
export function blankValues(answer: AnswerValue): Record<string, string> {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return {};
  const out: Record<string, string> = {};
  for (const [id, raw] of Object.entries(answer)) if (typeof raw === 'string') out[id] = raw;
  return out;
}

/* ---------------- 矩阵（单选/多选/填空） ---------------- */

/** 矩阵答案：{ [rowId]: { [colId]: true | 文本 } } */
export type MatrixAnswer = Record<string, Record<string, unknown>>;

export function matrixAnswer(answer: AnswerValue): MatrixAnswer {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return {};
  const out: MatrixAnswer = {};
  for (const [rowId, row] of Object.entries(answer)) {
    if (row && typeof row === 'object' && !Array.isArray(row)) out[rowId] = row as Record<string, unknown>;
  }
  return out;
}

/** 矩阵列：优先 schema.dataSource；旧数据把列放在 children 里，做兼容 */
export function matrixColumns(schema: Partial<SurveySchema>): Option[] {
  const columns = toOptions(schema.dataSource);
  if (columns.length) return columns;
  return (schema.children ?? []).map((child) => ({ label: child.title, value: child.id }));
}

/** 点格子：单选整行替换，多选切 key；行内无选中时删掉该行，避免后端把空对象当已答 */
export function matrixPick(
  answer: AnswerValue,
  rowId: string,
  colId: string,
  multiple: boolean,
): MatrixAnswer {
  const matrix = matrixAnswer(answer);
  const row = { ...(matrix[rowId] ?? {}) };
  if (multiple) {
    if (Object.prototype.hasOwnProperty.call(row, colId)) delete row[colId];
    else row[colId] = true;
  } else {
    for (const key of Object.keys(row)) delete row[key];
    row[colId] = true;
  }
  if (Object.keys(row).length) matrix[rowId] = row;
  else delete matrix[rowId];
  return matrix;
}

export function matrixCell(answer: AnswerValue, rowId: string, colId: string): unknown {
  return matrixAnswer(answer)[rowId]?.[colId];
}

export function matrixText(answer: AnswerValue, rowId: string, colId: string): string {
  const raw = matrixCell(answer, rowId, colId);
  return typeof raw === 'string' ? raw : '';
}

/** 矩阵填空：空格子删 key，与选择类保持同一套"无 key = 未答"语义 */
export function matrixSetText(
  answer: AnswerValue,
  rowId: string,
  colId: string,
  text: string,
): MatrixAnswer {
  const matrix = matrixAnswer(answer);
  const row = { ...(matrix[rowId] ?? {}) };
  if (text) row[colId] = text;
  else delete row[colId];
  if (Object.keys(row).length) matrix[rowId] = row;
  else delete matrix[rowId];
  return matrix;
}

/* ---------------- NPS / 级联 / 地址 ---------------- */

/** 单选类答案里的第一个 key（NPS/级联答案都只有一个 key） */
export function firstSelectedId(answer: AnswerValue): string | undefined {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return undefined;
  return Object.keys(answer)[0];
}

/** NPS 分值：attribute.npsStartNum 起、npsTotalNum 个，默认 0..10 */
export function npsRange(attribute?: Attribute): number[] {
  const start = Number(attribute?.npsStartNum);
  const total = Number(attribute?.npsTotalNum);
  const from = Number.isFinite(start) ? start : 0;
  const count = Number.isFinite(total) && total >= 2 ? Math.min(total, 21) : 11;
  return Array.from({ length: count }, (_, i) => from + i);
}

/** 级联答案：{ [末级value]: 末级label }；反查路径给 antd Cascader 回填 */
export function cascaderPath(dataSource: DataSource[] | undefined, leaf: string): string[] {
  const walk = (nodes: DataSource[] | undefined, path: string[]): string[] | undefined => {
    for (const node of nodes ?? []) {
      const next = [...path, node.value];
      if (node.value === leaf && !node.children?.length) return next;
      const found = walk(node.children, next);
      if (found) return found;
    }
    return undefined;
  };
  return walk(dataSource, []) ?? [];
}

export function cascaderLabel(dataSource: DataSource[] | undefined, leaf: string): string | undefined {
  for (const node of dataSource ?? []) {
    if (node.value === leaf) return node.label;
    const found = cascaderLabel(node.children, leaf);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** 地址答案：{ [questionId]: '省 市 区' }；兼容早期直接存字符串的数据 */
export function addressText(answer: AnswerValue, questionId: string): string {
  if (typeof answer === 'string') return answer;
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    const raw = (answer as Record<string, unknown>)[questionId];
    return typeof raw === 'string' ? raw : '';
  }
  return '';
}

export function addressAnswer(questionId: string, text: string): Record<string, string> {
  return { [questionId]: text };
}

/** 评分题范围来自 attribute.scope（默认 [0,5]，与原前端一致），Rate 星数取上限 */
export function scoreMax(scope?: string): number {
  const m = /[([]\s*(\d*)\s*,\s*(\d*)\s*[)\]]/.exec(scope ?? '');
  const max = m ? Number(m[2]) : NaN;
  return Number.isFinite(max) && max > 0 ? max : 5;
}

/* ---------------- 输入校验：按 attribute.dataType 限制与校验 ---------------- */

function textLimitMax(textLimit?: string): number | undefined {
  const m = /[([]\s*(\d*)\s*,\s*(\d*)\s*[)\]]/.exec(textLimit ?? '');
  const max = m ? Number(m[2]) : NaN;
  return Number.isFinite(max) && max > 0 ? max : undefined;
}

export interface InputRule {
  inputMode?: 'numeric' | 'tel' | 'email' | 'decimal' | 'text';
  maxLength?: number;
  /** 输入时过滤：非数字/字母直接打不进去 */
  filter?: (raw: string) => string;
  /** 失焦/提交时校验，返回错误文案 */
  validate?: (value: string) => string | undefined;
}

export function inputRule(dataType?: string, textLimit?: string): InputRule {
  const limit = textLimitMax(textLimit);
  switch (dataType) {
    case 'number':
      return { inputMode: 'decimal', maxLength: limit, filter: (s) => s.replace(/[^\d.-]/g, '') };
    case 'mobile':
      return {
        inputMode: 'tel',
        maxLength: 11,
        filter: (s) => s.replace(/\D/g, ''),
        validate: (v) => (v && !/^1\d{10}$/.test(v) ? '请输入 11 位手机号' : undefined),
      };
    case 'idCard':
      return {
        maxLength: 18,
        filter: (s) => s.replace(/[^\dXx]/g, '').toUpperCase(),
        validate: (v) => (v && !/^\d{17}[\dX]$/.test(v) ? '请输入 18 位身份证号' : undefined),
      };
    case 'email':
      return {
        inputMode: 'email',
        maxLength: limit,
        validate: (v) => (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? '邮箱格式不正确' : undefined),
      };
    case 'chinese':
      return { maxLength: limit, filter: (s) => s.replace(/[^\u4e00-\u9fa5]/g, '') };
    case 'alphabet':
      return { maxLength: limit, filter: (s) => s.replace(/[^a-zA-Z]/g, '') };
    case 'password':
      return { maxLength: limit };
    default:
      return { maxLength: limit };
  }
}
