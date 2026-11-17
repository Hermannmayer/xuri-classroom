import type { AiPageContextInfo } from './usePageContext';

/**
 * 侧栏的快捷指令：点了只把提示词填进输入框，不会直接发出去。
 *
 * 为什么不做成「一点就发送」：这些指令的第一句往往是老师要改的（学科、题量、想讲的侧重点），
 * 直接发送等于把模板当最终问题，模型只能回一段泛泛的内容。
 *
 * 模板会尽量带上当前页面已知的信息（试卷名 / 是否选中了题目），并在**拿不到**这些信息时
 * 退化成「先问我」的形态——而不是编一个试卷名。
 */
export interface AiQuickAction {
  key: string;
  label: string;
  /** 点一下填进输入框的提示词（用户还可以接着改） */
  prompt: (context: AiPageContextInfo) => string;
}

export const AI_QUICK_ACTIONS: AiQuickAction[] = [
  {
    key: 'paper',
    label: '生成一份试卷',
    prompt: (context) =>
      context.projectName
        ? `参照「${context.projectName}」这份试卷的定位，帮我拟一份新试卷的方案：20 题、100 分，单选 40% / 多选 20% / 判断 20% / 填空 20%。先给考点分布，再给 3 道样题（含答案与解析）。`
        : '帮我拟一份新试卷的方案：先问我学科、级别和题量，再给考点分布与 3 道样题（含答案与解析）。',
  },
  {
    key: 'rewrite',
    label: '改写当前题目',
    prompt: (context) =>
      context.payload.questionId
        ? '请把当前这道题的题干改写得更清楚：保持考点不变、不改选项与答案，给出 3 条改写建议并说明理由。'
        : '请帮我改写一道题的题干，保持考点不变、不改选项与答案。原来的题干是：\n\n',
  },
  {
    key: 'explain',
    label: '讲解这个知识点',
    prompt: (context) =>
      context.projectName
        ? `请讲讲「${context.projectName}」这份试卷里最容易被考到的知识点：先给定义，再说易错点，最后给一个例题。`
        : '请讲解这个知识点：先给定义，再说易错点，最后给一个例题。知识点是：\n\n',
  },
  {
    key: 'grade',
    label: '分析这次成绩',
    prompt: (context) =>
      context.projectName
        ? `我要分析「${context.projectName}」这次考试的成绩。先给我一套分析框架：该看哪些指标、分别说明什么、异常值怎么定位，我随后把具体数字贴给你。`
        : '我要分析一次考试的成绩。先给我一套分析框架：该看哪些指标、分别说明什么、异常值怎么定位，我随后把具体数字贴给你。',
  },
];
