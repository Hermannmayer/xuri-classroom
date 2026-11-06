/**
 * 交卷后的成绩单 / 逐题解析页。
 *
 * 数据来源：POST /api/public/loadExamResult → { name, schema, answer, examScore, rank }
 * 正确答案的存放位置（与后端 AnswerScoreEvaluator 一致）：
 * - 选择题（Radio/Checkbox/Select/Judge）：在「选项子节点」上，
 *   question.children[] 里 attribute.examCorrectAnswer 非空的就是正确项，值等于选项自己的 id。
 * - 填空/简答（FillBlank/Textarea/MultipleBlank）：children[i].attribute.examCorrectAnswer，
 *   兜底 question.attribute.examCorrectAnswer。
 * 对错判定：统一走 `client/src/utils/scoring.ts`（与 backend-data / business-logic 审计的修复项对应）。
 * **逐题对错只是前端预览，最终得分以服务端 exam_score 为准**；`manual` 模式后端没有 evaluator，
 * 这里明确标注「待人工评分」，不假装已经判过分。
 * 题库里多数题目没有 examAnalysis，解析为空时显示「暂无解析」。
 */
import { useEffect, useMemo, useState } from 'react';
import { Empty, Spin, Switch, message } from 'antd';
import { useParams } from 'react-router-dom';
import { post } from '../../api';
import type { QuestionType, SurveySchema } from '../../schema/types';
import { flattenSchema } from '../../schema/flatten';
import type { FlatQuestion } from '../../schema/flatten';
import type { AnswerValue } from '../../renderer/types';
import {
  formatRank,
  formatScore,
  isManualGraded,
  matchFreeText,
} from '../../utils/scoring';
import '../../styles/exam-result.css';

interface PublicExamResult {
  name?: string;
  schema?: SurveySchema;
  examScore?: number;
  rank?: number;
  answer?: Record<string, AnswerValue>;
  /**
   * 答卷状态：0=草稿、1=已提交。后端当前还没下发这个字段（前向兼容），
   * 拿到就按它判断草稿；拿不到时下面用「没有作答内容 + 没有分数」兜底。
   */
  tempSave?: number;
}

const CHOICE = new Set<QuestionType>(['Radio', 'Checkbox', 'Select', 'Judge']);
const BLANK = new Set<QuestionType>(['FillBlank', 'Textarea', 'MultipleBlank', 'HorzBlank']);
const MATRIX = new Set<QuestionType>([
  'MatrixRadio',
  'MatrixCheckbox',
  'MatrixFillBlank',
  'MatrixAuto',
  'MatrixScore',
  'MatrixNps',
]);

const TYPE_LABEL: Partial<Record<QuestionType, string>> = {
  Radio: '单选题',
  Checkbox: '多选题',
  Select: '下拉选择',
  Judge: '判断题',
  FillBlank: '填空题',
  Textarea: '简答题',
  MultipleBlank: '多空填空',
  HorzBlank: '横排填空',
  Score: '评分题',
  Nps: 'NPS',
  Cascader: '级联选择',
  Address: '地址',
  Upload: '上传',
  Signature: '签名',
  User: '人员',
  Dept: '部门',
  Barcode: '条码',
  RichText: '图文',
  MatrixRadio: '矩阵单选',
  MatrixCheckbox: '矩阵多选',
  MatrixFillBlank: '矩阵填空',
  MatrixAuto: '矩阵自动',
  MatrixScore: '矩阵评分',
  MatrixNps: '矩阵 NPS',
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** correct / wrong / unanswered = 判分结果；unknown = 这类题不参与判分 */
type Status = 'correct' | 'wrong' | 'unanswered' | 'unknown' | 'manual';

interface OptionView {
  id: string;
  label: string;
  /** 标准答案里的正确项 */
  correct: boolean;
  /** 用户选了这一项 */
  picked: boolean;
}

interface BlankPair {
  key: string;
  /** 多空填空的空位标题 */
  label: string;
  mine: string;
  /** 原始正确答案，可含换行分隔的多个可接受写法 */
  correct: string;
  ok?: boolean;
}

export interface QuestionView {
  q: FlatQuestion;
  options: OptionView[];
  blanks: BlankPair[];
  /** 非选择、非填空题的答案行（矩阵按行拆开） */
  answerLines: string[];
  /** 非选择、非填空题的正确答案（一般没有） */
  correctText: string;
  analysis: string;
  answered: boolean;
  /** 这道题有标准答案、能判对错 */
  judgeable: boolean;
  status: Status;
}

/* ---------------------------------------------------------------- 取值小工具 */

function asRecord(value: AnswerValue): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/** 把任意答案值摊平成一段文本（对象只取叶子值） */
function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('、');
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(asText)
      .filter(Boolean)
      .join('、');
  }
  return String(value);
}

