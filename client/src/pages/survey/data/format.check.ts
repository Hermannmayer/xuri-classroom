/**
 * 单元格格式化自检（零框架）。运行：
 *   npx esbuild src/pages/survey/data/format.check.ts --bundle --platform=node --format=esm \
 *     --outfile=node_modules/.cache/format-check.mjs --log-level=warning && node node_modules/.cache/format-check.mjs
 */
import assert from 'node:assert/strict';
import type { FlatQuestion } from '../../../schema/flatten';
import type { QuestionType, SurveySchema } from '../../../schema/types';
import { EMPTY, compareText, formatAnswer, isDataQuestion, questionHeader } from './format';

function q(type: QuestionType, schema: Partial<SurveySchema> = {}, title = ''): FlatQuestion {
  const node: SurveySchema = { id: 'q1', title, type, attribute: {}, ...schema };
  return { id: node.id, title, type, schema: node, index: 0, number: 1 };
}


const radio = q('Radio', {
  dataSource: [
    { label: '30 岁以下', value: 'a' },
    { label: '30 岁以上', value: 'b' },
  ],
}, '年龄');
assert.equal(formatAnswer(radio, { a: true }), '30 岁以下');
assert.equal(formatAnswer(radio, { z: true }), 'z');
assert.equal(formatAnswer(radio, { z: true, a: true }), 'z、30 岁以下');
assert.equal(formatAnswer(radio, null), EMPTY);
assert.equal(formatAnswer(radio, ''), EMPTY);


assert.equal(formatAnswer(q('MultipleBlank'), { b1: '甲', b2: '乙' }), '甲，乙');
assert.equal(formatAnswer(q('FillBlank'), '早期字符串'), '早期字符串');


const matrix = q('MatrixRadio', {
  row: [
    { id: 'r1', title: '服务' },
    { id: 'r2', title: '价格' },
  ],
  dataSource: [{ label: '满意', value: 'c1' }],
});
assert.equal(formatAnswer(matrix, { r1: { c1: true } }), '服务: 满意');
assert.equal(
  formatAnswer(matrix, { r1: { c1: true }, r2: { c1: true } }),
  '服务: 满意；价格: 满意',
);
assert.equal(formatAnswer(q('MatrixFillBlank', { row: [{ id: 'r1', title: '服务' }], dataSource: [{ label: '满意', value: 'c1' }] }), { r1: { c1: '好' } }), '服务: 满意=好');


const cascader = q('Cascader', {
  dataSource: [{ label: '浙江省', value: 'zj', children: [{ label: '杭州市', value: 'hz' }] }],
});
assert.equal(formatAnswer(cascader, { hz: '杭州市' }), '杭州市');
assert.equal(formatAnswer(q('Address'), { q1: '浙江省 杭州市' }), '浙江省 杭州市');
assert.equal(formatAnswer(q('Nps'), { '8': true }), '8');
assert.equal(formatAnswer(q('Score'), 4), '4');
assert.equal(formatAnswer(q('Score'), { a: 5 }), '5');


assert.equal(compareText('10', '9'), 1);
assert.equal(compareText(EMPTY, '9'), 1);
assert.equal(compareText('9', EMPTY), -1);
assert.equal(compareText(EMPTY, EMPTY), 0);


assert.equal(questionHeader(radio), '1. 年龄');
assert.equal(questionHeader(q('Radio', {}, '')), '1. Radio');
assert.equal(isDataQuestion(q('RichText')), true);
assert.equal(isDataQuestion(radio), true);

console.log('format.check ok');
