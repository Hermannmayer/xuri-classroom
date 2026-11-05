/**
 * 树操作自检（零框架）。运行：npm run test:tree
 * 覆盖：插入/删除/同级重排/大纲扁平化/跨父级不影响其他分支。
 */
import { createQuestion, createSurvey } from '../src/designer/defaults';
import { flattenOutline, insertNode, removeNode, reorderChildren, updateNode } from '../src/designer/tree';

let failed = 0;
const ok = (name: string, pass: boolean, actual?: unknown, expected?: unknown) => {
  if (pass) console.log(`✓ ${name}`);
  else {
    failed++;
    console.error(`✗ ${name}\n  实际: ${JSON.stringify(actual)}\n  期望: ${JSON.stringify(expected)}`);
  }
};
const eq = (name: string, actual: unknown, expected: unknown) =>
  ok(name, JSON.stringify(actual) === JSON.stringify(expected), actual, expected);

const root = createSurvey('测试');
const radio = createQuestion('Radio');
const fill = createQuestion('FillBlank');
const score = createQuestion('Score');

let tree = insertNode(root, undefined, radio);
tree = insertNode(tree, undefined, fill);
tree = insertNode(tree, undefined, score);

eq('顺序插入', flattenOutline(tree).map((i) => i.id), [radio.id, fill.id, score.id]);

// 根级重排：score 提到最前
tree = reorderChildren(tree, undefined, 2, 0);
eq('同级重排', flattenOutline(tree).map((i) => i.id), [score.id, radio.id, fill.id]);

// 题组嵌套
const group = createQuestion('QuestionSet');
const inner = createQuestion('Textarea');
tree = insertNode(tree, undefined, group);
tree = insertNode(tree, group.id, inner);

const outline = flattenOutline(tree);
eq('大纲扁平化顺序', outline.map((i) => i.node.type), ['Score', 'Radio', 'FillBlank', 'QuestionSet', 'Textarea']);
eq('大纲深度', outline.map((i) => i.depth), [0, 0, 0, 0, 1]);
eq('子节点 parentId', outline[4].parentId, group.id);

// 题组内重排不应影响根级
const groupWithTwo = insertNode(tree, group.id, createQuestion('FillBlank'));
const innerIds = flattenOutline(groupWithTwo).filter((i) => i.parentId === group.id).map((i) => i.id);
const moved = reorderChildren(groupWithTwo, group.id, 0, 1);
eq('组内重排', flattenOutline(moved).filter((i) => i.parentId === group.id).map((i) => i.id), [innerIds[1], innerIds[0]]);
eq('组内重排不影响根级', flattenOutline(moved).filter((i) => !i.parentId).map((i) => i.id),
  [score.id, radio.id, fill.id, group.id]);

// 删除容器连带子节点
const removed = removeNode(tree, group.id);
eq('删除题组连带子节点', flattenOutline(removed).map((i) => i.id), [score.id, radio.id, fill.id]);

// 改属性
const patched = updateNode(tree, radio.id, (n) => ({ attribute: { ...n.attribute, required: true } }));
eq('改属性', (patched.children ?? []).find((c) => c.id === radio.id)?.attribute.required, true);

console.log(failed === 0 ? '\n全部通过' : `\n失败 ${failed} 项`);
process.exit(failed === 0 ? 0 : 1);
