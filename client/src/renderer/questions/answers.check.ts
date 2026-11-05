/**
 * 答案格式自检（零框架）。运行：
 *   npx esbuild src/renderer/questions/answers.check.ts --bundle --platform=node --format=esm \
 *     --outfile=node_modules/.cache/answers-check.mjs --log-level=warning && node node_modules/.cache/answers-check.mjs
 */
import assert from 'node:assert/strict';
import {
  addressAnswer,
  addressText,
  answersOf,
  blankAnswer,
  blankId,
  blankText,
  blankValues,
  cascaderLabel,
  cascaderPath,
  firstSelectedId,
  matrixColumns,
  matrixPick,
  matrixSetText,
  matrixText,
  npsRange,
  optionAnswer,
  scoreMax,
  selectedIds,
  toOptions,
} from './answers';
import type { DataSource } from '../../schema/types';

const options = toOptions([
  { label: '甲', value: 'o1' },
  { label: '乙', value: 'o2' },
  { label: '丙', value: 'o3' },
]);

// 单选：key = optionId，值 true（后端只看 key 是否存在）
assert.deepEqual(optionAnswer(options[0]), { o1: true });
assert.deepEqual(selectedIds({ o1: false, o3: null }, options), ['o1', 'o3']);
assert.deepEqual(selectedIds(undefined, options), []);
assert.deepEqual(selectedIds('o1', options), []);
assert.deepEqual(answersOf(options, ['o2', 'o3']), { o2: true, o3: true });
assert.deepEqual(answersOf(options, []), {});

// 多空填空：{ [空位id]: 文本 }
assert.equal(blankId({ children: [{ id: 'b1', title: '', type: 'Option', attribute: {} }] }), 'b1');
assert.deepEqual(blankAnswer('b1', '甲'), { b1: '甲' });
assert.equal(blankText({ b1: '甲' }, 'b1'), '甲');
assert.equal(blankText('早期字符串', 'b1'), '早期字符串');
assert.deepEqual(blankValues({ b1: '甲', b2: '乙' }), { b1: '甲', b2: '乙' });
assert.deepEqual(blankValues('坏数据'), {});

// 矩阵：{ [rowId]: { [colId]: true | 文本 } }
assert.deepEqual(
  matrixColumns({ dataSource: [{ label: '满意', value: 'c1' }] }),
  [{ label: '满意', value: 'c1' }],
);
assert.deepEqual(
  matrixColumns({ children: [{ id: 'c9', title: '旧列', type: 'Option', attribute: {} }] }),
  [{ label: '旧列', value: 'c9' }],
);
assert.deepEqual(matrixPick({}, 'r1', 'c1', false), { r1: { c1: true } });
// 单选：再点同行另一列，整行替换
assert.deepEqual(matrixPick({ r1: { c1: true } }, 'r1', 'c2', false), { r1: { c2: true } });
// 多选：切换单个 key
assert.deepEqual(matrixPick({ r1: { c1: true } }, 'r1', 'c2', true), { r1: { c1: true, c2: true } });
assert.deepEqual(matrixPick({ r1: { c1: true } }, 'r1', 'c1', true), {});
assert.deepEqual(matrixSetText({}, 'r1', 'c1', '文本'), { r1: { c1: '文本' } });
assert.equal(matrixText({ r1: { c1: '文本' } }, 'r1', 'c1'), '文本');
assert.deepEqual(matrixSetText({ r1: { c1: '文本' } }, 'r1', 'c1', ''), {});

// NPS：{ [分值]: true }，默认 0..10
assert.deepEqual(npsRange(undefined), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.deepEqual(npsRange({ npsStartNum: 1, npsTotalNum: 3 }), [1, 2, 3]);
assert.equal(npsRange({ npsStartNum: 0, npsTotalNum: 0 }).length, 11);
assert.equal(firstSelectedId({ 8: true }), '8');
assert.equal(firstSelectedId(undefined), undefined);

// 级联：{ [末级value]: 末级label }
const tree: DataSource[] = [
  { label: '省一', value: 'p1', children: [{ label: '市一', value: 'c1', children: [{ label: '区一', value: 'd1' }] }] },
];
assert.deepEqual(cascaderPath(tree, 'd1'), ['p1', 'c1', 'd1']);
assert.deepEqual(cascaderPath(tree, 'nope'), []);
assert.equal(cascaderLabel(tree, 'd1'), '区一');
assert.equal(cascaderLabel(tree, 'nope'), undefined);

// 地址：{ [questionId]: '省 市 区' }，兼容纯字符串
assert.deepEqual(addressAnswer('q1', '浙江省 杭州市 西湖区'), { q1: '浙江省 杭州市 西湖区' });
assert.equal(addressText({ q1: '浙江省 杭州市 西湖区' }, 'q1'), '浙江省 杭州市 西湖区');
assert.equal(addressText('旧字符串', 'q1'), '旧字符串');
assert.equal(addressText(undefined, 'q1'), '');

// 评分范围：默认 [0,5]，上限即星数
assert.equal(scoreMax(undefined), 5);
assert.equal(scoreMax('[1,10]'), 10);
assert.equal(scoreMax('(0,7)'), 7);
assert.equal(scoreMax('[0,0]'), 5);

console.log('answers.check ok');
