import { useMemo, useState } from 'react';
import { Card, Empty, Segmented, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FlatQuestion } from '../../../schema/flatten';
import type { Answer } from '../../../schema/project';
import type { AnswerValue } from '../../../renderer/types';
import { EMPTY, formatAnswer } from '../data/format';
import { TABLE_COMPONENTS } from '../../repo/table';

const CHOICE = new Set(['Radio', 'Checkbox', 'Select', 'Judge']);

const TYPE_NAME: Record<string, string> = {
  Radio: '单选题',
  Checkbox: '多选题',
  Select: '下拉题',
  Judge: '判断题',
  FillBlank: '单行文本题',
  Textarea: '多行文本题',
  MultipleBlank: '多项填空题',
  Nps: 'NPS 题',
  Score: '打分题',
  Cascader: '级联题',
  Address: '地址题',
  Upload: '上传题',
  Signature: '签名题',
  User: '用户题',
  Dept: '部门题',
  Barcode: '条形码',
  HorzBlank: '横向填空题',
};

/** 沿用旧版配色，深蓝底上对比度够 */
const PALETTE = ['#5398ff', '#39d2d9', '#f16b79', '#b18160', '#94ed8c', '#ffb878', '#99a4ff', '#808bea', '#c36cff'];

type ChartKind = 'bar' | 'column' | 'pie';

interface OptionRow {
  key: string;
  label: string;
  count: number;
  percent: number;
  color: string;
}

const fmtPercent = (p: number) => `${p.toFixed(2)}%`;

/**
 * 一道题一屏数据：选项题按 dataSource 列（含 0 票选项），其余题按答案文本去重计数。
 * 占比的分母是「答了这道题的人数」，多选题加起来可能超过 100%，和旧版一致。
 */
function buildRows(q: FlatQuestion, answers: Answer[]) {
  const counts = new Map<string, number>();
  let answered = 0;

  for (const a of answers) {
    const value = (a.answer ?? {})[q.id] as AnswerValue;
    if (value === undefined || value === null || value === '') continue;
    answered += 1;
    if (CHOICE.has(q.type) && typeof value === 'object' && !Array.isArray(value)) {
      for (const key of Object.keys(value)) counts.set(key, (counts.get(key) ?? 0) + 1);
    } else {
      const text = formatAnswer(q, value);
      if (text !== EMPTY) counts.set(text, (counts.get(text) ?? 0) + 1);
    }
  }

  const isChoice = CHOICE.has(q.type);
  const declared = q.schema.dataSource ?? [];
  const entries =
    isChoice && declared.length
      ? declared.map((o) => ({ key: o.value, label: o.label, count: counts.get(o.value) ?? 0 }))
      : // ponytail: 文本题按答案计数只列前 50 项，出现上千种答案再上服务端聚合
        [...counts]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 50)
          .map(([label, count]) => ({ key: label, label, count }));

  const rows: OptionRow[] = entries.map((r, i) => ({
    ...r,
    color: PALETTE[i % PALETTE.length],
    percent: answered > 0 ? (r.count / answered) * 100 : 0,
  }));
  return { rows, answered };
}

/** 横向条形：纯 CSS */
export function Bar({ value, max, color = 'var(--bp-blue)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: 8, background: color, transition: 'width 200ms' }} />
    </div>
  );
}

function Bars({ rows }: { rows: OptionRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span
            title={r.label}
            style={{
              flex: '0 0 120px',
              width: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--bp-text-soft)',
            }}
          >
            {r.label}
          </span>
          <Bar value={r.count} max={max} color={r.color} />
          <span style={{ flex: '0 0 88px', width: 88, textAlign: 'right', color: 'var(--bp-text-soft)' }}>
            {r.count} · {fmtPercent(r.percent)}
          </span>
        </div>
      ))}
    </div>
  );
}

const COLUMN_HEIGHT = 130;

