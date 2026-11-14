import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Segmented, Spin, Typography, message } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { download, getProject } from '../../api';
import type { SurveySchema } from '../../schema/types';

const LETTERS = 'ABCDEFGH';

const PRINT_CSS =
  '@media print { .no-print { display: none !important; } body { background: #fff !important; } .paper { box-shadow: none !important; margin: 0 !important; } } @page { margin: 16mm 14mm; }';

/** 试卷打印页：A4/A3、答案页、答题卡，浏览器打印即 PDF */
export default function SurveyPrintPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<{ name?: string; survey?: SurveySchema } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(searchParams.get('answers') === '1');
  const [showCard, setShowCard] = useState(searchParams.get('card') === '1');
  const [size, setSize] = useState<'A4' | 'A3'>('A4');

  useEffect(() => {
    setLoading(true);
    getProject(id)
      .then((res) => setProject(res as { name?: string; survey?: SurveySchema }))
      .catch((e: Error) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const groups = useMemo(() => {
    const children = project?.survey?.children ?? [];
    return children.filter((node) => node.type === 'QuestionSet' || node.type === 'Survey');
  }, [project]);

  const questions = useMemo(() => {
    const list: SurveySchema[] = [];
    for (const group of groups) for (const question of group.children ?? []) list.push(question);
    return list;
  }, [groups]);

  const optionLabel = (question: SurveySchema, optionId?: string) => {
    const index = (question.children ?? []).findIndex((child) => child.id === optionId);
    return index >= 0 ? LETTERS[index] : '';
  };

  const answerOf = (question: SurveySchema) => {
    if (question.type === 'Radio' || question.type === 'Checkbox' || question.type === 'Judge') {
      return (question.children ?? [])
        .filter((child) => child.attribute?.examCorrectAnswer)
        .map((child) => optionLabel(question, child.id))
        .join('');
    }
    return (question.children ?? [])
      .map((child) => child.attribute?.examCorrectAnswer)
      .filter(Boolean)
      .join(' / ');
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }
  if (!project) return null;

  const title = project.survey?.title || project.name || '试卷';
  let number = 0;

  return (
    <div style={{ background: '#eef1f5', minHeight: '100vh', padding: '16px 0 40px' }}>
      <style>{PRINT_CSS + ' @page { size: ' + size + '; }'}</style>

      <div
        className="no-print"
        style={{ maxWidth: 820, margin: '0 auto 12px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Button onClick={() => navigate('/survey/' + id + '/edit')}>返回编辑</Button>
        <Button type="primary" onClick={() => window.print()}>
          打印 / 另存 PDF
        </Button>
        <Button
          onClick={() =>
            void download('/api/paper/' + id + '/docx', { answers: showAnswers, card: showCard }, title + '.docx').catch(
              (e: Error) => message.error(e.message),
            )
          }
        >
          下载 Word
        </Button>
        <Segmented value={size} onChange={(value) => setSize(value as 'A4' | 'A3')} options={['A4', 'A3']} />
        <Checkbox checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)}>
          附答案页
        </Checkbox>
        <Checkbox checked={showCard} onChange={(e) => setShowCard(e.target.checked)}>
          附答题卡
        </Checkbox>
        <Typography.Text type="secondary">A3 仅切换纸张尺寸，不做双页拼版</Typography.Text>
      </div>

      <div
        className="paper"
        style={{
          width: 760,
          margin: '0 auto',
          background: '#fff',
          padding: '40px 48px',
          boxShadow: '0 2px 12px rgba(0,0,0,.12)',
          color: '#000',
        }}
      >
        <h1 style={{ textAlign: 'center', fontSize: 22, margin: '0 0 6px' }}>{title}</h1>
        <div style={{ textAlign: 'center', fontSize: 13, marginBottom: 18 }}>
          姓名：____________　考号：____________　得分：________
        </div>

        {groups.map((group) => (
          <section key={group.id} style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>{group.title}</h2>
            {(group.children ?? []).map((question) => {
              number += 1;
              const options = question.children ?? [];
              return (
                <div key={question.id} style={{ marginBottom: 12, breakInside: 'avoid' }}>
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                    {number}. {question.title}
                    {question.type === 'Judge' && '（　　）'}
                  </div>
                  {options.length > 0 && question.type !== 'Textarea' && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '2px 24px',
                        paddingLeft: 18,
                        fontSize: 13,
                        lineHeight: 1.8,
                      }}
                    >
                      {options.map((option, index) => (
                        <span key={option.id}>
                          {LETTERS[index]}. {option.title}
                        </span>
                      ))}
                    </div>
                  )}
                  {question.type === 'Textarea' && (
                    <div style={{ paddingLeft: 18, marginTop: 4 }}>
                      {[0, 1, 2].map((line) => (
                        <div key={line} style={{ borderBottom: '1px solid #000', height: 24 }} />
                      ))}
                    </div>
                  )}
                  {question.type === 'FillBlank' && (
                    <div style={{ paddingLeft: 18, fontSize: 12 }}>
                      {options.map((option, index) => (
                        <span key={option.id} style={{ marginRight: 16 }}>
                          （{index + 1}）____________
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}

        {showCard && (
          <section style={{ breakBefore: 'page', marginTop: 24 }}>
            <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>答题卡</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: 4, width: 60 }}>题号</th>
                  {questions.map((_, index) => (
                    <th key={index} style={{ border: '1px solid #000', padding: 4 }}>
                      {index + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: 4 }}>答案</td>
                  {questions.map((question) => (
                    <td key={question.id} style={{ border: '1px solid #000', padding: 4, height: 26 }} />
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {showAnswers && (
          <section style={{ breakBefore: 'page', marginTop: 24 }}>
            <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>参考答案</h2>
            {questions.map((question, index) => (
              <div key={question.id} style={{ fontSize: 12, lineHeight: 1.9 }}>
                {index + 1}. {answerOf(question) || '（略）'}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
