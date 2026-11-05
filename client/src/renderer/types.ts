import type { ReactNode } from 'react';
import type { SurveySchema } from '../schema/types';

/** edit = 设计器内联编辑；preview = 设计器预览；answer = 真实答题 */
export type RenderMode = 'edit' | 'preview' | 'answer';

/**
 * 答案存储格式（与后端一致）：answer[questionId] 的值
 * - 选择类（Radio/Checkbox/Select）：Record<optionId, unknown>，靠 key 存在判断选中
 * - 填空类（FillBlank/Textarea）：string
 * - 数值类（Score）：number
 * - 矩阵类：Record<rowId, Record<colId, unknown>>
 */
export type AnswerValue = Record<string, unknown> | string | number | null | undefined;

export interface QuestionComponentProps {
  schema: SurveySchema;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  mode: RenderMode;
  disabled?: boolean;
  /** 题号，仅展示用 */
  number?: number;
}

export type QuestionComponent = (props: QuestionComponentProps) => ReactNode;

/** 选择题答案：{ [optionId]: 任意非 null 值 } */
export function isOptionSelected(value: AnswerValue, optionId: string): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.prototype.hasOwnProperty.call(value, optionId);
}
