/**
 * 题型答案格式的唯一出口（与后端一致，改这里就够）：
 * - 选择类：{ [optionId]: option.label }，靠 key 存在判断选中
 * - 填空/文本：string
 * - 评分：number
 */
import type { DataSource } from '../../schema/types';
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

/** 单选题答案：{ [optionId]: option.label } */
export function optionAnswer(option: Option): Record<string, string> {
  return { [option.value]: option.label };
}

/** 多选题答案：只保留选中的 option，退选即删 key */
export function answersOf(options: Option[], ids: string[]): Record<string, string> {
  const picked = new Set(ids.map(String));
  const out: Record<string, string> = {};
  for (const o of options) if (picked.has(o.value)) out[o.value] = o.label;
  return out;
}

/** 评分题范围来自 attribute.scope（默认 [0,5]，与原前端一致），Rate 星数取上限 */
export function scoreMax(scope?: string): number {
  const m = /[([]\s*(\d*)\s*,\s*(\d*)\s*[)\]]/.exec(scope ?? '');
  const max = m ? Number(m[2]) : NaN;
  return Number.isFinite(max) && max > 0 ? max : 5;
}
