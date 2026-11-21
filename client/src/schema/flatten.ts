import { DATA_TYPES, type QuestionType, type SurveySchema } from './types';

export interface FlatQuestion {

  id: string;
  title: string;
  type: QuestionType;
  schema: SurveySchema;

  parentId?: string;

  index: number;

  number?: number;
}

/**
 * 把整棵树拍平成有序题目列表。
 * 结构节点（Survey/QuestionSet/Pagination/Remark/SplitLine）不产生题目，但会继续下钻。
 */
export function flattenSchema(root: SurveySchema): FlatQuestion[] {
  const out: FlatQuestion[] = [];
  let number = 0;

  const walk = (node: SurveySchema, parentId?: string) => {
    for (const child of node.children ?? []) {
      if (DATA_TYPES.has(child.type)) {
        out.push({
          id: child.id,
          title: child.title,
          type: child.type,
          schema: child,
          parentId,
          index: out.length,
          number: ++number,
        });
      }
      if (child.children?.length) {
        walk(child, DATA_TYPES.has(child.type) ? parentId : child.id);
      }
    }
  };

  walk(root);
  return out;
}

/** 按 id 建索引，规则求值时高频用到 */
export function indexQuestions(list: FlatQuestion[]): Map<string, FlatQuestion> {
  return new Map(list.map((q) => [q.id, q]));
}

/** 找出某个题目在树中的路径（设计器大纲定位用） */
export function findPath(root: SurveySchema, id: string, trail: string[] = []): string[] | undefined {
  if (root.id === id) return trail;
  for (const child of root.children ?? []) {
    const found = findPath(child, id, [...trail, child.id]);
    if (found) return found;
  }
  return undefined;
}
