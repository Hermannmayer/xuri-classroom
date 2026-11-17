import { post } from './request';
import type { SurveySchema } from '../schema/types';

/** 导入来源格式；P0 只开放 text，其余在向导里显示为“即将开放”。 */
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

/**
 * 解析时抽出来的图片。
 *
 * 后端还没把形状定死（张数 / 明细数组 / 占位 token → 文件），前端只用它数张数，
 * 所以这里放开类型、由 countImportAttachments 统一折算；旧后端不下发该字段。
 */
export type ImportAttachments = number | unknown[] | Record<string, unknown>;

/** 与后端 cn.surveyking.server.core.importer.ImportPreview 对齐 */
export interface ImportPreview {
  title?: string;
  description?: string;
  tree: SurveySchema;
  flat: SurveySchema[];
  stats: ImportStats;
  warnings: ImportWarning[];
  /** 可选的图片信息：有值时预览里会提示「本次导入包含 N 张图片」 */
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
