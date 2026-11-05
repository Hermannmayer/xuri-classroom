/**
 * 属性面板字段描述。面板只按这个数组渲染，加字段 = 加一行，不要在组件里手写 Form.Item。
 * key 必须对应 SurveySchema.Attribute 的字段名。
 */
import type { Attribute } from '../schema/types';

export type AttributeControl = 'text' | 'number' | 'switch' | 'select' | 'textarea';

export const ATTRIBUTE_GROUPS = ['基础', '数据', '校验', '考试', '规则'] as const;
export type AttributeGroup = (typeof ATTRIBUTE_GROUPS)[number];

export interface AttributeOption {
  label: string;
  value: string;
}

export interface AttributeField {
  key: keyof Attribute;
  label: string;
  control: AttributeControl;
  group: AttributeGroup;
  options?: AttributeOption[];
  /** 字段下方说明 */
  hint?: string;
}

const DISPLAY_OPTIONS: AttributeOption[] = [
  { label: '显示', value: 'visible' },
  { label: '隐藏', value: 'hidden' },
  { label: '不显示', value: 'none' },
];

const DATA_TYPE_OPTIONS: AttributeOption[] = [
  { label: '不限', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '日期', value: 'date' },
  { label: '日期时间', value: 'dateTime' },
  { label: '时间', value: 'time' },
  { label: '邮箱', value: 'email' },
  { label: '手机号', value: 'mobile' },
  { label: '身份证号', value: 'idCard' },
  { label: '下拉单选', value: 'select' },
  { label: '下拉字典', value: 'selectDict' },
  { label: '中文', value: 'chinese' },
  { label: '字母', value: 'alphabet' },
  { label: '横线填空', value: 'horzBlank' },
  { label: '密码', value: 'password' },
];

const EXAM_MODE_OPTIONS: AttributeOption[] = [
  { label: '唯一选项', value: 'onlyOne' },
  { label: '全部选对', value: 'selectAll' },
  { label: '按答对项计分', value: 'selectCorrect' },
  { label: '按选项分值', value: 'select' },
  { label: '人工打分', value: 'manual' },
  { label: '不计分', value: 'none' },
];

const RULE_HINT = 'JSON：{"conditionLogic":"AND","conditionItem":[{"qId":"…","condition":"CHECKED","oId":["…"]}]}';

export const attributeSchema: AttributeField[] = [
  // 基础
  { key: 'display', label: '显示状态', control: 'select', group: '基础', options: DISPLAY_OPTIONS },
  { key: 'required', label: '必填', control: 'switch', group: '基础' },
  { key: 'placeholder', label: '占位提示', control: 'text', group: '基础' },

  // 数据
  { key: 'dataType', label: '数据类型', control: 'select', group: '数据', options: DATA_TYPE_OPTIONS },
  { key: 'columns', label: '选项列数', control: 'number', group: '数据' },
  { key: 'rows', label: '行数', control: 'number', group: '数据' },
  { key: 'scope', label: '范围强校验', control: 'text', group: '数据', hint: '超出范围禁止提交' },
  { key: 'softScope', label: '范围软校验', control: 'text', group: '数据', hint: '超出范围仅警告' },
  { key: 'dictCode', label: '字典编码', control: 'text', group: '数据' },

  // 校验
  { key: 'textLimit', label: '文字长度限制', control: 'text', group: '校验', hint: '形如 [1,2] [,5]' },
  { key: 'answerLimit', label: '答案数量限制', control: 'text', group: '校验', hint: '形如 [1,2] [,3]' },
  { key: 'numericScale', label: '数值精度', control: 'number', group: '校验' },

  // 考试
  { key: 'examScore', label: '分值', control: 'number', group: '考试' },
  {
    key: 'examAnswerMode',
    label: '判分模式',
    control: 'select',
    group: '考试',
    options: EXAM_MODE_OPTIONS,
  },
  { key: 'examCorrectAnswer', label: '正确答案', control: 'text', group: '考试' },
  { key: 'examAnalysis', label: '答案解析', control: 'textarea', group: '考试' },

  // 规则：P2 先存原始 JSON，可视条件编辑器后续再做
  { key: 'visibleRule', label: '显隐规则', control: 'textarea', group: '规则', hint: RULE_HINT },
  { key: 'requiredRule', label: '必填规则', control: 'textarea', group: '规则', hint: RULE_HINT },
  { key: 'jumpRule', label: '跳转规则', control: 'textarea', group: '规则', hint: RULE_HINT },
  { key: 'calculate', label: '计算规则', control: 'textarea', group: '规则', hint: RULE_HINT },
];
