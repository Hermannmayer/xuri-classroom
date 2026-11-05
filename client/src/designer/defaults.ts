import { DATA_TYPES, type QuestionType, type SurveySchema } from '../schema/types';

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
  { type: 'Judge', label: '判断', group: 'choice', title: '判断题' },
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

  if (OPTION_TYPES.includes(type) || type === 'Judge') {
    base.attribute = { required: false };
    // 选项必须同时出现在 dataSource（渲染用）和 children（Option 节点，答案 key 与后端计分/统计都按它来）
    const labels = type === 'Judge' ? ['正确', '错误'] : ['选项一', '选项二'];
    const optionIds = [newId(), newId()];
    base.dataSource = optionIds.map((id, i) => ({ label: labels[i], value: id }));
    base.children = optionIds.map((id, i) => ({
      id,
      title: labels[i],
      type: 'Option',
      attribute: {},
    }));
  } else if (type === 'FillBlank' || type === 'Textarea') {
    base.attribute = { required: false, placeholder: '请输入', ...(type === 'Textarea' ? { rows: 3 } : {}) };
    // 后端填空答案格式是 {题目id: {空位id: 文本}}，空位节点必须有 id（见 AnswerServiceImpl 造 schema）
    base.children = [{ id: newId(), title: '', type: 'Option', attribute: {} }];
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

/**
 * 保证每道数据题都有 children。
 * 后端 AnswerServiceImpl.updateLinkSurveyAnswer 直接取 getChildren().get(0)，
 * 缺 children 的题会让整次提交 500；选项类还要与 dataSource 的 value 对齐（答案 key 就是它）。
 */
export function normalizeSchema(schema: SurveySchema): SurveySchema {
  const children = schema.children?.map(normalizeSchema);
  if (!DATA_TYPES.has(schema.type)) return { ...schema, children };
  if (children && children.length) return { ...schema, children };

  if (schema.type === 'Radio' || schema.type === 'Checkbox' || schema.type === 'Select') {
    const options = schema.dataSource ?? [];
    return {
      ...schema,
      children: options.map((o) => ({ id: o.value, title: o.label, type: 'Option' as QuestionType, attribute: {} })),
    };
  }
  return { ...schema, children: [{ id: newId(), title: '', type: 'Option' as QuestionType, attribute: {} }] };
}
