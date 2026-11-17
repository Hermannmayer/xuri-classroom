import type { AiPageContextInfo } from './usePageContext';

/**
 * 对话框底部的工具快捷入口：点一下直接打开对应面板（不经过聊天）。
 *
 * <p>为什么保留这些按钮而不是全靠「说一句话」：说话要花一次意图识别 + 一次模型调用，
 * 而「我想抽题」这类高频动作，点一下最快、也不花钱。两条路通向同一个面板，
 * 差别只是参数从哪来（按钮取当前上下文，说话还能带一句自然语言要求）。
 */
export interface AiToolShortcut {
  key: string;
  label: string;
  /** 定位到工具页的地址；拿不到必需上下文时返回 undefined（按钮置灰） */
  link: (context: AiPageContextInfo) => string | undefined;
  /** 按钮置灰时的说明 */
  hint: string;
}

export const AI_TOOL_SHORTCUTS: AiToolShortcut[] = [
  {
    key: 'paper_pick',
    label: '抽题组卷',
    link: (context) => (context.projectId ? '/survey/' + context.projectId + '/edit?ai=pick' : undefined),
    hint: '先打开一份试卷',
  },
  {
    key: 'paper_check',
    label: '试卷质检',
    link: (context) => (context.projectId ? '/survey/' + context.projectId + '/edit?ai=check' : undefined),
    hint: '先打开一份试卷',
  },
  {
    key: 'grade_batch',
    label: '批改未批改',
    link: (context) => (context.projectId ? '/survey/' + context.projectId + '/data?ai=grade' : undefined),
    hint: '先打开一份试卷',
  },
  {
    key: 'repo_audit',
    label: '题库体检',
    link: (context) => (context.repoId ? '/repo/' + context.repoId + '/questions/normal?ai=audit' : undefined),
    hint: '先打开一个题库',
  },
  {
    key: 'practice',
    label: '错题重练',
    link: (context) => (context.projectId ? '/survey/' + context.projectId + '/report?ai=recommend' : undefined),
    hint: '先打开一份试卷的报表',
  },
];