function Columns({ rows }: { rows: OptionRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, minHeight: COLUMN_HEIGHT + 60, paddingTop: 8 }}>
      {rows.map((r) => (
        <div
          key={r.key}
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <span style={{ fontSize: 10, color: 'var(--bp-text-soft)' }}>{fmtPercent(r.percent)}</span>
          <div
            title={`${r.label}：${r.count} 条`}
            style={{
              width: '100%',
              maxWidth: 56,
              height: Math.max(2, Math.round((r.count / max) * COLUMN_HEIGHT)),
              background: r.color,
            }}
          />
          <span
            title={r.label}
            style={{
              maxWidth: '100%',
              fontSize: 10,
              color: 'var(--bp-text-soft)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** conic-gradient 画饼，不引 SVG 路径计算 */
function Pie({ rows }: { rows: OptionRow[] }) {
  const sum = rows.reduce((s, r) => s + r.count, 0);
  if (sum === 0) {
    return <div style={{ color: 'var(--bp-text-soft)', fontSize: 12, padding: '48px 0', textAlign: 'center' }}>暂无数据</div>;
  }

  let acc = 0;
  const stops = rows.map((r) => {
    const from = acc;
    acc += (r.count / sum) * 100;
    return `${r.color} ${from}% ${acc}%`;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div
        title={rows.map((r) => `${r.label}：${r.count} 条`).join('\n')}
        style={{
          width: 168,
          height: 168,
          borderRadius: '50%',
          border: '1px solid var(--bp-line-soft)',
          background: `conic-gradient(from -90deg, ${stops.join(', ')})`,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, minWidth: 150, maxWidth: 240 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: '0 0 8px', width: 8, height: 8, background: r.color }} />
            <span
              title={r.label}
              style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {r.label}
            </span>
            <span style={{ color: 'var(--bp-text-soft)' }}>{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuestionBlock({ q, answers }: { q: FlatQuestion; answers: Answer[] }) {
  const [kind, setKind] = useState<ChartKind>('bar');
  const { rows, answered } = useMemo(() => buildRows(q, answers), [q, answers]);
  const isChoice = CHOICE.has(q.type);

  const columns: ColumnsType<OptionRow> = [
    {
      title: isChoice ? '选项' : '答案',
      dataIndex: 'label',
      ellipsis: true,
      sorter: (a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN', { numeric: true }),
      render: (label: string, row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
          <span style={{ flex: '0 0 8px', width: 8, height: 8, background: row.color }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        </span>
      ),
    },
    {
      title: '数据量',
      dataIndex: 'count',
      width: 88,
      align: 'right',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: '占比',
      dataIndex: 'percent',
      width: 88,
      align: 'right',
      sorter: (a, b) => a.percent - b.percent,
      render: (percent: number) => fmtPercent(percent),
    },
  ];

  return (
    <Card className="bp-corners bp-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <span className="bp-tag" style={{ marginTop: 2 }}>
          {q.number ?? q.index + 1}
        </span>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, wordBreak: 'break-word' }}>
          {q.title || TYPE_NAME[q.type] || q.type}
        </div>
        <Segmented
          size="small"
          value={kind}
          onChange={(v) => setKind(v as ChartKind)}
          options={[
            { label: '条形图', value: 'bar' },
            { label: '柱形图', value: 'column' },
            { label: '扇形图', value: 'pie' },
          ]}
        />
      </div>

      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 14 }}>
        类型：{TYPE_NAME[q.type] ?? q.type}　必填：{q.schema.attribute?.required ? '是' : '否'}　共 {answered} 条数据
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          {rows.length === 0 || answered === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
          ) : kind === 'bar' ? (
            <Bars rows={rows} />
          ) : kind === 'column' ? (
            <Columns rows={rows} />
          ) : (
            <Pie rows={rows} />
          )}
        </div>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <Table<OptionRow>
            rowKey="key"
            size="small"
            bordered
            tableLayout="fixed"
            pagination={false}
            columns={columns}
            dataSource={rows}
            components={TABLE_COMPONENTS}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" /> }}
          />
        </div>
      </div>
    </Card>
  );
}
