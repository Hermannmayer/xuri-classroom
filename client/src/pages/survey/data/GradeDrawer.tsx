/**
 * 主观题人工批改抽屉。
 *
 * 数据：GET /api/answer/grade/detail（老师端默认连参考答案一起拿，接口本身默认不下发）。
 * 保存：POST /api/answer/grade —— 只提交 examAnswerMode=manual 的题；客观题的机器分不参与，
 * 后端收到客观题传分会直接 400（机器分不可覆盖）。
 *
 * 快捷键：
 * - 分数框 Enter：保存并跳到下一题；
 * - 评语框 Ctrl/⌘ + Enter：保存并跳到下一题（Enter 仍是换行）；
 * - ← / →：在题目卡片之间切换（焦点在输入框里时保留光标移动，避免打字时跳题）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Card, Drawer, Empty, Input, InputNumber, Space, Spin, Tag } from 'antd';
import { getGradeDetail, resetGrade, submitGrade } from '../../../api';
import type { GradeDetail, GradeItem } from '../../../api';
import type { Answer } from '../../../schema/project';
import { flattenSchema } from '../../../schema/flatten';
import type { AnswerValue } from '../../../renderer/types';
import { formatScore } from '../../../utils/scoring';
import RichTextContent from '../../../components/RichTextContent';
import { EMPTY, flattenText, formatAnswer } from './format';

/**
 * 批改相关字段目前还没进 `schema/project.ts` 的 Answer 类型（那个文件归 Lead 维护），
 * 这里用交叉类型补上，避免为了两个展示字段去动公共类型。
 */
export type GradableAnswer = Answer & {
  /** none 无需批改 / pending 待批改 / graded 已批改 */
  gradeStatus?: string;
  /** 答题人姓名（交卷时快照） */
  answererName?: string;
};

export interface GradeDrawerProps {
  open: boolean;
  /** 要批改的答卷 id */
  answerId?: string;
  onClose: () => void;
  /** 保存 / 撤销后让主列表重新拉一遍（总分与批改状态变了） */
  onChanged?: () => void;
}

/** 题型中文名：只列常见题型，其余直接显示枚举名，保证不会出现空标签 */
const TYPE_LABEL: Record<string, string> = {
  Textarea: '简答题',
  FillBlank: '填空题',
  MultipleBlank: '多空填空',
  HorzBlank: '横排填空',
  MatrixFillBlank: '矩阵填空',
  Radio: '单选题',
  Checkbox: '多选题',
  Select: '下拉选择',
  Judge: '判断题',
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
};

