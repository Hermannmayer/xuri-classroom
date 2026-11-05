/**
 * 题型答案格式的唯一出口（与后端一致，改这里就够）：
 * - 选择类：{ [optionId]: true }，后端只判 key 存在（单选必须恰好一个 key）
 * - 填空/文本：{ [空位id]: 文本 }，空位 id 来自 schema.children[0].id
 * - 评分：{ [optionId]: 数值 } 或数值
 */
import type { DataSource, SurveySchema } from '../../schema/types';
import { isOptionSelected, type AnswerValue } from '../types';

export interface Option {
  label: string;
  value: string;
}

/** dataSource → 选项；value 即后端 answer 里的 optionId */
export function toOptions(dataSource?: DataSource[]): Option[] {
  return (dataSource ?? []).map(({ label, value }) => ({ label, value }));
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
