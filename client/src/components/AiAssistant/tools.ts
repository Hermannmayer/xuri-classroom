import type { AiPageContextInfo } from './usePageContext';








export interface AiToolShortcut {
  key: string;
  label: string;

  link: (context: AiPageContextInfo) => string | undefined;

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
