import { get, post } from './request';
import type { SurveySchema } from '../schema/types';

/**
 * AI 能力的前端契约层，以后端 server/api/.../AiApi.java 为准。
 *
 * 2026-11 起 AI 从「聊天 + 凭空出卷」改成「对话即操作」：
 * - 出题 = 从题库抽题（/ai/paper/pick），不再让模型编题；
 * - 新增试卷质检、题库体检、错题重练、公告草稿、批量批改；
 * - 长任务统一走 /ai/paper/job/{jobId} 轮询，result 结构由 scene 决定。
 *
 * 页面只从这里调接口，字段名改动只改这一个文件。
 */

/** 组卷难度：易 / 中 / 难 / 混合（不传后端按 mixed 处理） */
export type AiDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

/** 改题风格：讲清楚 / 中性 / 更短 */
export type AiRewriteStyle = 'clear' | 'neutral' | 'shorter';

/** 题型配比：键是 SurveySchema.QuestionType 的枚举名，值是 0~1 的占比（后端会归一化） */
export type AiTypeRatio = Record<string, number>;

/** 题型 → 每题分值 */
export type AiTypeScores = Record<string, number>;

/* ------ 长任务 ------ */

/** 任务状态：后端只会给前四个 */
export type AiJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';

/** 统一的 AI 长任务视图；result 按 scene 收窄（见下面的 *Result 类型） */
export interface AiJobView<T> {
  jobId?: string;
  /** paper_pick / paper_check / repo_audit / practice_recommend / grade_batch */
  scene?: string;
  status: AiJobStatus;
  /** 0~100 */
  progress?: number;
  /** 失败原因（后端已给中文：限额、没权限、模型报错…） */
  error?: string;
  result?: T;
}

/** 预览表统计（后端算好，前端不要再算一遍，避免口径不一致） */
export interface AiPaperStats {
  questionCount?: number;
  totalScore?: number;
  typeCount?: Record<string, number>;
  typeScore?: Record<string, number>;
}

/* ------ ① 从题库抽题组卷 ------ */

export interface AiPaperPickRequest {
  /** 落到哪个项目（可空：空 = 只预览） */
  projectId?: string;
  repoIds: string[];
  chapters?: string[];
  difficulties?: AiDifficulty[];
  typeRatio: AiTypeRatio;
  typeScores?: AiTypeScores;
  questionCount: number;
  totalScore: number;
  requirements?: string;
  /** 是否让模型挑选（默认 true）；false = 纯条件随机抽，不花 token */
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
  /** 中文摘要：从几个题库多少候选里选了多少题 */
  summary?: string;
  candidates?: number;
  /** 题库里不够的题数（>0 说明条件太窄） */
  missing?: number;
}

export const pickAiPaper = (data: AiPaperPickRequest) =>
  post<{ jobId: string }>('/api/ai/paper/pick', data);

/** 查任务：组卷 / 质检 / 题库体检 / 错题重练 / 批量批改共用 */
export const getAiJob = <T>(jobId: string) =>
  get<AiJobView<T>>('/api/ai/paper/job/' + encodeURIComponent(jobId));

/* ------ ② 试卷质检 ------ */

export interface AiPaperIssue {
  /** no_score / no_answer / duplicate / difficulty / coverage / format / type_mix */
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

/* ------ ③ 题库体检 ------ */

export interface AiRepoAuditRequest {
  repoId: string;
  chapter?: string;
  templateIds?: string[];
  /** 最多体检多少题（默认 40，上限 120） */
  limit?: number;
  includeDuplicates?: boolean;
  includeAnalysis?: boolean;
}

export interface AiRepoDuplicate {
  ids?: string[];
  titles?: string[];
  similarity?: number;
  reason?: string;
  /** merge 合并留一 / review 人工确认 */
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

/* ------ ④ 错题重练推荐 ------ */

export interface AiPracticeRecommendRequest {
  sourceProjectId: string;
  classId?: string;
  repoId: string;
  questionCount?: number;
  targetProjectId?: string;
}

export interface AiPracticeFocus {
  point?: string;
  /** 0~1 的得分率，越低越需要重练 */
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

/* ------ ⑤ 公告草稿 ------ */

export interface AiNoticeDraftRequest {
  /** 老师写的要点（必填） */
  points: string;
  /** all / admin / teacher / student / class */
  audience?: string;
  classIds?: string[];
  /** formal 正式 / brief 简短 / warm 温和 */
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

/* ------ ⑥ 批量 AI 批改（可撤销） ------ */

export interface AiGradeBatchRequest {
  projectId: string;
  classId?: string;
  /** 最多处理多少份答卷（默认 30，上限 100） */
  maxAnswers?: number;
  /** 低于该置信度仍然写分，但列进「需复核」（默认 0.6） */
  minConfidence?: number;
  /** true = 只统计不写库 */
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
  /** 24 小时有效的撤销令牌 */
  undoToken?: string;
  answerIds?: string[];
}

export const batchGradeAi = (data: AiGradeBatchRequest) =>
  post<{ jobId: string }>('/api/ai/grade/batch', data);

/** 撤销一次批量批改（按令牌清空当时写入的分数） */
export const undoAiGrade = (token: string) =>
  post<{ answers: number }>('/api/ai/grade/undo?token=' + encodeURIComponent(token));

/* ------ ⑦ 改题 / 批改建议 / 学情（保留的同步接口） ------ */

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

/* ------ ⑧ 用量 / 状态 ------ */

export interface AiUsageToday {
  userTokens?: number;
  userLimit?: number;
  dailyTokens?: number;
  dailyLimit?: number;
  scenes?: Array<{ scene: string; calls: number; tokens: number }>;
}

export const getAiUsageToday = () => get<AiUsageToday>('/api/ai/usage/today');

/** AI 可用性：enabled=false 表示系统设置里总开关关着（入口不该显示） */
export interface AiStatus {
  enabled?: boolean;
  ready: boolean;
  reason?: string;
  model?: string;
}

export const getAiStatus = () => get<AiStatus>('/api/ai/status');

/* ------ ⑨ 对话（会执行动作） ------ */

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 当前页面上下文：只放「在哪一页、哪个 id」。
 * 试卷名 / 题干 / 答卷信息一律由后端按 id 查库补齐——不让前端传文案，
 * 因为这段内容会进系统提示，前端能自由填就等于任何人在控制台里都能往提示词里塞指令。
 */
export interface AiChatContext {
  route?: string;
  page?: string;
  projectId?: string;
  questionId?: string;
  answerId?: string;
  /** 当前班级（「把这个班没批的批了」全靠它） */
  classId?: string;
  /** 当前题库（题库体检 / 抽题用） */
  repoId?: string;
}

/** 一次对话里 AI 真正执行的动作，界面据此渲染结果卡 */
export interface AiChatAction {
  /** grade_batch / open_tool / answer_query / usage_query / info */
  key?: string;
  status?: 'info' | 'running' | 'done' | 'failed';
  title?: string;
  summary?: string;
  /** paper_pick / paper_check / repo_audit / recommend_practice / notice_draft / rewrite_question */
  tool?: string;
  /** 「去查看」的站内地址 */
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
  /** 后端带给模型的上下文摘要，例如「试卷《2026 春季考试》· 第 3 题」 */
  contextLabel?: string;
  /** 这次对话执行了系统动作时为非空 */
  action?: AiChatAction;
}

export const chatWithAi = (data: { messages: AiChatMessage[]; context?: AiChatContext; model?: string }) =>
  post<AiChatReply>('/api/ai/chat', data);
