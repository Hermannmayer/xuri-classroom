/** 答卷 → 单元格文本 */
import type { FlatQuestion } from '../../../schema/flatten';
import type { AnswerValue } from '../../../renderer/types';
import {
  addressText,
  blankValues,
  cascaderLabel,
  firstSelectedId,
  matrixAnswer,
  matrixColumns,
  optionsOf,
} from '../../../renderer/questions/answers';

export const EMPTY = '—';

const CHOICE = new Set(['Radio', 'Checkbox', 'Select', 'Judge']);
const MATRIX = new Set([
  'MatrixRadio',
  'MatrixCheckbox',
  'MatrixFillBlank',
  'MatrixAuto',
  'MatrixScore',
  'MatrixNps',
]);
const BLANK = new Set(['FillBlank', 'Textarea', 'MultipleBlank', 'HorzBlank']);


const NON_DATA = new Set<string>();

export function isDataQuestion(q: FlatQuestion): boolean {
  return !NON_DATA.has(q.type);
}

/** 把任意答案值摊平成一段文本（对象只取叶子值，不拼接 key） */
export function flattenText(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  if (Array.isArray(raw)) return raw.map(flattenText).filter(Boolean).join('、');
  if (typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>)
      .map(flattenText)
      .filter(Boolean)
      .join('、');
  }
  return String(raw);
}

function matrixText(q: FlatQuestion, value: Record<string, unknown>): string {
  const rowTitles = q.schema.row ?? [];
  const columns = matrixColumns(q.schema);
  const parts: string[] = [];

  for (const [rowId, cells] of Object.entries(matrixAnswer(value))) {
    const rowTitle = rowTitles.find((r) => r.id === rowId)?.title ?? rowId;
    const cellTexts = Object.entries(cells).map(([colId, raw]) => {
      const colTitle = columns.find((c) => c.value === colId)?.label ?? colId;
      const text = raw === true ? '' : flattenText(raw);
      return text ? `${colTitle}=${text}` : colTitle;
    });
    if (cellTexts.length) parts.push(`${rowTitle}: ${cellTexts.join('、')}`);
  }
  return parts.join('；');
}

/** 单元格/详情共用的答案格式化：空值统一 EMPTY，方便表格排序把空值排到最后 */
export function formatAnswer(q: FlatQuestion, value: AnswerValue): string {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (q.type === 'RichText' && typeof value === 'string') {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || EMPTY;
  }
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(flattenText).filter(Boolean).join('、') || EMPTY;
  if (typeof value !== 'object') return String(value);

  const record = value as Record<string, AnswerValue>;

  if (CHOICE.has(q.type)) {


    const options = optionsOf(q.schema);

    return Object.keys(record)
      .map((id) => options.find((o) => o.value === id)?.label ?? id)
      .join('、');
  }

  if (MATRIX.has(q.type)) return matrixText(q, record) || EMPTY;

  if (q.type === 'Cascader') {
    const leaf = firstSelectedId(record);
    if (!leaf) return EMPTY;
    return cascaderLabel(q.schema.dataSource, leaf) ?? (flattenText(record[leaf]) || leaf);
  }

  if (q.type === 'Address') return addressText(record, q.id) || EMPTY;


  if (q.type === 'Nps') return firstSelectedId(record) ?? EMPTY;
  if (q.type === 'Score') return flattenText(record) || EMPTY;

  if (BLANK.has(q.type)) {
    return Object.values(blankValues(record)).filter(Boolean).join('，') || flattenText(record) || EMPTY;
  }


  return flattenText(record) || EMPTY;
}

/** 表格排序：空值永远排最后，中文按拼音、数字按大小 */
export function compareText(a: string, b: string): number {
  if (a === EMPTY || b === EMPTY) {
    if (a === b) return 0;
    return a === EMPTY ? 1 : -1;
  }
  return a.localeCompare(b, 'zh-Hans-CN', { numeric: true });
}

/** 表头：题号 + 题干；没题干时退回题型，保证列有名字 */
export function questionHeader(q: FlatQuestion): string {
  return `${q.number ?? q.index + 1}. ${q.title || q.type}`;
}
