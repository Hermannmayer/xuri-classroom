/**
 * 答案格式自检（零框架）。运行：
 *   npx esbuild src/renderer/questions/answers.check.ts --bundle --platform=node --format=esm \
 *     --outfile=node_modules/.cache/answers-check.mjs --log-level=warning && node node_modules/.cache/answers-check.mjs
 */
import assert from 'node:assert/strict';
import { answersOf, optionAnswer, scoreMax, selectedIds, toOptions } from './answers';

const options = toOptions([
  { label: '甲', value: 'o1' },
  { label: '乙', value: 'o2' },
  { label: '丙', value: 'o3' },
]);

// 单选：key = optionId，值 = label
assert.deepEqual(optionAnswer(options[0]), { o1: '甲' });
// 不看值真假，只看 key 存在（后端语义）
assert.deepEqual(selectedIds({ o1: false, o3: null }, options), ['o1', 'o3']);
assert.deepEqual(selectedIds(undefined, options), []);
assert.deepEqual(selectedIds('o1', options), []);
// 多选：退选后 key 消失
assert.deepEqual(answersOf(options, ['o2', 'o3']), { o2: '乙', o3: '丙' });
assert.deepEqual(answersOf(options, []), {});
// 评分范围：默认 [0,5]，上限即星数
assert.equal(scoreMax(undefined), 5);
assert.equal(scoreMax('[1,10]'), 10);
assert.equal(scoreMax('(0,7)'), 7);
assert.equal(scoreMax('[0,0]'), 5);

console.log('answers.check ok');
