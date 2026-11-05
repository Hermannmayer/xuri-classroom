/**
 * 问卷 DSL 类型 —— 与后端 SurveySchema.java 一一对应。
 * 整棵树作为 t_project.survey 的一个 JSON 字段存取，没有独立的题目表。
 */

export type QuestionType =
  | 'FillBlank'
  | 'Textarea'
  | 'MultipleBlank'
  | 'Signature'
  | 'Score'
  | 'Radio'
  | 'Checkbox'
  | 'Select'
  | 'Cascader'
  | 'Upload'
  | 'MatrixAuto'
  | 'MatrixRadio'
  | 'MatrixCheckbox'
  | 'MatrixFillBlank'
  | 'MatrixScore'
  | 'MatrixNps'
  | 'Survey'
  | 'QuestionSet'
  | 'RichText'
  | 'Pagination'
  | 'Remark'
  | 'SplitLine'
  | 'Option'
  | 'User'
  | 'Dept'
  | 'Nps'
  | 'HorzBlank'
  | 'Address'
  | 'Barcode'
  | 'Judge'
  | 'RandomSurvey';

/** 会存答案的题型 */
export const DATA_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>([
  'FillBlank',
  'Textarea',
  'MultipleBlank',
  'Signature',
  'Score',
  'Radio',
  'Checkbox',
  'Select',
  'Cascader',
  'Upload',
  'MatrixAuto',
  'MatrixRadio',
  'MatrixCheckbox',
  'MatrixFillBlank',
  'MatrixScore',
  'MatrixNps',
  'User',
  'Dept',
  'Nps',
  'HorzBlank',
  'Address',
  'Barcode',
  'RichText',
  'Judge',
]);

/** 空结构节点，不存答案 */
export const VOID_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>([
  'Survey',
  'QuestionSet',
  'Pagination',
  'Remark',
  'SplitLine',
  'Option',
  'RandomSurvey',
]);

/** 可自动计分 */
export const EXAM_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>([
  'FillBlank',
  'Textarea',
  'MultipleBlank',
  'Radio',
  'Checkbox',
  'Select',
  'HorzBlank',
]);

export type DataType =
  | 'text'
  | 'number'
  | 'date'
  | 'dateTime'
  | 'time'
  | 'email'
  | 'mobile'
  | 'idCard'
  | 'select'
  | 'selectDict'
  | 'chinese'
  | 'alphabet'
  | 'horzBlank'
  | 'password';

export type SchemaMode = 'exam' | 'survey';
export type ExamScoreMode = 'onlyOne' | 'selectAll' | 'selectCorrect' | 'select' | 'manual' | 'none';
export type ExamMatchRule = 'completeSame' | 'contain';
export type RejectOtherOption = 'rejectAll' | 'rejectOther';
export type LinkType = 'eq' | 'like';

export interface ExpressionMessage {
  id?: string;
  expression?: string;
  message?: string;
}

export interface DataSource {
  label: string;
  value: string;
  children?: DataSource[];
}

export interface Row {
  id: string;
  title: string;
}

export interface LinkField {
  linkQuestionId?: string;
  linkOptionId?: string;
  fillQuestionId?: string;
  fillOptionId?: string;
}

export interface LinkSurvey {
  enableUpdate?: boolean;
  linkSurveyId?: string;
  linkQuestionId?: string;
  linkOptionId?: string;
  linkType?: LinkType;
  linkFields?: LinkField[];
}

/** 70+ 属性，只声明实际会读写到的字段；其余走索引签名透传 */
export interface Attribute {
  display?: 'none' | 'visible' | 'hidden';
  hidden?: boolean;
  width?: number;
  dataType?: DataType;
  required?: boolean;
  defaultChecked?: boolean;
  rows?: number;
  columns?: number;
  scope?: string;
  scopeDesc?: string;
  softScope?: string;
  softScopeDesc?: string;
  readOnly?: boolean;
  suffix?: string;
  textLimit?: string;
  answerLimit?: string;
  finish?: boolean;
  currentPage?: number;
  totalPage?: number;
  submitButton?: string;
  numericScale?: number;
  backgroundImage?: string;
  headerImage?: string;
  fileAccept?: string;
  maxFileCount?: number;
  maxFileSize?: number;
  scoreStyle?: string;
  autoSize?: string;
  cameraOnly?: boolean;
  content?: string;
  mapMove?: boolean;
  statEnabled?: boolean;
  npsStart?: string;
  npsEnd?: string;
  npsStartNum?: number;
  npsTotalNum?: number;
  npsInvertSort?: boolean;

  // 规则：全部是字符串表达式（后端只存不算）
  finishRule?: string;
  visibleRule?: string;
  requiredRule?: string;
  replaceTextRule?: string;
  validateRule?: string;
  jumpRule?: string;
  checkedRule?: string;
  calculate?: string;
  globalRule?: string[];

  rejectOtherOption?: RejectOtherOption;
  examScore?: number;
  examAnswerMode?: ExamScoreMode;
  examMatchRule?: ExamMatchRule;
  examCorrectAnswer?: string;
  examAnalysis?: string;
  dateTimeFormat?: string;
  fieldInTitle?: boolean;
  cornerText?: string;
  exclusiveFillBlankInMatrix?: boolean;
  cascaderLevel?: number;
  dictCode?: string;
  unique?: boolean;
  uniqueText?: string;
  regexp?: ExpressionMessage[];
  quota?: number;
  placeholder?: string;
  mode?: SchemaMode;
  randomSurvey?: RandomSurveyCondition[];
}

export interface RandomSurveyCondition {
  id?: string;
  /** 题库 id */
  repoId?: string;
  /** 题库选择题数 */
  questionsNum?: number;
  /** 每题分数 */
  examScore?: number;
  tags?: string[];
  types?: string[];
}

export interface SurveySchema {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  attribute: Attribute;
  dataSource?: DataSource[];
  children?: SurveySchema[];
  row?: Row[];
  linkSurveys?: LinkSurvey[];
  tags?: string[];
}
