import { get, post } from './request';
import type { SurveySchema } from '../schema/types';













export type AiDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';


export type AiRewriteStyle = 'clear' | 'neutral' | 'shorter';


export type AiTypeRatio = Record<string, number>;


export type AiTypeScores = Record<string, number>;




export type AiJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';


export interface AiJobView<T> {
  jobId?: string;

  scene?: string;
  status: AiJobStatus;

  progress?: number;

  error?: string;
  result?: T;
}


export interface AiPaperStats {
  questionCount?: number;
  totalScore?: number;
  typeCount?: Record<string, number>;
  typeScore?: Record<string, number>;
}



export interface AiPaperPickRequest {

  projectId?: string;
  repoIds: string[];
  chapters?: string[];
  difficulties?: AiDifficulty[];
  typeRatio: AiTypeRatio;
  typeScores?: AiTypeScores;
  questionCount: number;
  totalScore: number;
  requirements?: string;

  aiSelect?: boolean;
}

export interface AiPaperPickNote {
  questionId?: string;
  title?: string;
  reason?: string;
}

export interface AiPaperPickResult {
  questions?: SurveySchema[];
  stats?: AiPaperStats;
  notes?: AiPaperPickNote[];

  summary?: string;
  candidates?: number;

  missing?: number;
}

export const pickAiPaper = (data: AiPaperPickRequest) =>
  post<{ jobId: string }>('/api/ai/paper/pick', data);

/** 查任务：组卷 / 质检 / 题库体检 / 错题重练 / 批量批改共用 */
export const getAiJob = <T>(jobId: string) =>
  get<AiJobView<T>>('/api/ai/paper/job/' + encodeURIComponent(jobId));



export interface AiPaperIssue {

  kind?: string;
  severity?: 'blocker' | 'warning';
  questionIds?: string[];
  message?: string;
  suggestion?: string;
}

export interface AiPaperCheckResult {
  score?: number;
  summary?: string;
  advice?: string;
  issues?: AiPaperIssue[];
}

export const checkAiPaper = (data: { projectId: string; aiSummary?: boolean }) =>
  post<{ jobId: string }>('/api/ai/paper/check', data);



export interface AiRepoAuditRequest {
  repoId: string;
  chapter?: string;
  templateIds?: string[];

  limit?: number;
  includeDuplicates?: boolean;
  includeAnalysis?: boolean;
}

export interface AiRepoDuplicate {
  ids?: string[];
  titles?: string[];
  similarity?: number;
  reason?: string;

  suggestion?: string;
}

export interface AiRepoPatch {
  id?: string;
  title?: string;
  difficulty?: string;
  chapter?: string;
  tags?: string[];
  analysis?: string;
  reason?: string;
}

export interface AiRepoAuditResult {
  summary?: string;
  issues?: AiPaperIssue[];
  duplicates?: AiRepoDuplicate[];
  patches?: AiRepoPatch[];
  checked?: number;
}

export const auditAiRepo = (data: AiRepoAuditRequest) =>
  post<{ jobId: string }>('/api/ai/repo/audit', data);

/** 应用体检建议：只写填了值的字段 */
export const applyAiRepoAudit = (data: { repoId: string; patches: AiRepoPatch[] }) =>
  post<{ updated: number }>('/api/ai/repo/audit/apply', data);



export interface AiPracticeRecommendRequest {
  sourceProjectId: string;
  classId?: string;
  repoId: string;
  questionCount?: number;
  targetProjectId?: string;
}

export interface AiPracticeFocus {
  point?: string;

  rate?: number;
  questions?: number;
  recommended?: number;
}

export interface AiPracticeRecommendResult {
  questions?: SurveySchema[];
  focus?: AiPracticeFocus[];
  summary?: string;
  stats?: AiPaperStats;
}

export const recommendAiPractice = (data: AiPracticeRecommendRequest) =>
  post<{ jobId: string }>('/api/ai/practice/recommend', data);



export interface AiNoticeDraftRequest {

  points: string;

  audience?: string;
  classIds?: string[];

  tone?: string;
  subject?: string;
}

export interface AiNoticeDraftResult {
  title?: string;
  content?: string;
  audience?: string;
  classIds?: string[];
  tip?: string;
}

export const draftAiNotice = (data: AiNoticeDraftRequest) =>
  post<AiNoticeDraftResult>('/api/ai/notice/draft', data);



export interface AiGradeBatchRequest {
  projectId: string;
  classId?: string;

  maxAnswers?: number;

  minConfidence?: number;

  dryRun?: boolean;
}

export interface AiGradeBatchLow {
  answerId?: string;
  answererName?: string;
  questionId?: string;
  questionTitle?: string;
  score?: number;
  maxScore?: number;
  confidence?: number;
  reason?: string;
}

export interface AiGradeBatchResult {
  answers?: number;
  items?: number;
  graded?: number;
  skipped?: number;
  failed?: number;
  lowConfidence?: AiGradeBatchLow[];
  summary?: string;

  undoToken?: string;
  answerIds?: string[];
}

export const batchGradeAi = (data: AiGradeBatchRequest) =>
  post<{ jobId: string }>('/api/ai/grade/batch', data);

/** 撤销一次批量批改（按令牌清空当时写入的分数） */
export const undoAiGrade = (token: string) =>
  post<{ answers: number }>('/api/ai/grade/undo?token=' + encodeURIComponent(token));



export interface AiRewriteSuggestion {
  text: string;
  reason?: string;
}

/**
 * 改题：同步接口，1~3 秒，正常给 3 条建议。
 * title / type 可选：带上就不读库、直接拿这份题干改写，老师的题还没保存也能用。
 */
export const rewriteAiQuestion = (data: {
  projectId: string;
  questionId: string;
  style: AiRewriteStyle;
  title?: string;
  type?: string;
}) => post<{ suggestions: AiRewriteSuggestion[] }>('/api/ai/question/rewrite', data);

/** 采纳题目：追加进项目 schema（不替换原有内容） */
export const applyAiPaper = (data: { projectId: string; questions: SurveySchema[] }) =>
  post<{ projectId: string; added: number; total: number }>('/api/ai/paper/apply', data);



export interface AiUsageToday {
  userTokens?: number;
  userLimit?: number;
  dailyTokens?: number;
  dailyLimit?: number;
  scenes?: Array<{ scene: string; calls: number; tokens: number }>;
}

export const getAiUsageToday = () => get<AiUsageToday>('/api/ai/usage/today');


export interface AiStatus {
  enabled?: boolean;
  ready: boolean;
  reason?: string;
  model?: string;
}

export const getAiStatus = () => get<AiStatus>('/api/ai/status');



export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}






export interface AiChatContext {
  route?: string;
  page?: string;
  projectId?: string;
  questionId?: string;
  answerId?: string;

  classId?: string;

  repoId?: string;
}


export interface AiChatAction {

  key?: string;
  status?: 'info' | 'running' | 'done' | 'failed';
  title?: string;
  summary?: string;

  tool?: string;

  link?: string;
  jobId?: string;
  undoToken?: string;
  params?: Record<string, unknown>;
}

export interface AiChatReply {
  reply: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costMs?: number;

  contextLabel?: string;

  action?: AiChatAction;
}

export const chatWithAi = (data: { messages: AiChatMessage[]; context?: AiChatContext; model?: string }) =>
  post<AiChatReply>('/api/ai/chat', data);
