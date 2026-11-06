/**
 * 项目（问卷/考试/文件夹）与发布设置 —— 与后端 Project.java / ProjectSetting.java 对齐。
 * 问卷整棵树存在 Project.survey 一个 JSON 字段里。
 */
import type { SurveySchema } from './types';

export type ProjectModeEnum = 'survey' | 'exam' | 'folder';
export type TriggerType = 'onInput' | 'onBlur' | 'onSubmit';
export type AnswerFreqEnum = 'day' | 'hour' | 'minute' | 'none';

export interface UniqueLimitSetting {
  limitNum?: number;
  limitFreq?: AnswerFreqEnum;
}

export interface PublicQuery {
  id?: string;
  title?: string;
  enabled?: boolean;
  description?: string;
  password?: string;
  conditionQuestion?: string;
  /** 查询字段权限 0隐藏 1读 2写 */
  fieldPermission?: Record<string, number>;
  enableUpdate?: boolean;
  linkValidityPeriod?: string[];
}

export interface AnswerSetting {
  password?: string;
  progressBar?: boolean;
  loginRequired?: boolean;
  questionNumber?: boolean;
  autoSave?: boolean;
  initialValues?: Record<string, unknown>;
  maxAnswers?: number;
  /** 截止回收时间（时间戳） */
  endTime?: number;
  wechatOnly?: boolean;
  wechatUserInfo?: boolean;
  ipLimit?: UniqueLimitSetting;
  cookieLimit?: UniqueLimitSetting;
  loginLimit?: UniqueLimitSetting;
  onePageOneQuestion?: boolean;
  answerSheetVisible?: boolean;
  whitelistType?: number;
  whitelistLimit?: UniqueLimitSetting;
  triggerType?: TriggerType;
  copyEnabled?: boolean;
  defaultLocale?: string;
}

export interface SubmittedSetting {
  contentHtml?: string;
  enableUpdate?: boolean;
  redirectUrl?: string;
  publicQuery?: PublicQuery[];
  answerAnalysis?: boolean;
  transcriptVisible?: boolean;
  rankVisible?: boolean;
}

export interface ExamSetting {
  startTime?: number;
  endTime?: number;
  minSubmitMinutes?: number;
  maxSubmitMinutes?: number;
  rankingEnabled?: boolean;
  exerciseMode?: boolean;
  passMode?: boolean;
  passModePerSeconds?: number;
  randomOrder?: boolean;
  randomSurvey?: import('./types').RandomSurveyCondition[];
  randomSurveyWrong?: boolean;
  maxSwitchScreenTimes?: number;
}

export interface ProjectSetting {
  /** 1 开启 0 停止 */
  status?: number;
  mode?: ProjectModeEnum;
  answerSetting?: AnswerSetting;
  submittedSetting?: SubmittedSetting;
  examSetting?: ExamSetting;
}

/** 列表/详情视图 */
export interface Project {
  id: string;
  name: string;
  parentId?: string;
  mode?: ProjectModeEnum;
  survey?: SurveySchema;
  setting?: ProjectSetting;
  status?: number;
  priority?: number;
  /** 答卷数 */
  total?: number;
  totalOfToday?: number;
  lastUpdate?: number;
  averageDuration?: number;
  createAt?: string;
  updateAt?: string;
  answerId?: string;
  tempAnswer?: boolean;
}

/** 写入用 */
export interface ProjectRequest {
  id?: string;
  name?: string;
  mode?: ProjectModeEnum;
  survey?: SurveySchema;
  setting?: ProjectSetting;
  status?: number;
  parentId?: string;
  belongGroup?: string;
  settingKey?: string;
  settingValue?: string;
  ids?: string[];
}

/** 答卷：answer 是 questionId → 值 的扁平 map，survey 是答卷时的快照 */
export interface Answer {  id: string;
  projectId: string;
  repoId?: string;
  answer?: Record<string, unknown>;
  tempAnswer?: Record<string, unknown>;
  survey?: SurveySchema;
  metaInfo?: Record<string, unknown>;
  examScore?: number;
  rank?: number;
  examInfo?: Record<string, unknown>;
  /** 0 暂存 / 1 已完成 */
  tempSave?: number;
  createAt?: string;
  createBy?: string;
  createByName?: string;
  updateAt?: string;
}

/** 逐题下发时首屏只返回的安全大纲，绝不包含题干/选项/题目属性 */
export interface PublicQuestionOutline {
  id: string;
  type: import('./types').QuestionType;
  number: number;
  required: boolean;
}

/** 公开答题：POST /api/public/projectOutline 的返回 */
export interface PublicProjectView {
  id: string;
  survey?: SurveySchema;
  outline?: PublicQuestionOutline[];
  status?: number;
  setting?: ProjectSetting;
  name?: string;
  mode?: ProjectModeEnum;
  passwordRequired?: boolean;
  loginRequired?: boolean;
  createAt?: string;
  submittedHtml?: string;
  /** 当前会话对应的答卷 id（续答用） */
  answerId?: string;
  /** 允许修改且已识别身份时，后端回填的旧答案 */
  answer?: Record<string, unknown>;
  isAuthenticated?: boolean;
  wechatAuthorizationRequired?: boolean;
  examInfo?: Record<string, unknown>;
}

/** 公开答题：POST /api/public/saveAnswer 的返回 */
export interface PublicAnswerView {
  answerId?: string;
  examScore?: number;
  examRanking?: number;
  questionScore?: Record<string, number>;
  answer?: Record<string, unknown>;
  createAt?: string;
}