function trimmed(value?: string): string {
  return (value ?? '').trim();
}

/**
 * 不参与逐项解析的题目（NPS / 评分 / 级联 / 地址等）的答案文本。
 * 值是 true 的对象（NPS 的 { 分值: true }）要用 key 本身，否则只会显示 "true"。
 */
function answerText(value: AnswerValue): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => answerText(item as AnswerValue)).filter(Boolean).join('、');
  }
  if (typeof value !== 'object') return String(value);
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '';
  if (entries.every(([, item]) => typeof item === 'boolean')) {
    return entries
      .filter(([, item]) => item === true)
      .map(([key]) => key)
      .join('、');
  }
  return entries.map(([, item]) => asText(item)).filter(Boolean).join('、');
}

/** 正确答案里可能用换行分隔多个可接受写法，展示时用 / 连起来 */
function prettyCorrect(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' / ');
}

/* ---------------------------------------------------------------- 选项 / 填空 / 矩阵 */

/** 选择题选项：children 是选项节点（带 examCorrectAnswer），dataSource 只补 label */
function buildOptions(q: FlatQuestion, value: AnswerValue): OptionView[] {
  if (!CHOICE.has(q.type)) return [];
  const record = asRecord(value);
  const nodes = q.schema.children ?? [];
  const source = q.schema.dataSource ?? [];
  const questionLevel = trimmed(q.schema.attribute?.examCorrectAnswer);
  // 新数据把正确标记都放在选项节点上；老数据可能只存了选项 id 在题目上
  const flaggedOnNode = nodes.some((node) => Boolean(trimmed(node.attribute?.examCorrectAnswer)));

  const rows: OptionView[] = [];
  const seen = new Set<string>();
  const push = (id: string, label: string, node?: SurveySchema) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const correct = flaggedOnNode
      ? Boolean(trimmed(node?.attribute?.examCorrectAnswer))
      : questionLevel === id;
    rows.push({
      id,
      label: label || id,
      correct,
      picked: Object.prototype.hasOwnProperty.call(record, id),
    });
  };

  for (const node of nodes) push(node.id, node.title ?? '', node);
  for (const item of source) {
    push(item.value, item.label, nodes.find((node) => node.id === item.value));
  }
  return rows;
}

/** 填空/简答的空位与答案：答案格式 { [空位id]: 文本 }，兼容早期直接存字符串 */
function buildBlanks(q: FlatQuestion, value: AnswerValue): BlankPair[] {
  if (!BLANK.has(q.type)) return [];
  const record = asRecord(value);
  const questionLevel = trimmed(q.schema.attribute?.examCorrectAnswer);
  const rule = q.schema.attribute?.examMatchRule;
  const children = q.schema.children ?? [];

  if (q.type !== 'MultipleBlank' && q.type !== 'HorzBlank') {
    const blank = children[0];
    // 正常情况答案 key 就是空位 id；空位 id 变过的老答卷只剩一个值时直接用它
    const direct = blank ? asText(record[blank.id]) : '';
    const fallbackValues = Object.values(record).map(asText).filter(Boolean);
    const mine = direct || (fallbackValues.length === 1 ? fallbackValues[0] : asText(value));
    const correct = trimmed(blank?.attribute?.examCorrectAnswer) || questionLevel;
    return [
      {
        key: blank?.id ?? q.id,
        label: blank?.title || '第 1 空',
        mine,
        correct,
        ok: correct ? matchFreeText(mine, correct, { rule }) : undefined,
      },
    ];
  }

  const blanks: SurveySchema[] = children.length
    ? children
    : [{ id: q.id, title: '', type: q.type, attribute: {} }];
  return blanks.map((blank, index) => {
    const mine = asText(record[blank.id]);
    const own = trimmed(blank.attribute?.examCorrectAnswer);
    // 单空的老数据会把答案存在题目上，多空时不能张冠李戴
    const correct = own || (blanks.length === 1 ? questionLevel : '');
    return {
      key: blank.id,
      label: blank.title || `第 ${index + 1} 空`,
      mine,
      correct,
      ok: correct ? matchFreeText(mine, correct, { rule }) : undefined,
    };
  });
}

