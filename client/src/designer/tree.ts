import { DATA_TYPES } from '../schema/types';
import type { SurveySchema } from '../schema/types';

/** 不可变树操作：所有函数返回新树，不修改入参 */

export function findNode(root: SurveySchema, id: string): SurveySchema | undefined {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return undefined;
}

export function findParent(root: SurveySchema, id: string): SurveySchema | undefined {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const hit = findParent(child, id);
    if (hit) return hit;
  }
  return undefined;
}

export function updateNode(
  root: SurveySchema,
  id: string,
  patch: Partial<SurveySchema> | ((node: SurveySchema) => Partial<SurveySchema>),
): SurveySchema {
  if (root.id === id) {
    const delta = typeof patch === 'function' ? patch(root) : patch;
    return { ...root, ...delta };
  }
  if (!root.children?.length) return root;
  return {
    ...root,
    children: root.children.map((c) => updateNode(c, id, patch)),
  };
}

export function insertNode(root: SurveySchema, parentId: string | undefined, node: SurveySchema, index?: number): SurveySchema {
  if (!parentId) {
    const children = [...(root.children ?? [])];
    children.splice(index ?? children.length, 0, node);
    return { ...root, children };
  }
  if (root.id === parentId) {
    const children = [...(root.children ?? [])];
    children.splice(index ?? children.length, 0, node);
    return { ...root, children };
  }
  if (!root.children?.length) return root;
  return { ...root, children: root.children.map((c) => insertNode(c, parentId, node, index)) };
}

export function removeNode(root: SurveySchema, id: string): SurveySchema {
  if (!root.children?.length) return root;
  return {
    ...root,
    children: root.children.filter((c) => c.id !== id).map((c) => removeNode(c, id)),
  };
}

/** 在同父级里上下移动；返回原树表示移到边界外 */
export function moveNode(root: SurveySchema, id: string, direction: -1 | 1): SurveySchema {
  const parent = findParent(root, id);
  if (!parent?.children) return root;
  const list = parent.children;
  const index = list.findIndex((c) => c.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return root;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return updateNode(root, parent.id, { children: next });
}

/** 复制节点（含子树），重新生成所有 id */
export function cloneNode(node: SurveySchema, newId: () => string): SurveySchema {
  return {
    ...node,
    id: newId(),
    children: node.children?.map((c) => cloneNode(c, newId)),
  };
}

export interface OutlineItem {
  id: string;
  parentId?: string;
  depth: number;
  node: SurveySchema;
}

/**
 * 大纲里应该出现哪些节点。
 *
 * - 数据题（DATA_TYPES）：是题目，进大纲
 * - 题组（QuestionSet）：是容器，本身也要进大纲并展开子题，否则题组里的题在设计器里根本看不到
 * - 其余（Option 选项、填空空位、Pagination 等结构节点）：不是题目，跳过
 */
function isOutlineNode(node: SurveySchema): boolean {
  if (!node?.type) return false;
  if (node.type === 'Option') return false;
  return DATA_TYPES.has(node.type) || node.type === 'QuestionSet';
}

/** 大纲是扁平列表（带 parentId/depth），拖拽排序按同级数组重排；折叠的节点不下钻子项 */
export function flattenOutline(
  root: SurveySchema,
  collapsed?: Set<string>,
  parentId?: string,
  depth = 0,
): OutlineItem[] {
  const out: OutlineItem[] = [];
  for (const child of root.children ?? []) {
    if (!isOutlineNode(child)) continue;
    out.push({ id: child.id, parentId, depth, node: child });
    if (collapsed?.has(child.id)) continue;
    out.push(...flattenOutline(child, collapsed, child.id, depth + 1));
  }
  return out;
}

export function reorderChildren(
  root: SurveySchema,
  parentId: string | undefined,
  from: number,
  to: number,
): SurveySchema {
  if (from === to || from < 0 || to < 0) return root;
  const apply = (children: SurveySchema[]) => {
    const next = [...children];
    const [moved] = next.splice(from, 1);
    if (!moved) return children;
    next.splice(to, 0, moved);
    return next;
  };
  if (!parentId) return { ...root, children: apply(root.children ?? []) };
  return updateNode(root, parentId, (node) => ({ children: apply(node.children ?? []) }));
}

/** 把 fromId 移到 toId 前面（要求同父级；跨父级不处理，避免把节点拖进自己子树） */
export function moveBefore(root: SurveySchema, fromId: string, toId: string): SurveySchema {
  const fromParent = findParent(root, fromId);
  const toParent = findParent(root, toId);
  if (!fromParent || !toParent || fromParent.id !== toParent.id) return root;
  const list = [...(fromParent.children ?? [])];
  const fromIndex = list.findIndex((c) => c.id === fromId);
  const toIndex = list.findIndex((c) => c.id === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return root;
  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  return updateNode(root, fromParent.id, { children: list });
}
