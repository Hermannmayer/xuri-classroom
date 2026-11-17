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

/* ---------------------------------------------------------------- 项目（考试/问卷） */

export interface ProjectListQuery {
  current?: number;
  pageSize?: number;
  name?: string;
  /** 不传只返回根级；文件夹子项必须带 parentId 才会出现 */
  parentId?: string;
  /** true=忽略根级限制，返回所有层级的可见项目（学员任务列表用） */
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

export const getProject = (id: string) => get<ProjectView>('/api/project', { id });

export const createProject = (data: CreateProjectRequest) => post<ProjectView>('/api/project/create', data);

/** 全量更新；只传 id+name 就是改名，带 settingKey/settingValue 就是改单项设置 */
export const updateProject = (data: Record<string, unknown>) => post<void>('/api/project/update', data);
export const updateProjectStatus = (data: { id: string; status: number }) => post<void>('/api/project/status', data);

export const deleteProject = (id: string) => post<void>('/api/project/delete', { id });
/* ------ 主观题人工批改（权限点 answer:grade） */

/** 批改抽屉里的单题视图（后端 AnswerGradeItemView） */
export interface GradeItem {
  questionId: string;
  /** 题型：SurveySchema.QuestionType 的枚举名 */
  type?: string;
  title?: string;
  /** 题号，从 1 开始 */
  number?: number;
  /** 题干含 HTML（Word 导入的图片等），用 RichTextContent 渲染 */
  richTitle?: boolean;
  /** 该题满分 */
  maxScore?: number;
  /**
   * 当前得分：人工评分题是老师给的分（**没批改时为空**，不能当 0 分展示）；
   * 其余题是机器判出来的分。
   */
  score?: number;
  comment?: string;
  /** 只有 examAnswerMode=manual 的题可以改分，客观题的机器分不可覆盖 */
  editable?: boolean;
  /** 学员答案原始值（与答卷 answer 里该题的值一致） */
  answer?: unknown;
  /** 参考答案：只有请求带 includeCorrectAnswer=true 时才下发 */
  correctAnswer?: string;
  /** 答案解析：同上 */
  analysis?: string;
}

/** 批改抽屉的整卷视图（后端 AnswerGradeView） */
export interface GradeDetail {
  answerId: string;
  projectId?: string;
  projectName?: string;
  /** 答题人姓名（交卷时快照）；匿名且没填时为空 */
  answererName?: string;
  anonymous?: boolean;
  /** none 无需批改 / pending 待批改 / graded 已批改 */
  gradeStatus?: 'none' | 'pending' | 'graded';
  gradedBy?: string;
  gradedByName?: string;
  gradedAt?: string;
  createAt?: string;
  attemptNo?: number;
  /** 当前总分 = 客观题机器分 + 主观题人工分 */
  examScore?: number;
  /** 客观题机器分小计 */
  objectiveScore?: number;
  /** 主观题人工分小计 */
  manualScore?: number;
  /** 卷面满分 */
  totalScore?: number;
  /** 还有几道主观题没给分 */
  pendingCount?: number;
  /** 答卷用的题目树（请求带 includeCorrectAnswer=true 时保留正确答案） */
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

/* ------ 班级答卷 PDF 导出（异步任务，权限点 answer:export） */

/** PDF 导出任务的进度视图（后端 AnswerPdfJobService#describe） */
export interface AnswerPdfJobView {
  jobId: string;
  /** queued 排队 / running 渲染中 / done 可下载 / failed 失败 / canceled 已取消 */
  status: 'queued' | 'running' | 'done' | 'failed' | 'canceled';
  total: number;
  done: number;
  failed: number;
  /** 产物字节数，完成后才有 */
  bytes?: number;
  /** 整体失败原因（例如字体没装、这个班没有答卷） */
  error?: string;
  /** 汇总文案，例如「成功 12 份，失败 1 份（张三）」 */
  message?: string;
  /** 下载时的 ZIP 文件名 */
  fileName?: string;
  /** 0~100 */
  progress?: number;
}

export interface AnswerPdfJobRequest {
  projectId: string;
  classId: string;
  /** 第几次作答（从 0 开始）；不传 = 全部轮次 */
  attemptNo?: number;
  /** 交卷时间范围，格式 yyyy-MM-dd HH:mm:ss */
  startTime?: string;
  endTime?: string;
  /** 是否附答案解析（默认关：考试没结束时放解析等于泄题） */
  includeAnalysis?: boolean;
  /** 是否嵌入签名题/上传题图片 */
  includeImages?: boolean;
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
    { ...data, type: 'answerPdf' },
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
