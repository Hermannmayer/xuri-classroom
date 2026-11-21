import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getProject } from '../../api';
import type { AiChatContext } from '../../api/ai';














export interface AiPushedContext {
  projectId?: string;
  questionId?: string;
  answerId?: string;

  classId?: string;

  repoId?: string;

  label?: string;
}


export const AI_ASSISTANT_CONTEXT_EVENT = 'ai-assistant:context';

/** 页面把上下文交给侧栏（可选能力） */
export function pushAiAssistantContext(detail: AiPushedContext | undefined) {
  window.dispatchEvent(new CustomEvent<AiPushedContext | undefined>(AI_ASSISTANT_CONTEXT_EVENT, { detail }));
}

export interface AiPageContextInfo {

  payload: AiChatContext;

  classId?: string;

  repoId?: string;

  label?: string;

  page?: string;

  projectId?: string;

  projectName?: string;
}


const ROUTE_TABLE: Array<{ re: RegExp; page: string; projectGroup?: number; repoGroup?: number }> = [
  { re: /^\/survey\/([^/]+)\/edit\/?$/, page: '试卷编辑器', projectGroup: 1 },
  { re: /^\/survey\/([^/]+)\/data\/?$/, page: '答卷数据', projectGroup: 1 },
  { re: /^\/survey\/([^/]+)\/report\/?$/, page: '学情报表', projectGroup: 1 },
  { re: /^\/survey\/([^/]+)\/print\/?$/, page: '试卷打印', projectGroup: 1 },
  { re: /^\/survey\/([^/]+)\/setting\/?$/, page: '发布设置', projectGroup: 1 },
  { re: /^\/survey\/([^/]+)\/?$/, page: '试卷概览', projectGroup: 1 },
  { re: /^\/repo\/([^/]+)\/questions\/[^/]+\/?$/, page: '题库题目', repoGroup: 1 },
  { re: /^\/repo\/book\/?$/, page: '练习册' },
  { re: /^\/repo\/?$/, page: '题库中心' },
  { re: /^\/tasks\/?$/, page: '我的任务' },

  { re: /^\/teaching\/?$/, page: '教学' },
  { re: /^\/exercise\/?.*$/, page: '我的练习' },
  { re: /^\/home\/?$/, page: '首页' },
  { re: /^\/notice\/?$/, page: '公告中心' },
  { re: /^\/system\/access\/?$/, page: '用户与权限' },
  { re: /^\/system\/setting\/?$/, page: '系统设置' },
  { re: /^\/system\/notice\/?$/, page: '公告管理' },
  { re: /^\/system\/audit\/?$/, page: '操作日志' },
  { re: /^\/account\/settings\/?$/, page: '账号设置' },
];





const projectNameCache = new Map<string, Promise<string | undefined>>();

function loadProjectName(projectId: string): Promise<string | undefined> {
  const cached = projectNameCache.get(projectId);
  if (cached) {
    return cached;
  }
  const task = getProject(projectId)
    .then((project) => project?.name || undefined)
    .catch(() => undefined);
  projectNameCache.set(projectId, task);
  return task;
}

function matchRoute(pathname: string): { page?: string; projectId?: string; repoId?: string } {
  for (const item of ROUTE_TABLE) {
    const matched = item.re.exec(pathname);
    if (!matched) {
      continue;
    }
    const projectId = item.projectGroup ? matched[item.projectGroup] : undefined;
    const repoId = item.repoGroup ? matched[item.repoGroup] : undefined;
    return { page: item.page, projectId, repoId };
  }
  return {};
}

function clean(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

/** 当前页面上下文（随路由与 URL 查询参数变化） */
export function usePageContext(): AiPageContextInfo {
  const location = useLocation();
  const [projectName, setProjectName] = useState<string | undefined>();
  const [pushed, setPushed] = useState<AiPushedContext | undefined>();

  const matched = useMemo(() => matchRoute(location.pathname), [location.pathname]);
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const projectId = matched.projectId ?? clean(search.get('projectId')) ?? clean(pushed?.projectId);
  const questionId = clean(search.get('questionId')) ?? clean(pushed?.questionId);
  const answerId = clean(search.get('answerId')) ?? clean(pushed?.answerId);

  const classId = clean(search.get('classId')) ?? clean(pushed?.classId);
  const repoId = matched.repoId ?? clean(search.get('repoId')) ?? clean(pushed?.repoId);


  useEffect(() => {
    setPushed(undefined);
  }, [location.pathname]);

  useEffect(() => {
    const onPush = (event: Event) => {
      setPushed((event as CustomEvent<AiPushedContext | undefined>).detail);
    };
    window.addEventListener(AI_ASSISTANT_CONTEXT_EVENT, onPush);
    return () => window.removeEventListener(AI_ASSISTANT_CONTEXT_EVENT, onPush);
  }, []);

  useEffect(() => {
    if (!projectId) {
      setProjectName(undefined);
      return;
    }
    let alive = true;
    void loadProjectName(projectId).then((name) => {
      if (alive) {
        setProjectName(name);
      }
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  return useMemo(() => {
    const payload: AiChatContext = { route: location.pathname };
    if (matched.page) {
      payload.page = matched.page;
    }
    if (projectId) {
      payload.projectId = projectId;
    }
    if (questionId) {
      payload.questionId = questionId;
    }
    if (answerId) {
      payload.answerId = answerId;
    }
    if (classId) {
      payload.classId = classId;
    }
    if (repoId) {
      payload.repoId = repoId;
    }
    const parts: string[] = [];
    if (matched.page) {
      parts.push(matched.page);
    }
    if (projectName) {
      parts.push(`试卷《${projectName}》`);
    }
    if (pushed?.label) {
      parts.push(pushed.label);
    }
    return {
      payload,
      label: parts.length ? parts.join(' · ') : undefined,
      page: matched.page,
      projectId,
      projectName,
      classId,
      repoId,
    };
  }, [answerId, classId, location.pathname, matched.page, projectId, projectName, pushed, questionId, repoId]);
}
