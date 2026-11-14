import { get, post } from './request';
import type { SurveySchema } from '../schema/types';

export type ComposeType = 'Radio' | 'Checkbox' | 'Judge' | 'FillBlank' | 'Textarea';

export interface ComposeStats {
  total: number;
  byType: Record<string, number>;
  byChapter: Record<string, number>;
  byDifficulty: Record<string, number>;
}

export interface ComposeVariant {
  seq: number;
  survey: SurveySchema;
  total: number;
  score: number;
  byType: Record<string, number>;
  byDifficulty: Record<string, number>;
  repeated: number;
  templateIds?: string[];
  projectId?: string;
}

export interface ComposePlan {
  name: string;
  seed?: number;
  sets?: number;
  variants: ComposeVariant[];
  warnings: string[];
}

export interface ComposeRequest {
  name?: string;
  repoIds: string[];
  types: ComposeType[];
  chapters?: string[];
  difficulties?: string[];
  tags?: string[];
  keyword?: string;
  mode: 'random' | 'ratio' | 'sequential' | 'split';
  counts?: Record<string, number>;
  scores?: Record<string, number>;
  ratios?: Record<string, number>;
  rangeStart?: Record<string, number>;
  rangeEnd?: Record<string, number>;
  totalQuestions?: number;
  difficultyWeights?: Record<string, number>;
  sets?: number;
  seed?: number;
  uniqueAcrossPapers?: boolean;
  shortagePolicy?: 'reuse' | 'less' | 'error';
  publish?: boolean;
  category?: string;
  parentId?: string;
}

export const getComposeStats = (repoIds: string[]) =>
  get<ComposeStats>('/api/compose/stats', { repoIds: repoIds.join(',') });

export const planCompose = (data: ComposeRequest) => post<ComposePlan>('/api/compose/plan', data);

export const createCompose = (data: ComposeRequest) =>
  post<{ projectIds: string[]; plan: ComposePlan }>('/api/compose/create', data);

export interface ComposePickRequest {
  repoIds: string[];
  types?: ComposeType[];
  chapters?: string[];
  difficulties?: string[];
  tags?: string[];
  keyword?: string;
  count?: number;
  counts?: Record<string, number>;
  scores?: Record<string, number>;
  mode?: 'random' | 'sequential';
  seed?: number;
  excludeIds?: string[];
}

export const pickFromRepo = (data: ComposePickRequest) => post<SurveySchema[]>('/api/compose/pick', data);

export const TYPE_LABELS: Record<ComposeType, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  Textarea: '简答',
};

export const COMPOSE_TYPES: ComposeType[] = ['Radio', 'Checkbox', 'Judge', 'FillBlank', 'Textarea'];
