/**
 * 答题相关的本地存储（草稿 / 匿名 answerId / 题目标记）。
 *
 * 单独抽出来的原因（对应前端 A 审计 A-DATA-1 / A-DATA-2）：
 * 1. **公用电脑隐私**：这些键里是答题者真实填写的内容（姓名、手机、住址答案），
 *    登出时必须能一键清干净，避免下一位用户打开同一份问卷看到上一位的答案。
 *    登出集成只需在登出逻辑里调用 `clearAnswerStorage()`（不改本文件以外的东西）。
 * 2. **归属与有效期**：草稿必须带上 projectId 并校验，避免「换项目/换卷」后脏数据被续答；
 *    超过 7 天自动作废，减少长期堆在公用机上的隐私数据。
 * 3. **健壮性**：隐私模式 / 配额满时 localStorage 会抛异常，这里统一吞掉，
 *    最坏情况是草稿失效，不影响答题与交卷。
 *
 * 注意：只清理「答题数据」，不动 UI 偏好（sk-font-scale / sk-zoom 等）。
 */

/** 答题数据用到的键前缀：登出时按前缀整体清理 */
export const ANSWER_STORAGE_PREFIXES = ['sk-answer-', 'sk-draft-', 'sk-marks-'] as const;

/** 草稿有效期：7 天（过期视为不存在，读取时顺手删掉） */
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const answerKey = (projectId: string) => `sk-answer-${projectId}`;
export const draftKey = (projectId: string) => `sk-draft-${projectId}`;
export const marksKey = (projectId: string) => `sk-marks-${projectId}`;

function safeStorage(): Storage | undefined {
  try {
    // Safari 隐私模式 / 被策略禁用时，访问 localStorage 本身就可能抛异常
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
    // 配额满 / 隐私模式：写不进去就算了，不影响答题
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

/**
 * 清空所有答题本地数据（登出 / 切换账号时调用）。
 * 返回被清掉的键数量，便于调用方打点或日志。
 */
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

/* ---------------------------------------------------------------- 草稿 */

export interface DraftPayload {
  projectId: string;
  values: Record<string, unknown>;
  at: number;
}

/**
 * 读取未提交草稿：校验归属（projectId 必须与键一致）与有效期（7 天）。
 * 任一不满足就删掉并返回 undefined —— 宁可让用户重填，也不能把别人的草稿拿出来续答。
 */
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
