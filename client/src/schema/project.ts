/** 项目（问卷/考试/文件夹）与发布设置 —— 与后端 Project.java / ProjectSetting.java 对齐 */
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

  fieldPermission?: Record<string, number>;
  enableUpdate?: boolean;
  linkValidityPeriod?: string[];
}

export interface AnswerSetting {
  password?: string;
  progressBar?: boolean;
  loginRequired?: boolean;

  answererNameRequired?: boolean;
  questionNumber?: boolean;
  autoSave?: boolean;
  initialValues?: Record<string, unknown>;
  maxAnswers?: number;

  endTime?: number;
  wechatOnly?: boolean;
  wechatUserInfo?: boolean;
  ipLimit?: UniqueLimitSetting;
  cookieLimit?: UniqueLimitSetting;
  loginLimit?: UniqueLimitSetting;
  onePageOneQuestion?: boolean;
  autoNextAfterAnswer?: boolean;
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

  scoringEnabled?: boolean;
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

  favoriteEnabled?: boolean;
}

export interface ProjectSetting {

  status?: number;
  mode?: ProjectModeEnum;
  answerSetting?: AnswerSetting;
  submittedSetting?: SubmittedSetting;
  examSetting?: ExamSetting;
}


export interface Project {
  id: string;
  name: string;
  parentId?: string;
  mode?: ProjectModeEnum;
  survey?: SurveySchema;
  setting?: ProjectSetting;
  status?: number;
  priority?: number;

  total?: number;
  totalOfToday?: number;
  lastUpdate?: number;
  averageDuration?: number;
  createAt?: string;
  updateAt?: string;
  answerId?: string;
  tempAnswer?: boolean;
}


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

  tempSave?: number;
  createAt?: string;
  createBy?: string;
  createByName?: string;
  answererName?: string;

  isAnonymous?: boolean;
  updateAt?: string;
}


export interface PublicQuestionOutline {
  id: string;
  type: import('./types').QuestionType;
  number: number;
  required: boolean;
}


export interface PublicProjectView {
  id: string;
  survey?: SurveySchema;
  outline?: PublicQuestionOutline[];
  status?: number;
  setting?: ProjectSetting;
  name?: string;
  mode?: ProjectModeEnum;

  classId?: string;
  passwordRequired?: boolean;
  loginRequired?: boolean;
  createAt?: string;
  submittedHtml?: string;

  answerId?: string;

  answer?: Record<string, unknown>;
  isAuthenticated?: boolean;
  wechatAuthorizationRequired?: boolean;
  examInfo?: Record<string, unknown>;
}


export interface PublicAnswerView {
  answerId?: string;
  examScore?: number;
  examRanking?: number;
  questionScore?: Record<string, number>;
  answer?: Record<string, unknown>;
  createAt?: string;
}
