import type { ReactNode } from 'react';
import type { SurveySchema } from '../schema/types';


export type RenderMode = 'edit' | 'preview' | 'answer';








export type AnswerValue = Record<string, unknown> | string | number | null | undefined;

export interface QuestionComponentProps {
  schema: SurveySchema;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  mode: RenderMode;
  disabled?: boolean;

  number?: number;
}

export type QuestionComponent = (props: QuestionComponentProps) => ReactNode;

/** 选择题答案：{ [optionId]: 任意非 null 值 } */
export function isOptionSelected(value: AnswerValue, optionId: string): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.prototype.hasOwnProperty.call(value, optionId);
}
