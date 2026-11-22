import { post } from './request';
import type { SurveySchema } from '../schema/types';


export type ImportFormat = 'word' | 'excel' | 'text' | 'json' | 'ai';

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

/** AI 解析：上传文档或粘贴文本（二选一），返回与 parseImport 相同的预览结构 */
export const parseAiImport = (payload: {
  file?: File;
  text?: string;
  target?: 'paper' | 'repo';
}) => {
  const form = new FormData();
  form.append('kind', 'ai');
  if (payload.file) form.append('file', payload.file);
  if (payload.text !== undefined) form.append('text', payload.text);
  if (payload.target) form.append('target', payload.target);
  return post<ImportPreview>('/api/import/ai/parse', form);
};

/** 把 AI 解析结果整批写进题库：questions 为预览里的扁平题目，无法逐题剔除 */
export const importRepoQuestions = (payload: { repoId: string; questions: SurveySchema[] }) =>
  post<void>('/api/repo/import/questions', payload);

/** 导入完成后的审计记录（失败不影响主流程） */
export const recordPaperImport = (payload: { projectId: string; source: string; total: number }) =>
  post<void>('/api/import/record', payload);