/** 矩阵题：行在 schema.row，列在 dataSource（老数据在 children），排成「行：列、列」 */
function matrixLines(q: FlatQuestion, value: AnswerValue): string[] {
  const record = asRecord(value);
  const rows = q.schema.row ?? [];
  const fromSource = (q.schema.dataSource ?? []).map((item) => ({ id: item.value, label: item.label }));
  const fromChildren = (q.schema.children ?? []).map((child) => ({ id: child.id, label: child.title ?? '' }));
  const columns = fromSource.length ? fromSource : fromChildren;
  const lines: string[] = [];

  for (const [rowId, rawRow] of Object.entries(record)) {
    const rowLabel = rows.find((row) => row.id === rowId)?.title ?? rowId;
    const cells = asRecord(rawRow as AnswerValue);
    const texts = Object.keys(cells).map((colId) => {
      const colLabel = columns.find((col) => col.id === colId)?.label ?? colId;
      const cellText = cells[colId] === true ? '' : asText(cells[colId]);
      return cellText ? `${colLabel}=${cellText}` : colLabel;
    });
    if (texts.length) lines.push(`${rowLabel}：${texts.join('、')}`);
  }
  return lines;
}

/* ---------------------------------------------------------------- 一道题的视图模型 */

export function buildView(q: FlatQuestion, value: AnswerValue): QuestionView {
  const options = buildOptions(q, value);
  const blanks = buildBlanks(q, value);
  const analysis = trimmed(q.schema.attribute?.examAnalysis);
  const picked = options.filter((option) => option.picked).map((option) => option.id);
  const correct = options.filter((option) => option.correct).map((option) => option.id);

  let answerLines: string[] = [];
  let correctText = '';
  let answered = false;
  let judgeable = false;
  let status: Status = 'unknown';

  if (options.length > 0) {
    answered = picked.length > 0;
    judgeable = correct.length > 0;
    if (judgeable) {
      const sameSet =
        picked.length === correct.length && picked.every((id) => correct.includes(id));
      status = !answered ? 'unanswered' : sameSet ? 'correct' : 'wrong';
    }
  } else if (blanks.length > 0) {
    answered = blanks.some((blank) => blank.mine.trim() !== '');
    judgeable = blanks.some((blank) => blank.ok !== undefined);
    const fullyJudgeable = blanks.every((blank) => blank.ok !== undefined);
    if (judgeable && fullyJudgeable) {
      status = !answered ? 'unanswered' : blanks.every((blank) => blank.ok) ? 'correct' : 'wrong';
    }
  } else {
    answerLines = MATRIX.has(q.type) ? matrixLines(q, value) : [];
    const mine = answerLines.length ? '' : answerText(value);
    answered = answerLines.length > 0 || mine !== '';
    correctText = prettyCorrect(trimmed(q.schema.attribute?.examCorrectAnswer));
    answerLines = answerLines.length ? answerLines : mine ? [mine] : [];
    // 主观题（manual 模式）后端没有 evaluator，恒 0 分：这里明确标成待人工评分，
    // 避免学员把「没判」误解成「答错了」。
    status = !answered ? 'unanswered' : isManualGraded(q.schema.attribute) ? 'manual' : 'unknown';
  }

  return { q, options, blanks, answerLines, correctText, analysis, answered, judgeable, status };
}

function toneOf(ok?: boolean): string {
  if (ok === undefined) return '';
  return ok ? ' is-ok' : ' is-bad';
}

function statusBadge(view: QuestionView): { text: string; tone: string } | undefined {
  if (view.judgeable) {
    if (!view.answered) return { text: '未作答', tone: 'is-unanswered' };
    if (view.status === 'correct') return { text: '✓ 回答正确', tone: 'is-correct' };
    if (view.status === 'wrong') return { text: '✕ 回答错误', tone: 'is-wrong' };
    // 只配置了部分空的正确答案：逐空标记已经有了，卡头不再下结论
    return undefined;
  }
  return view.answered ? undefined : { text: '未作答', tone: 'is-unanswered' };
}

/* ---------------------------------------------------------------- 卡片 */

