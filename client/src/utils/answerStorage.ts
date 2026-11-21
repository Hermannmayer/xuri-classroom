/** 答题相关的本地存储（草稿 / 匿名 answerId / 题目标记） */

/** 答题数据用到的键前缀：登出时按前缀整体清理 */
export const ANSWER_STORAGE_PREFIXES = ['sk-answer-', 'sk-draft-', 'sk-marks-'] as const;


export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const answerKey = (projectId: string) => `sk-answer-${projectId}`;
export const draftKey = (projectId: string) => `sk-draft-${projectId}`;
export const marksKey = (projectId: string) => `sk-marks-${projectId}`;

function safeStorage(): Storage | undefined {
  try {

    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function safeGet(key: string): string | null {
  try {
    return safeStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    safeStorage()?.setItem(key, value);
    return true;
  } catch {

    return false;
  }
}

export function safeRemove(key: string): void {
  try {
    safeStorage()?.removeItem(key);
  } catch {
    // 忽略
  }
}

/** 清空所有答题本地数据（登出 / 切换账号时调用） */
export function clearAnswerStorage(): number {
  const storage = safeStorage();
  if (!storage) return 0;
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && ANSWER_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
    }
  } catch {
    return 0;
  }
  keys.forEach((key) => safeRemove(key));
  return keys.length;
}


export const LOGOUT_EVENT = 'sk:logout';

/** 注册「登出即清空答题数据」的监听（幂等） */
export function installAnswerStorageCleanup(): () => void {
  const handler = () => {
    clearAnswerStorage();
  };
  window.addEventListener(LOGOUT_EVENT, handler);
  return () => window.removeEventListener(LOGOUT_EVENT, handler);
}

/* ---------------------------------------------------------------- answerId */

/** 读取本机保存的匿名答卷 id：空串/非字符串一律当没有 */
export function readAnswerId(projectId: string): string | undefined {
  const raw = safeGet(answerKey(projectId));
  const value = typeof raw === 'string' ? raw.trim() : '';
  return value || undefined;
}

export function writeAnswerId(projectId: string, answerId: string): void {
  if (!answerId) return;
  safeSet(answerKey(projectId), answerId);
}

export function removeAnswerId(projectId: string): void {
  safeRemove(answerKey(projectId));
}



export interface DraftPayload {
  projectId: string;
  values: Record<string, unknown>;
  at: number;
}

/** 读取未提交草稿：校验归属（projectId 必须与键一致）与有效期（7 天） */
export function readDraft(projectId: string): DraftPayload | undefined {
  const raw = safeGet(draftKey(projectId));
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<DraftPayload>;
    const ownerOk = parsed?.projectId === projectId;
    const fresh = typeof parsed?.at === 'number' && Date.now() - parsed.at < DRAFT_TTL_MS;
    const values = parsed?.values;
    if (!ownerOk || !fresh || !values || typeof values !== 'object') {
      safeRemove(draftKey(projectId));
      return undefined;
    }
    return { projectId, values: values as Record<string, unknown>, at: parsed.at as number };
  } catch {
    safeRemove(draftKey(projectId));
    return undefined;
  }
}

export function writeDraft(projectId: string, values: Record<string, unknown>): void {
  const payload: DraftPayload = { projectId, values, at: Date.now() };
  safeSet(draftKey(projectId), JSON.stringify(payload));
}

export function removeDraft(projectId: string): void {
  safeRemove(draftKey(projectId));
}

/* ---------------------------------------------------------------- 标记 */

/** 题目标记：只存布尔；非法内容整份丢弃 */
export function readMarks(projectId: string): Record<string, boolean> {
  const raw = safeGet(marksKey(projectId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      safeRemove(marksKey(projectId));
      return {};
    }
    const out: Record<string, boolean> = {};
    for (const [qId, marked] of Object.entries(parsed)) {
      if (marked === true) out[qId] = true;
    }
    return out;
  } catch {
    safeRemove(marksKey(projectId));
    return {};
  }
}

export function writeMarks(projectId: string, marks: Record<string, boolean>): void {
  if (Object.keys(marks).length === 0) safeRemove(marksKey(projectId));
  else safeSet(marksKey(projectId), JSON.stringify(marks));
}
