import { download, get, getWithPagination, http, post } from './request';
import type { ProjectView, SystemInfo, UserInfo } from './types';

export * from './types';
export {
  ApiError,
  get,
  post,
  getWithPagination,
  download,
  humanizeApiError,
  setUnauthorizedHandler,
} from './request';

export const getSystem = () => get<SystemInfo>('/api/system');

/**
 * 拉取服务商支持的模型列表（系统设置 → AI 的「从服务商获取」）。
 *
 * <p>可以带上表单里还没保存的 baseUrl / apiKey：管理员通常先填再点，逼他先保存多一步；
 * apiKey 留空表示沿用服务端已保存的。响应只回模型 id，Key 不会出现在响应里。
 */
export const getAiModels = (preview?: { baseUrl?: string; apiKey?: string }) =>
  post<{ baseUrl?: string; models: string[]; count: number }>('/api/system/aiModels', preview ?? {});

export interface LoginRequest {
  username: string;
  password: string;
  captchaVerification?: string;
  authType?: string;
}

/** 成功时只有 Set-Cookie，没有响应体 */
export const login = (data: LoginRequest) => post<null>('/api/public/login', data);
export const logout = () => post<null>('/api/public/logout');
export const getCurrentUser = () => get<UserInfo>('/api/currentUser');



export interface ProjectListQuery {
  current?: number;
  pageSize?: number;
  name?: string;

  parentId?: string;

  flat?: boolean;
  mode?: 'survey' | 'exam' | 'folder';
}

export interface CreateProjectRequest {
  name: string;
  mode: 'survey' | 'exam';
  parentId?: string;
  setting?: Record<string, unknown>;
  survey?: Record<string, unknown>;
}

export const listProjects = (query: ProjectListQuery = {}) =>
  getWithPagination<ProjectView>('/api/project/list', query as Record<string, unknown>);


export interface RepoReportInfo {
  repoId: string;
  repoName?: string;

  total: number;

  byType: Record<string, number>;

  byDifficulty: Record<string, number>;
  practice: { count: number; students: number; avgScore?: number };
}

export const getRepoReport = (repoId: string) => get<RepoReportInfo>('/api/repo/report', { repoId });

export const getProject = (id: string) => get<ProjectView>('/api/project', { id });

export const createProject = (data: CreateProjectRequest) => post<ProjectView>('/api/project/create', data);

/** 全量更新；只传 id+name 就是改名，带 settingKey/settingValue 就是改单项设置 */
export const updateProject = (data: Record<string, unknown>) => post<void>('/api/project/update', data);
export const updateProjectStatus = (data: { id: string; status: number }) => post<void>('/api/project/status', data);

export const deleteProject = (id: string) => post<void>('/api/project/delete', { id });



export interface GradeItem {
  questionId: string;

  type?: string;
  title?: string;

  number?: number;

  richTitle?: boolean;

  maxScore?: number;




  score?: number;
  comment?: string;

  editable?: boolean;

  answer?: unknown;

  correctAnswer?: string;

  analysis?: string;
}


export interface GradeDetail {
  answerId: string;
  projectId?: string;
  projectName?: string;

  answererName?: string;
  anonymous?: boolean;

  gradeStatus?: 'none' | 'pending' | 'graded';
  gradedBy?: string;
  gradedByName?: string;
  gradedAt?: string;
  createAt?: string;
  attemptNo?: number;

  examScore?: number;

  objectiveScore?: number;

  manualScore?: number;

  totalScore?: number;

  pendingCount?: number;

  schema?: import('../schema/types').SurveySchema;
  items?: GradeItem[];
}

export interface GradeSubmitItem {
  questionId: string;
  score: number;
  comment?: string;
}

/**
 * 批改详情。
 *
 * 老师端默认连参考答案 / 解析一起拿（接口本身默认不下发），批改时才能对照评分标准。
 * 这个接口要求 answer:grade，学生端走的是公开成绩单接口，拿不到这些字段。
 */
export const getGradeDetail = (answerId: string) =>
  get<GradeDetail>('/api/answer/grade/detail', { answerId, includeCorrectAnswer: true });

/**
 * 保存批改：只提交人工评分题的分数。
 *
 * 后端会拒绝客观题传分（400）；submit=true 时若所有主观题都已给分，答卷状态变 graded。
 */
export const submitGrade = (data: {
  answerId: string;
  items: GradeSubmitItem[];
  submit?: boolean;
}) => post<void>('/api/answer/grade', data);

/** 撤销批改：questionIds 为空表示整卷清空人工分 */
export const resetGrade = (data: { answerId: string; questionIds?: string[] }) =>
  post<void>('/api/answer/grade/reset', data);




export interface AnswerPdfJobView {
  jobId: string;

  status: 'queued' | 'running' | 'done' | 'failed' | 'canceled';
  total: number;
  done: number;
  failed: number;

  bytes?: number;

  error?: string;

  message?: string;

  fileName?: string;

  progress?: number;
}


export type AnswerExportOutput = 'answerPdf' | 'answerSheetPdf' | 'answerImage' | 'confirmSheetPdf';

export interface AnswerPdfJobRequest {
  projectId: string;

  classId?: string;

  ids?: string[];

  attemptNo?: number;

  startTime?: string;
  endTime?: string;





  gradeStatus?: string;

  createByName?: string;

  minScore?: number;

  maxScore?: number;

  includeAnonymous?: boolean;

  includeAnalysis?: boolean;



  includeImages?: boolean;




  outputs?: AnswerExportOutput[];
}

/**
 * 建任务：立即返回 jobId，渲染在后台线程池里跑（50 份也不会把请求拖住）。
 *
 * 导出密码沿用答卷导出那一套：先 POST /api/answer/export/token 换一次性 token，再带上它建任务；
 * 没配置导出密码时 token 可有可无。
 */
export const createAnswerPdfJob = (data: AnswerPdfJobRequest, exportToken?: string) =>
  post<{ jobId: string }>(
    `/api/answer/export/pdf-job${exportToken ? `?exportToken=${encodeURIComponent(exportToken)}` : ''}`,

    data.outputs && data.outputs.length > 0 ? { ...data } : { ...data, type: 'answerPdf' },
  );

/** 查进度（前端每 2 秒轮询一次） */
export const getAnswerPdfJob = (jobId: string) =>
  get<AnswerPdfJobView>(`/api/answer/export/pdf-job/${jobId}`);

/** 下载 ZIP：一次性 token 用一次就失效，下载前要重新换一个 */
export const downloadAnswerPdfJob = (jobId: string, exportToken: string | undefined, fallbackName: string) =>
  download(`/api/answer/export/pdf-job/${jobId}/file`, { exportToken }, fallbackName);

/** 取消任务（关弹窗时调用）：在跑的会在下一份之前停下，已完成的会连产物一起删掉 */
export const cancelAnswerPdfJob = (jobId: string) =>
  http<void>('DELETE', `/api/answer/export/pdf-job/${jobId}`);