export default function GradeDrawer({ open, answerId, onClose, onChanged }: GradeDrawerProps) {
  const { message } = App.useApp();
  const [detail, setDetail] = useState<GradeDetail>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  /** 本地待保存的人工分 / 评语：questionId → 值 */
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  /** 当前聚焦的题（只在「可人工给分」的题之间切换） */
  const [active, setActive] = useState(0);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const inputRefs = useRef<Array<{ focus: () => void } | null>>([]);

  const load = useCallback(async () => {
    if (!answerId) return;
    setLoading(true);
    try {
      const data = await getGradeDetail(answerId);
      setDetail(data);
      const nextScores: Record<string, number | null> = {};
      const nextComments: Record<string, string> = {};
      for (const item of data.items ?? []) {
        if (!item.editable) continue;
        // 没批改过是 null（待批改），不要落成 0 分
        nextScores[item.questionId] = typeof item.score === 'number' ? item.score : null;
        nextComments[item.questionId] = item.comment ?? '';
      }
      setScores(nextScores);
      setComments(nextComments);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [answerId, message]);

  useEffect(() => {
    if (!open) {
      // 关掉之后清掉上一份答卷，避免下次打开先闪一下旧数据
      setDetail(undefined);
      return;
    }
    setActive(0);
    void load();
  }, [open, load]);

  const questions = useMemo(() => (detail?.schema ? flattenSchema(detail.schema) : []), [detail]);
  const questionById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const items = useMemo(() => detail?.items ?? [], [detail]);
  const editableItems = useMemo(() => items.filter((item) => item.editable), [items]);
  const unanswered = editableItems.filter((item) => typeof scores[item.questionId] !== 'number').length;

  const move = useCallback(
    (delta: number) => {
      setActive((prev) => {
        if (editableItems.length === 0) return 0;
        return Math.min(Math.max(prev + delta, 0), editableItems.length - 1);
      });
    },
    [editableItems.length],
  );

  // 焦点不在输入框时，←/→ 也能切题（键盘批改不用来回点鼠标）
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      // 输入框里保留光标语义：分数框自己处理左右键，评语框交给浏览器
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, move]);

  // 切题后滚到可视区并聚焦分数框，键盘批改才能连续进行
  useEffect(() => {
    if (!open) return;
    cardRefs.current[active]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    inputRefs.current[active]?.focus();
  }, [active, open, editableItems.length]);

  const save = async (options?: { questionId?: string; next?: boolean }) => {
    if (!detail) return;
    const payload = editableItems
      .filter((item) => typeof scores[item.questionId] === 'number')
      .map((item) => ({
        questionId: item.questionId,
        score: scores[item.questionId] as number,
        comment: comments[item.questionId] || undefined,
      }));
    if (payload.length === 0) {
      message.warning('先给至少一道主观题打分');
      return;
    }
    for (const item of editableItems) {
      const value = scores[item.questionId];
      if (typeof value !== 'number') continue;
      if (typeof item.maxScore === 'number' && value > item.maxScore) {
        message.error(`第 ${item.number ?? ''} 题最多 ${item.maxScore} 分`);
        return;
      }
    }
    const index = options?.questionId
      ? editableItems.findIndex((item) => item.questionId === options.questionId)
      : -1;
    setSaving(true);
    try {
      await submitGrade({ answerId: detail.answerId, items: payload, submit: true });
      message.success('已保存');
      await load();
      onChanged?.();
      if (options?.next && index >= 0) {
        setActive(Math.min(index + 1, Math.max(editableItems.length - 1, 0)));
      }
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const undo = async (item: GradeItem) => {
    if (!detail) return;
    setSaving(true);
    try {
      await resetGrade({ answerId: detail.answerId, questionIds: [item.questionId] });
      message.success('已撤销这道题的批改');
      await load();
      onChanged?.();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /** 学员答案：优先用整卷 schema 的题目信息格式化（选项题能还原成选项文字） */
  const answerText = (item: GradeItem) => {
    const question = questionById.get(item.questionId);
    if (question) return formatAnswer(question, item.answer as AnswerValue);
    return flattenText(item.answer) || EMPTY;
  };

  const renderTitle = (item: GradeItem) => {
    const question = questionById.get(item.questionId);
    if (question && (question.schema.attribute?.richTitle || item.richTitle)) {
      return <RichTextContent html={question.title} style={{ fontSize: 13 }} />;
    }
    return (
      <div style={{ fontSize: 13, lineHeight: 1.7 }}>{item.title || item.type || '未命名题目'}</div>
    );
  };

  const title = detail?.answererName
    ? `主观题批改 · ${detail.answererName}`
    : detail?.anonymous
      ? '主观题批改 · 匿名答卷'
      : '主观题批改';

  return (
    <Drawer
      title={title}
      placement="right"
      width="min(720px, 100vw)"
      open={open}
      onClose={onClose}
      destroyOnClose
      footer={
        detail ? (
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              {unanswered > 0 ? `还有 ${unanswered} 道主观题没给分` : '主观题都已给分'} · 分数框 Enter
              保存并下一题 · ←/→ 切题
            </span>
            <Space>
              <Button onClick={() => move(-1)} disabled={editableItems.length <= 1}>
                上一题
              </Button>
              <Button onClick={() => move(1)} disabled={editableItems.length <= 1}>
                下一题
              </Button>
              <Button type="primary" loading={saving} onClick={() => void save()}>
                保存批改
              </Button>
            </Space>
          </Space>
        ) : null
      }
    >
      <Spin spinning={loading}>
        {!detail ? (
          <Empty description="没有可批改的答卷" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* 汇总：三块分数都来自后端同一个评估器，和成绩单口径一致 */}
            <Card size="small" style={{ background: 'var(--bp-panel-strong)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13 }}>
                <span>
                  客观题 <b>{formatScore(detail.objectiveScore)}</b>
                </span>
                <span>
                  主观题 <b>{formatScore(detail.manualScore)}</b>
                </span>
                <span>
                  合计{' '}
                  <b style={{ color: 'var(--bp-orange)' }}>{formatScore(detail.examScore)}</b>
                </span>
                <span style={{ color: 'var(--bp-text-soft)' }}>
                  满分 {formatScore(detail.totalScore)}
                </span>
                <span style={{ color: 'var(--bp-text-soft)' }}>
                  待批 {detail.pendingCount ?? 0} 题
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 6 }}>
                {detail.answererName || (detail.anonymous ? '匿名' : '未填写姓名')} · 交卷{' '}
                {detail.createAt || EMPTY}
                {typeof detail.attemptNo === 'number'
                  ? ` · 第 ${detail.attemptNo + 1} 次作答`
                  : ''}
                {detail.gradedByName ? ` · 上次批改 ${detail.gradedByName}` : ''}
              </div>
            </Card>

            {items.length === 0 && (
              <Empty
                description="这份答卷没有题目快照，无法批改"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}

            {items.map((item, index) => {
              const editableIndex = item.editable
                ? editableItems.findIndex((x) => x.questionId === item.questionId)
                : -1;
              const graded = typeof item.score === 'number';
              const scored = typeof scores[item.questionId] === 'number';
              return (
                <div
                  key={item.questionId}
                  ref={
                    editableIndex >= 0
                      ? (node) => {
                          cardRefs.current[editableIndex] = node;
                        }
                      : undefined
                  }
                >
                  <Card
                    size="small"
                    style={
                      editableIndex === active && editableIndex >= 0
                        ? { borderColor: 'var(--bp-orange)' }
                        : undefined
                    }
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <div style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="bp-tag">{item.number ?? index + 1}</span>
                        <Tag>{TYPE_LABEL[item.type ?? ''] ?? item.type ?? '题目'}</Tag>
                        {item.editable ? (
                          <Tag color={scored ? 'success' : 'processing'}>
                            {scored ? '已给分' : '待批改'}
                          </Tag>
                        ) : (
                          <Tag>机器判分</Tag>
                        )}
                      </div>
                      {renderTitle(item)}
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--bp-text)',
                          whiteSpace: 'pre-wrap',
                          paddingLeft: 2,
                        }}
                      >
                        {answerText(item)}
                      </div>
                      {item.correctAnswer ? (
                        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                          参考答案：{item.correctAnswer}
                        </div>
                      ) : null}
                      {item.analysis ? (
                        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                          解析：{item.analysis}
                        </div>
                      ) : null}
                      {item.editable ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <InputNumber
                            ref={(node) => {
                              inputRefs.current[editableIndex] = node
                                ? { focus: () => node.focus() }
                                : null;
                            }}
                            min={0}
                            max={typeof item.maxScore === 'number' ? item.maxScore : undefined}
                            step={0.5}
                            style={{ width: 130 }}
                            addonAfter="分"
                            placeholder={`0 ~ ${item.maxScore ?? '满分'}`}
                            value={scores[item.questionId] ?? undefined}
                            onChange={(value) =>
                              setScores((prev) => ({
                                ...prev,
                                [item.questionId]: typeof value === 'number' ? value : null,
                              }))
                            }
                            onPressEnter={() => void save({ questionId: item.questionId, next: true })}
                            onKeyDown={(event) => {
                              // 左右键在数字输入框里没有光标语义，直接用来切题
                              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                                event.preventDefault();
                                move(event.key === 'ArrowRight' ? 1 : -1);
                              }
                            }}
                          />
                          <Input.TextArea
                            value={comments[item.questionId] ?? ''}
                            onChange={(event) =>
                              setComments((prev) => ({
                                ...prev,
                                [item.questionId]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                                event.preventDefault();
                                void save({ questionId: item.questionId, next: true });
                              }
                            }}
                            placeholder="评语（可选），Ctrl/⌘ + Enter 保存并下一题"
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            style={{ flex: 1, minWidth: 200 }}
                          />
                          {graded && (
                            <Button type="link" size="small" danger disabled={saving} onClick={() => void undo(item)}>
                              撤销
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                          机器分 {formatScore(item.score)} / 满分 {formatScore(item.maxScore)}
                        </div>
                      )}
                    </Space>
                  </Card>
                </div>
              );
            })}
          </Space>
        )}
      </Spin>
    </Drawer>
  );
}
