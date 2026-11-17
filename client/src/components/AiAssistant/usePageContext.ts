import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getProject } from '../../api';
import type { AiChatContext } from '../../api/ai';

/**
 * 侧栏 AI 助手的「当前页面上下文」。
 *
 * 为什么要从路由推断而不是每页各传一份：侧栏挂在 BasicLayout 上，它只能拿到 URL；
 * 而要每页都记得「挂载时告诉侧栏我在看什么」，迟早会有页面漏掉，AI 就会突然看不见上下文。
 * 所以这里以路由表为唯一口径，页面**可选**地通过 {@link pushAiAssistantContext} 补充
 * 路由里表达不了的信息（比如编辑器里当前选中的是哪道题、答卷列表里正在看哪份答卷）。
 *
 * 发给后端的只有 id 与页面名：试卷名、题干、答卷得分都由后端按 id 查库补齐并过权限，
 * 前端不提供任何会进系统提示的文案（见 `AiChatRequest.Context` 的注释）。
 */

/** 页面可以主动推送的额外上下文 */
export interface AiPushedContext {
  projectId?: string;
  questionId?: string;
  answerId?: string;
  /** 当前选中的班级（教学页/报表页按班筛选时推过来） */
  classId?: string;
  /** 当前题库（题库题目页） */
  repoId?: string;
  /** 给用户看的补充说明，例如「第 3 题《跌倒的预防》」；不进提示词，只显示在上下文行 */
  label?: string;
}

/** 推送事件名 */
export const AI_ASSISTANT_CONTEXT_EVENT = 'ai-assistant:context';

/**
 * 页面把上下文交给侧栏（可选能力）。
 *
 * 用法（在知道「当前在看哪份答卷/哪道题」的页面里）：
 * ```ts
 * useEffect(() => { pushAiAssistantContext({ answerId, label: 学员姓名 }); }, [answerId]);
 * ```
 * 切换路由后自动作废，不需要页面自己清理。
 */
export function pushAiAssistantContext(detail: AiPushedContext | undefined) {
  window.dispatchEvent(new CustomEvent<AiPushedContext | undefined>(AI_ASSISTANT_CONTEXT_EVENT, { detail }));
}

export interface AiPageContextInfo {
  /** 发给后端的上下文（只放定位，不放文案） */
  payload: AiChatContext;
  /** 当前班级 id（有的话） */
  classId?: string;
  /** 当前题库 id（有的话） */
  repoId?: string;
  /** 给用户看的摘要，如「试卷编辑器 · 试卷《2026 春季考试》」 */
  label?: string;
  /** 路由对应的页面名 */
  page?: string;
  /** 当前试卷/项目 id（有的话） */
  projectId?: string;
  /** 试卷名（快捷指令模板里会用到；拿不到时为 undefined） */
  projectName?: string;
}

/** 路由 → 页面名 + 从哪个捕获组取项目 id / 题库 id */
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
  // 班级管理与教学合并后，同一个路由用 ?tab= 区分；页面名跟着 tab 走（下面按 search 再修一次）
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

/**
 * 项目名的进程内缓存：侧栏会跟着路由反复重新计算上下文，同一个项目不该每次都打一次接口。
 * 缓存的是 Promise（并发时只发一次请求）；失败也缓存，避免一个 403 的项目被反复重试。
 */
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
  // 班级：报表页与教学页都放在 ?classId= 里；页面也可以主动推（班级资源面板里选中的班）
  const classId = clean(search.get('classId')) ?? clean(pushed?.classId);
  const repoId = matched.repoId ?? clean(search.get('repoId')) ?? clean(pushed?.repoId);

  // 换页面就把上一页推的上下文丢掉：否则从「答卷详情」跳到「首页」还会带着那份答卷
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