export function QuestionCard({ view }: { view: QuestionView }) {
  const { q, options, blanks, analysis } = view;
  const badge = statusBadge(view);
  const mineLabels = options.filter((option) => option.picked).map((option) => option.label);
  const correctLabels = options.filter((option) => option.correct).map((option) => option.label);

  return (
    <article className="sk-result-card bp-corners">
      <div className="sk-result-card-head">
        <span className="sk-q-no">{String(q.number ?? q.index + 1).padStart(2, '0')}</span>
        <span className="sk-q-type">{TYPE_LABEL[q.type] ?? q.type}</span>
        {badge && <span className={`sk-q-status ${badge.tone}`}>{badge.text}</span>}
      </div>

      <h2 className="sk-q-title">{q.title || '（未填写题干）'}</h2>

      {options.length > 0 && (
        <ul className="sk-opt-list">
          {options.map((option, index) => {
            const wrong = option.picked && !option.correct;
            const className = [
              'sk-opt',
              option.correct ? 'is-correct' : '',
              option.picked ? 'is-picked' : '',
              wrong ? 'is-wrong' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <li className={className} key={option.id}>
                <span className="sk-opt-key">{LETTERS[index] ?? String(index + 1)}</span>
                <span className="sk-opt-label">{option.label}</span>
                <span className="sk-opt-notes">
                  {option.picked && <span className="sk-opt-note is-picked">我的选择</span>}
                  {option.correct && <span className="sk-opt-note is-correct">✓ 正确答案</span>}
                  {wrong && <span className="sk-opt-note is-wrong">✕ 选错</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {blanks.length > 0 && (
        <div className="sk-blank-list">
          {blanks.map((blank) => (
            <div className="sk-blank-item" key={blank.key}>
              {blanks.length > 1 && <div className="sk-blank-title">{blank.label}</div>}
              <div className="sk-answer-grid">
                <div className={`sk-answer-cell${toneOf(blank.ok)}`}>
                  <div className="sk-answer-cell-label">我的答案</div>
                  <div className="sk-answer-cell-text">{blank.mine.trim() || '未作答'}</div>
                </div>
                <div className={`sk-answer-cell${blank.correct ? ' is-answer-cell' : ''}`}>
                  <div className="sk-answer-cell-label">正确答案</div>
                  <div className="sk-answer-cell-text">
                    {prettyCorrect(blank.correct) || '未设置正确答案'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {options.length > 0 && (
        <div className="sk-answer-rows">
          <div className="sk-answer-row">
            <span className="sk-answer-key">我的答案</span>
            <span
              className={`sk-answer-val${
                view.judgeable ? (view.status === 'correct' ? ' is-ok' : ' is-bad') : ''
              }`}
            >
              {mineLabels.length ? mineLabels.join('、') : '未作答'}
            </span>
          </div>
          <div className="sk-answer-row">
            <span className="sk-answer-key">正确答案</span>
            <span className="sk-answer-val is-ok">
              {correctLabels.length ? correctLabels.join('、') : '未设置正确答案'}
            </span>
          </div>
        </div>
      )}

      {options.length === 0 && blanks.length === 0 && (
        <div className="sk-answer-rows">
          {view.answerLines.length > 0 ? (
            view.answerLines.map((line, index) => (
              <div className="sk-answer-row" key={`${view.q.id}-${index}`}>
                <span className="sk-answer-key">我的答案</span>
                <span className="sk-answer-val">{line}</span>
              </div>
            ))
          ) : (
            <div className="sk-answer-row">
              <span className="sk-answer-key">我的答案</span>
              <span className="sk-answer-val">未作答</span>
            </div>
          )}
          {view.correctText && (
            <div className="sk-answer-row">
              <span className="sk-answer-key">正确答案</span>
              <span className="sk-answer-val is-ok">{view.correctText}</span>
            </div>
          )}
        </div>
      )}

      <div className="sk-analysis">
        <div className="sk-analysis-label">解析 ANALYSIS</div>
        <div className={`sk-analysis-text${analysis ? '' : ' is-empty'}`}>{analysis || '暂无解析'}</div>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------- 页面 */

export default function ExamResult() {
  const { id = '', answerId = '' } = useParams();
  const [data, setData] = useState<PublicExamResult>();
  const [loading, setLoading] = useState(true);
  const [onlyWrong, setOnlyWrong] = useState(false);

  useEffect(() => {
    let alive = true;
    post<PublicExamResult>('/api/public/loadExamResult', { id, answerId })
      .then((res) => alive && setData(res))
      .catch((e: Error) => message.error(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, answerId]);

  const views = useMemo(() => {
    if (!data?.schema) return [];
    const answers = data.answer ?? {};
    return flattenSchema(data.schema).map((q) => buildView(q, answers[q.id]));
  }, [data]);

  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    let partial = 0;
    let judgeable = 0;
    for (const view of views) {
      if (!view.judgeable) continue;
      judgeable += 1;
      if (!view.answered) unanswered += 1;
      else if (view.status === 'correct') correct += 1;
      else if (view.status === 'wrong') wrong += 1;
      else partial += 1;
    }
    return { total: views.length, correct, wrong, unanswered, partial, judgeable };
  }, [views]);

  const shown = onlyWrong
    ? views.filter(
        (view) => view.judgeable && (view.status === 'wrong' || view.status === 'unanswered'),
      )
    : views;

  if (loading) {
    return (
      <div className="sk-result">
        <div className="sk-result-loading">
          <Spin />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="sk-result">
        <div className="sk-result-loading">
          <Empty description="没有找到这份答卷，或发布方未开放成绩单" />
        </div>
      </div>
    );
  }

  return (
    <div className="sk-result">
      <div className="sk-result-inner">
        <header className="sk-result-head bp-corners">
          <div className="sk-result-eyebrow">RESULT / 成绩单</div>
          <h1 className="sk-result-name">{data.name || '答卷'}</h1>

          <div className="sk-result-figures">
            <div className="sk-result-score">
              {typeof data.examScore === 'number' ? (
                <>
                  <span className="sk-result-score-num">{formatScore(data.examScore)}</span>
                  <span className="sk-result-score-unit">分</span>
                </>
              ) : (
                <span className="sk-result-score-none">发布方未开放分数</span>
              )}
            </div>

            <ul className="sk-result-stats">
              <li>
                <span className="sk-stat-label">题目</span>
                <span className="sk-stat-value">{stats.total}</span>
              </li>
              {stats.judgeable > 0 && (
                <>
                  <li>
                    <span className="sk-stat-label">答对</span>
                    <span className="sk-stat-value is-ok">{stats.correct}</span>
                  </li>
                  <li>
                    <span className="sk-stat-label">答错</span>
                    <span className="sk-stat-value is-bad">{stats.wrong}</span>
                  </li>
                  <li>
                    <span className="sk-stat-label">未作答</span>
                    <span className="sk-stat-value">{stats.unanswered}</span>
                  </li>
                  {stats.partial > 0 && (
                    <li>
                      <span className="sk-stat-label">部分判分</span>
                      <span className="sk-stat-value">{stats.partial}</span>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>

          {typeof data.rank === 'number' && <div className="sk-result-rank">排名第 {formatRank(data.rank)} 位</div>}
        </header>

        {views.length > 0 && (
          <div className="sk-result-toolbar">
            <label className="sk-result-filter">
              <Switch
                size="small"
                checked={onlyWrong}
                disabled={stats.judgeable === 0}
                onChange={setOnlyWrong}
              />
              <span>只看错题（含未作答）</span>
            </label>
            <div className="sk-result-legend">
              <span className="sk-legend-item">
                <i className="sk-legend-dot is-correct" />
                正确答案
              </span>
              <span className="sk-legend-item">
                <i className="sk-legend-dot is-picked" />
                我的选择
              </span>
              <span className="sk-legend-item">
                <i className="sk-legend-dot is-wrong" />
                选错
              </span>
            </div>
          </div>
        )}

        {views.length > 0 && !data.answer && (
          <div className="sk-result-note">
            发布方没有开放你的作答记录，下面只显示题目与标准答案。
          </div>
        )}

        {views.length === 0 ? (
          <div className="sk-result-empty">
            <Empty description="发布方没有开放逐题答案" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : shown.length === 0 ? (
          <div className="sk-result-empty">
            <Empty description="没有错题，全部答对了" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          shown.map((view) => <QuestionCard key={view.q.id} view={view} />)
        )}

        {views.length > 0 && (
          <div className="sk-result-foot">
            共 {stats.total} 题{onlyWrong ? `，当前只显示 ${shown.length} 题` : ''} · 判定以发布方设置为准
          </div>
        )}
      </div>
    </div>
  );
}
