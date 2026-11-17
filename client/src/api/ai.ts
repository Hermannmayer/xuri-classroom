import { get, post } from './request';
import type { SurveySchema } from '../schema/types';

/**
 * AI 出卷 / AI 改题的接口层（P4 · 计划文档 §6.3 ①②）。
 *
 * 契约以后端 `server/api/.../AiApi.java` 为准；前端只从这里调，
 * 字段名变动只改这一个文件，别把裸串散落在页面里（和 api/import.ts 一个套路）。
 */

/** 出卷难度：易 / 中 / 难 / 混合（不传时后端按 mixed 处理） */
export type AiDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

/** 改题风格：讲清楚 / 中性 / 更短 */
export type AiRewriteStyle = 'clear' | 'neutral' | 'shorter';

/** 题型配比：键是 SurveySchema.QuestionType 的枚举名，值是 0~1 的占比（后端会归一化） */
export type AiTypeRatio = Record<string, number>;

export interface AiPaperRequest {
  /** 落到哪个项目；可空（空 = 只生成不入库），传了只用于可见性校验与给模型上下文 */
  projectId?: string;
  /** 学科，如「养老护理员」 */
  subject: string;
  /** 级别，如「五级」 */
  level?: string;
  questionCount: number;
  totalScore: number;
  typeRatio: AiTypeRatio;
  difficulty: AiDifficulty;
  /** 自然语言补充要求，如「围绕冬季四防」 */
  requirements?: string;
}

/** 出卷结果汇总：题量 / 总分 / 题型分布都由后端算好，前端直接用 */
export interface AiPaperStats {
  questionCount?: number;
  totalScore?: number;
  /** 题型 -> 题数 */
  typeCount?: Record<string, number>;
  /** 题型 -> 分值合计 */
  typeScore?: Record<string, number>;
}

/** 任务状态：后端实际只会给前四个；canceled 留在联合类型里，将来加取消接口不用改 UI */
export type AiJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';

/** 出卷任务视图（GET /api/ai/paper/job/{jobId}） */
export interface AiPaperJobView {
  jobId?: string;
  status: AiJobStatus;
  /** 0~100 的整数 */
  progress?: number;
  /** 失败原因，后端已给中文（限额、模型报错、AiContentGuard 拒收理由） */
  error?: string;
  result?: {
    /** 可直接塞进画布：id / dataSource / children / examCorrectAnswer 都已由后端补齐 */
    questions?: SurveySchema[];
    stats?: AiPaperStats;
  };
}

/** 一条改题建议：改后的题干（纯文本）+ 为什么这么改 */
export interface AiRewriteSuggestion {
  text: string;
  reason?: string;
}

/** 今日 AI 用量（GET /api/ai/usage/today）：入口处给老师看还剩多少额度 */
export interface AiUsageToday {
  userTokens?: number;
  userLimit?: number;
  dailyTokens?: number;
  dailyLimit?: number;
  scenes?: Array<{ scene: string; calls: number; tokens: number }>;
}

/** 建任务：立即返回 jobId，出卷在后台线程池里跑（30~90 秒，别同步等） */
export const generateAiPaper = (data: AiPaperRequest) =>
  post<{ jobId: string }>('/api/ai/paper/generate', data);

/** 查进度：前端每 2 秒轮询一次（和答卷 PDF 导出的节奏保持一致） */
export const getAiPaperJob = (jobId: string) =>
  get<AiPaperJobView>(`/api/ai/paper/job/${encodeURIComponent(jobId)}`);

/**
 * 改题：同步接口，1~3 秒，正常给 3 条建议（模型少给时按实际条数返回）。
 *
 * `title` / `type` 是可选的：带上就不读库、直接拿这份题干改写，
 * 所以老师的题目还没保存也能用；不带则按项目已保存的 schema 取。
 */
export const rewriteAiQuestion = (data: {
  projectId: string;
  questionId: string;
  style: AiRewriteStyle;
  title?: string;
  type?: string;
}) => post<{ suggestions: AiRewriteSuggestion[] }>('/api/ai/question/rewrite', data);

/**
 * 今日用量：AI 入口显示剩余额度，超限时提示更直观。
 *
 * 拿不到（老版本后端 / 未启用 AI）时不拦主流程，静默忽略即可。
 */
export const getAiUsageToday = () => get<AiUsageToday>('/api/ai/usage/today');

/* ---------- 侧栏 AI 助手（多轮对话） ---------- */

/** 对话消息：只允许 user / assistant；system 由后端生成，前端传了也会被丢掉 */
export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 当前页面上下文：只放「在哪一页、哪个 id」。
 *
 * 试卷名 / 题干 / 答卷信息一律由后端按 id 查库补齐——不让前端传文案，是因为这段内容会进系统提示，
 * 前端能自由填就等于任何人在控制台里都能往提示词里塞指令。
 */
export interface AiChatContext {
  /** 当前路由，如 /survey/1/edit */
  route?: string;
  /** 页面名称，如「试卷编辑器」 */
  page?: string;
  /** 试卷/项目 id */
  projectId?: string;
  /** 当前题目 id */
  questionId?: string;
  /** 当前答卷 id */
  answerId?: string;
}

/** 一轮对话的返回：正文 + 用量 + 后端实际带上的上下文摘要 */
export interface AiChatReply {
  reply: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** 本次调用耗时（含重试），毫秒 */
  costMs?: number;
  /** 后端带给模型的上下文摘要，例如「试卷《2026 春季考试》· 第 3 题」 */
  contextLabel?: string;
}

/** AI 可用性自检（GET /api/ai/status）：ready=false 时 reason 是可直接展示的中文原因 */
export interface AiStatus {
  ready: boolean;
  reason?: string;
  model?: string;
}

/**
 * 现在能不能聊：侧栏打开时先问一次，不能聊就直接显示「去系统设置」的引导，
 * 而不是等用户打完字、点了发送才看到 400。
 */
export const getAiStatus = () => get<AiStatus>('/api/ai/status');

/**
 * 一轮对话：把历史消息 + 当前页面上下文交给后端。
 *
 * 后端会过限额、记用量（t_ai_usage 的 chat 场景）、做内容校验；
 * 没配模型时返回 400 + 中文原因，调用方直接用 `ApiError.message` 展示即可。
 */
export const chatWithAi = (data: { messages: AiChatMessage[]; context?: AiChatContext; model?: string }) =>
  post<AiChatReply>('/api/ai/chat', data);

