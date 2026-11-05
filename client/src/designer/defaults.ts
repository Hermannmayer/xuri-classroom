import { DATA_TYPES, type QuestionType, type SurveySchema } from '../schema/types';

export interface QuestionMeta {
  type: QuestionType;
  label: string;
  group: 'input' | 'choice' | 'structure';
  title: string;
}

/** 设计器左侧可加的题型。新增题型 = 这里一项 + registerAll 一行 + 组件。 */
export const QUESTION_META: QuestionMeta[] = [
  { type: 'Radio', label: '单选', group: 'choice', title: '单选题' },
  { type: 'Checkbox', label: '多选', group: 'choice', title: '多选题' },
  { type: 'Select', label: '下拉', group: 'choice', title: '下拉选择题' },
  { type: 'Nps', label: 'NPS', group: 'choice', title: 'NPS 净推荐值' },
  { type: 'MatrixRadio', label: '矩阵单选', group: 'choice', title: '矩阵单选题' },
  { type: 'MatrixCheckbox', label: '矩阵多选', group: 'choice', title: '矩阵多选题' },
  { type: 'Cascader', label: '级联', group: 'choice', title: '级联选择题' },
  { type: 'Judge', label: '判断', group: 'choice', title: '判断题' },
  { type: 'FillBlank', label: '填空', group: 'input', title: '填空题' },
  { type: 'MultipleBlank', label: '多空填空', group: 'input', title: '多空填空题' },
  { type: 'Textarea', label: '多行文本', group: 'input', title: '多行文本题' },
  { type: 'MatrixFillBlank', label: '矩阵填空', group: 'input', title: '矩阵填空题' },
  { type: 'Address', label: '地址', group: 'input', title: '地址题' },
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
const MATRIX_TYPES: QuestionType[] = ['MatrixRadio', 'MatrixCheckbox', 'MatrixFillBlank'];

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
  } else if (type === 'MultipleBlank') {
    base.attribute = { required: false, placeholder: '请输入' };
    base.children = [0, 1].map(() => ({ id: newId(), title: '', type: 'Option' as QuestionType, attribute: {} }));
  } else if (type === 'Nps') {
    base.attribute = { required: false, npsStartNum: 0, npsTotalNum: 11 };
    // children 只用来满足后端 getChildren().get(0)，答案 key 是分值本身
    base.children = [{ id: newId(), title: '', type: 'Option', attribute: {} }];
  } else if (MATRIX_TYPES.includes(type)) {
    base.attribute = { required: false };
    // 行在 row，列在 dataSource（children 同步一份列节点，保证后端 children 非空）
    base.row = ['矩阵行1', '矩阵行2'].map((rowTitle) => ({ id: newId(), title: rowTitle }));
    const columnIds = ['选项一', '选项二'].map((label) => ({ id: newId(), label }));
    base.dataSource = columnIds.map(({ id, label }) => ({ label, value: id }));
    base.children = columnIds.map(({ id, label }) => ({ id, title: label, type: 'Option' as QuestionType, attribute: {} }));
  } else if (type === 'Cascader') {
    base.attribute = { required: false, placeholder: '请选择' };
    const lv1 = newId();
    const lv2 = newId();
    const lv3 = newId();
    base.dataSource = [
      {
        label: '一级选项',
        value: lv1,
        children: [{ label: '二级选项', value: lv2, children: [{ label: '三级选项', value: lv3 }] }],
      },
    ];
    base.children = [{ id: newId(), title: '', type: 'Option', attribute: {} }];
  } else if (type === 'Address') {
    base.attribute = { required: false, placeholder: '请输入地址' };
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

  if (schema.type === 'Radio' || schema.type === 'Checkbox' || schema.type === 'Select' || MATRIX_TYPES.includes(schema.type)) {
    const options = schema.dataSource ?? [];
    if (options.length) {
      return {
        ...schema,
        children: options.map((o) => ({ id: o.value, title: o.label, type: 'Option' as QuestionType, attribute: {} })),
      };
    }
  }
  return { ...schema, children: [{ id: newId(), title: '', type: 'Option' as QuestionType, attribute: {} }] };
}
