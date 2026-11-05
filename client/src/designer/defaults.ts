import type { QuestionType, SurveySchema } from '../schema/types';

export interface QuestionMeta {
  type: QuestionType;
  label: string;
  group: 'input' | 'choice' | 'structure';
  title: string;
}

/** 设计器左侧可加的题型。P2 先把 6 个已注册题型 + 结构节点做全，其余等组件到位再放出来。 */
export const QUESTION_META: QuestionMeta[] = [
  { type: 'Radio', label: '单选', group: 'choice', title: '单选题' },
  { type: 'Checkbox', label: '多选', group: 'choice', title: '多选题' },
  { type: 'Select', label: '下拉', group: 'choice', title: '下拉选择题' },
  { type: 'FillBlank', label: '填空', group: 'input', title: '填空题' },
  { type: 'Textarea', label: '多行文本', group: 'input', title: '多行文本题' },
  { type: 'Score', label: '评分', group: 'input', title: '评分题' },
  { type: 'QuestionSet', label: '题组', group: 'structure', title: '题组' },
  { type: 'Remark', label: '说明', group: 'structure', title: '说明文字' },
  { type: 'SplitLine', label: '分割线', group: 'structure', title: '' },
];

export const GROUP_LABEL: Record<QuestionMeta['group'], string> = {
  input: '填写',
  choice: '选择',
  structure: '结构',
};

let seq = 0;
export const newId = () => {
  seq += 1;
  return `${Date.now().toString(36)}${seq.toString(36)}`;
};

const OPTION_TYPES: QuestionType[] = ['Radio', 'Checkbox', 'Select'];

export function createQuestion(type: QuestionType, title?: string): SurveySchema {
  const meta = QUESTION_META.find((m) => m.type === type);
  const base: SurveySchema = {
    id: newId(),
    title: title ?? meta?.title ?? type,
    type,
    attribute: {},
  };

  if (OPTION_TYPES.includes(type)) {
    base.attribute = { required: false };
    base.dataSource = [
      { label: '选项一', value: 'o1' },
      { label: '选项二', value: 'o2' },
    ];
  } else if (type === 'FillBlank') {
    base.attribute = { required: false, placeholder: '请输入' };
  } else if (type === 'Textarea') {
    base.attribute = { rows: 3, placeholder: '请输入' };
  } else if (type === 'Score') {
    base.attribute = { scope: '[0,5]' };
  } else if (type === 'QuestionSet') {
    base.children = [];
  } else if (type === 'Remark') {
    base.attribute = { content: '这里是一段说明文字' };
  }

  return base;
}

export function createSurvey(title: string): SurveySchema {
  return { id: newId(), title, type: 'Survey', attribute: {}, children: [] };
}

/** 给选项追加一行；value 用递增编号，保证与已有选项不冲突 */
export function nextOptionValue(schema: SurveySchema): string {
  const existing = new Set((schema.dataSource ?? []).map((o) => o.value));
  let i = (schema.dataSource?.length ?? 0) + 1;
  while (existing.has(`o${i}`)) i += 1;
  return `o${i}`;
}
