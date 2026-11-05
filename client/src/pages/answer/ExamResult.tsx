import { useEffect, useMemo, useState } from 'react';
import { Card, Collapse, Empty, message, Spin } from 'antd';
import { useParams } from 'react-router-dom';
import { post } from '../../api';
import type { SurveySchema } from '../../schema/types';
import { flattenSchema } from '../../schema/flatten';
import type { AnswerValue } from '../../renderer/types';

interface PublicExamResult {
  name?: string;
  schema?: SurveySchema;
  examScore?: number;
  rank?: number;
  answer?: Record<string, AnswerValue>;
}

const CHOICE = new Set(['Radio', 'Checkbox', 'Select', 'Judge']);

function formatValue(schema: SurveySchema | undefined, qId: string, value: AnswerValue): string {
  if (value === null || value === undefined || value === '') return '未作答';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value !== 'object') return String(value);
  const record = value as Record<string, unknown>;
  const question = schema ? flattenSchema(schema).find((q) => q.id === qId) : undefined;
  if (question && CHOICE.has(question.type)) {
    return Object.keys(record)
      .map((id) => question.schema.dataSource?.find((o) => o.value === id)?.label ?? id)
      .join('、');
  }
  return Object.values(record)
    .map((v) => (v === true ? '是' : String(v)))
    .join('，');
}

/** 交卷后的成绩单：分数 + 排名 + 逐题答案与解析（取决于发布方是否开启显示） */
export default function ExamResult() {
  const { id = '', answerId = '' } = useParams();
  const [data, setData] = useState<PublicExamResult>();
  const [loading, setLoading] = useState(true);

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

  const questions = useMemo(() => (data?.schema ? flattenSchema(data.schema) : []), [data]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 60 }}>
        <Empty description="没有找到这份答卷，或发布方未开放成绩单" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>RESULT / 成绩单</div>
        <div className="bp-title" style={{ fontSize: 18, margin: '8px 0' }}>
          {data.name || '答卷'}
        </div>
        {typeof data.examScore === 'number' && (
          <div style={{ fontSize: 28, color: 'var(--bp-orange)' }}>{data.examScore} 分</div>
        )}
        {typeof data.rank === 'number' && (
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginTop: 4 }}>排名第 {data.rank}</div>
        )}
      </div>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}>
        {questions.length === 0 ? (
          <Empty description="发布方没有开放逐题答案" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Collapse
            size="small"
            defaultActiveKey={questions.slice(0, 3).map((q) => q.id)}
            items={questions.map((q) => ({
              key: q.id,
              label: (
                <span style={{ fontSize: 12 }}>
                  {q.number}. {q.title || q.type}
                </span>
              ),
              children: (
                <div style={{ fontSize: 12, lineHeight: 1.9 }}>
                  <div>你的答案：{formatValue(data.schema, q.id, (data.answer ?? {})[q.id])}</div>
                  {q.schema.attribute?.examCorrectAnswer && (
                    <div style={{ color: 'var(--bp-orange)' }}>正确答案：{q.schema.attribute.examCorrectAnswer}</div>
                  )}
                  {q.schema.attribute?.examAnalysis && (
                    <div style={{ color: 'var(--bp-text-soft)' }}>解析：{q.schema.attribute.examAnalysis}</div>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
}
