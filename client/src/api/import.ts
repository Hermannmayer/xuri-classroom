import { post } from './request';
import type { SurveySchema } from '../schema/types';


export type ImportFormat = 'word' | 'excel' | 'text' | 'json';

export interface ImportWarning {
  level: 'info' | 'warn' | 'error' | string;
  code: string;
  message: string;
}

export interface ImportStats {
  total: number;
  score: number;
  groups: number;
  byType: Record<string, number>;
}







export type ImportAttachments = number | unknown[] | Record<string, unknown>;


export interface ImportPreview {
  title?: string;
  description?: string;
  tree: SurveySchema;
  flat: SurveySchema[];
  stats: ImportStats;
  warnings: ImportWarning[];

  attachments?: ImportAttachments;
}

export const parseImport = (payload: {
  kind: ImportFormat;
  text?: string;
  file?: File;
  target?: 'paper' | 'repo';
}) => {
  const form = new FormData();
  form.append('kind', payload.kind);
  if (payload.text !== undefined) form.append('text', payload.text);
  if (payload.file) form.append('file', payload.file);
  if (payload.target) form.append('target', payload.target);
  return post<ImportPreview>('/api/import/parse', form);
};

/** 导入完成后的审计记录（失败不影响主流程） */
export const recordPaperImport = (payload: { projectId: string; source: string; total: number }) =>
  post<void>('/api/import/record', payload);
