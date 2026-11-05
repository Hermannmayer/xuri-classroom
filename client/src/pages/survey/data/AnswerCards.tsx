/**
 * 手机端答卷卡片：电子表格在 390px 下横向滚不起来，一条答卷一张卡。
 * 单元格文本仍用父级算好的 cells（来自 data/format.ts），卡片只负责排版。
 */
import { Button, Checkbox, Tag } from 'antd';
import type { Answer } from '../../../schema/project';
import type { FlatQuestion } from '../../../schema/flatten';
import { EMPTY } from './format';

export interface AnswerCardsProps {
  rows: Answer[];
  questions: FlatQuestion[];
  /** rowId → questionId → 单元格文本 */
  cells: Map<string, Record<string, string>>;
  selected: string[];
  onSelect: (ids: string[]) => void;
  onDetail: (row: Answer) => void;
  onEdit: (row: Answer) => void;
  onDelete: (row: Answer) => void;
}

const CARD_STYLE = {
  border: '1px solid var(--bp-line)',
  background: 'rgba(30,58,95,0.55)',
  padding: 12,
  marginBottom: 10,
} as const;

const ELLIPSIS = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

export default function AnswerCards({
  rows,
  questions,
  cells,
  selected,
  onSelect,
  onDetail,
  onEdit,
  onDelete,
}: AnswerCardsProps) {
  return (
    <div>
      {rows.map((row) => {
        const texts = cells.get(row.id) ?? {};
        // 先展示答过的题，一道没答时退回前 3 题，至少让人看到问了什么
        const answered = questions
          .filter((q) => texts[q.id] && texts[q.id] !== EMPTY)
          .slice(0, 3);
        const summary = (answered.length ? answered : questions.slice(0, 3)).map((q) => ({
          id: q.id,
          title: q.title || q.type,
          text: texts[q.id] ?? EMPTY,
        }));
        const checked = selected.includes(row.id);
        const who = row.createByName || row.createBy?.slice(0, 8) || '匿名';

        return (
          <div key={row.id} style={CARD_STYLE} className="bp-corners">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Checkbox
                checked={checked}
                aria-label="选择这份答卷"
                onChange={(e) =>
                  onSelect(
                    e.target.checked ? [...selected, row.id] : selected.filter((x) => x !== row.id),
                  )
                }
              />
              <span style={{ fontSize: 12 }}>{row.createAt || EMPTY}</span>
              <div style={{ flex: 1 }} />
              {row.tempSave === 1 ? <Tag color="success">已提交</Tag> : <Tag color="warning">暂存</Tag>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--bp-text-soft)' }}>答卷人</span>
              <span style={ELLIPSIS}>{who}</span>
              <div style={{ flex: 1 }} />
              {typeof row.examScore === 'number' && (
                <span style={{ color: 'var(--bp-orange)' }}>{row.examScore} 分</span>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              {summary.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: 4, fontSize: 12, lineHeight: '20px', minWidth: 0 }}>
                  <span style={{ ...ELLIPSIS, color: 'var(--bp-text-soft)', flex: '0 0 auto', maxWidth: '45%' }}>
                    {item.title}：
                  </span>
                  <span style={ELLIPSIS}>{item.text}</span>
                </div>
              ))}
              {summary.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>这份问卷还没有题目</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Button style={{ height: 36, flex: 1 }} onClick={() => onDetail(row)}>
                详情
              </Button>
              <Button style={{ height: 36, flex: 1 }} onClick={() => onEdit(row)}>
                编辑
              </Button>
              <Button danger style={{ height: 36, flex: 1 }} onClick={() => onDelete(row)}>
                删除
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
