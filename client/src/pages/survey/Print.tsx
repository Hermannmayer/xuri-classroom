import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, Checkbox, Segmented, Spin, Typography, message } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { download, getProject } from '../../api';
import type { SurveySchema } from '../../schema/types';

const LETTERS = 'ABCDEFGH';
const CONTENT_HEIGHT_MM = 267;

interface PrintBlock {
  key: string;
  node: ReactNode;
  breakBefore?: boolean;
}

function stripHtml(text?: string) {
  return (text || '').replace(/<[^>]+>/g, '').trim();
}

function QuestionBlock({ question, number }: { question: SurveySchema; number: number }) {
  const options = question.children ?? [];
  return (
    <div style={{ marginBottom: 12, breakInside: 'avoid' }}>
      <div style={{ fontSize: 14, lineHeight: 1.7 }}>
        {number}. {stripHtml(question.title)}
        {question.type === 'Judge' && '（　　）'}
      </div>
      {options.length > 0 && question.type !== 'Textarea' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 24px', paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
          {options.map((option, index) => (
            <span key={option.id}>
              {LETTERS[index]}. {stripHtml(option.title)}
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
      {question.type === 'FillBlank' && options.length > 0 && (
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
}

function AnswerCard({ questions }: { questions: SurveySchema[] }) {
  return (
    <section>
      <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>答题卡</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
        {questions.map((question, index) => (
          <div key={question.id} style={{ border: '1px solid #000', padding: '5px 6px', fontSize: 11 }}>
            {index + 1}. ______
          </div>
        ))}
      </div>
    </section>
  );
}

/** 试卷打印：先按 A4 内容高度分页，A3 再把两页拼成一张 */
export default function SurveyPrintPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<{ name?: string; survey?: SurveySchema } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(searchParams.get('answers') === '1');
  const [showCard, setShowCard] = useState(searchParams.get('card') === '1');
  const [size, setSize] = useState<'A4' | 'A3'>('A4');
  const [pages, setPages] = useState<number[][]>([]);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getProject(id)
      .then((res) => setProject(res as { name?: string; survey?: SurveySchema }))
      .catch((e: Error) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const groups = useMemo(() => {
    const containers = new Set(['Survey', 'QuestionSet', 'Pagination', 'Remark', 'SplitLine', 'Option', 'RandomSurvey']);
    const result: { id: string; title?: string; children?: SurveySchema[] }[] = [];
    const flat: SurveySchema[] = [];
    const walk = (nodes?: SurveySchema[]) => {
      for (const node of nodes ?? []) {
        if (node.type === 'QuestionSet') {
          if ((node.children ?? []).length) result.push(node);
        } else if (node.type === 'Survey' || node.type === 'Pagination') {
          walk(node.children);
        } else if (!containers.has(node.type)) {
          flat.push(node);
        }
      }
    };
    walk(project?.survey?.children);
    if (flat.length) result.push({ id: '__flat', title: '', children: flat });
    return result;
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

  const blocks = useMemo<PrintBlock[]>(() => {
    const list: PrintBlock[] = [];
    const title = project?.survey?.title || project?.name || '试卷';
    if (project?.survey?.attribute?.headerImage) {
      list.push({
        key: 'header',
        node: (
          <img
            src={project.survey.attribute.headerImage}
            alt="页眉"
            style={{ width: '100%', display: 'block', marginBottom: 12 }}
          />
        ),
      });
    }
    list.push({
      key: 'title',
      node: <h1 style={{ textAlign: 'center', fontSize: 22, margin: '0 0 6px' }}>{title}</h1>,
    });
    list.push({
      key: 'info',
      node: (
        <div style={{ textAlign: 'center', fontSize: 13, marginBottom: 18 }}>
          姓名：____________　考号：____________　得分：________
        </div>
      ),
    });

    let number = 0;
    for (const group of groups) {
      if (group.title) {
        list.push({
          key: 'group-' + group.id,
          node: <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>{stripHtml(group.title)}</h2>,
        });
      }
      for (const question of group.children ?? []) {
        number += 1;
        list.push({
          key: question.id,
          node: <QuestionBlock question={question} number={number} />,
        });
      }
    }

    if (showCard) {
      list.push({ key: 'card', breakBefore: true, node: <AnswerCard questions={questions} /> });
    }
    if (showAnswers) {
      list.push({
        key: 'answers-title',
        breakBefore: true,
        node: <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>参考答案</h2>,
      });
      questions.forEach((question, index) => {
        list.push({
          key: 'answer-' + question.id,
          node: (
            <div style={{ fontSize: 12, lineHeight: 1.9 }}>
              {index + 1}. {answerOf(question) || '（略）'}
            </div>
          ),
        });
      });
    }
    return list;
  }, [project, groups, questions, showCard, showAnswers]);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll('[data-block]')) as HTMLElement[];
    const pageHeight = (CONTENT_HEIGHT_MM * 96) / 25.4;
    const next: number[][] = [];
    let current: number[] = [];
    let used = 0;
    blocks.forEach((block, index) => {
      if (block.breakBefore && current.length) {
        next.push(current);
        current = [];
        used = 0;
      }
      const el = nodes[index];
      if (!el) return;
      const style = getComputedStyle(el);
      const height = el.getBoundingClientRect().height + (parseFloat(style.marginBottom) || 0);
      if (current.length && used + height > pageHeight) {
        next.push(current);
        current = [];
        used = 0;
      }
      current.push(index);
      used += height;
    });
    if (current.length) next.push(current);
    setPages(next);
  }, [blocks]);

  const sheets = useMemo(() => {
    if (size === 'A3') {
      const result: number[][][] = [];
      for (let i = 0; i < pages.length; i += 2) result.push(pages.slice(i, i + 2));
      return result;
    }
    return pages.map((page) => [page]);
  }, [pages, size]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }
  if (!project) return null;

  const title = project.survey?.title || project.name || '试卷';
  const printCss =
    '@media print { .no-print { display: none !important; } body { background: #fff !important; } .sheet { box-shadow: none !important; margin: 0 !important; break-after: page; } } @page { size: ' +
    (size === 'A3' ? 'A3 landscape' : 'A4') +
    '; margin: 0; }';
  const sheetStyle = size === 'A3'
    ? { width: '420mm', height: '297mm', display: 'flex', margin: '0 auto 16px', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,.12)' }
    : { width: '210mm', height: '297mm', margin: '0 auto 16px', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,.12)' };
  const pageStyle = { width: '210mm', height: '297mm', padding: '15mm', boxSizing: 'border-box' as const, position: 'relative' as const, overflow: 'hidden' as const };

  return (
    <div style={{ background: '#eef1f5', minHeight: '100vh', padding: '16px 0 40px' }}>
      <style>{printCss}</style>

      <div className="no-print" style={{ maxWidth: 900, margin: '0 auto 12px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button onClick={() => navigate('/survey/' + id + '/edit')}>返回编辑</Button>
        <Button type="primary" onClick={() => window.print()}>打印 / 另存 PDF</Button>
        <Button onClick={() => void download('/api/paper/' + id + '/docx', { answers: showAnswers, card: showCard }, title + '.docx').catch((e: Error) => message.error(e.message))}>
          下载 Word
        </Button>
        <Segmented value={size} onChange={(value) => setSize(value as 'A4' | 'A3')} options={['A4', 'A3']} />
        <Checkbox checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)}>附答案页</Checkbox>
        <Checkbox checked={showCard} onChange={(e) => setShowCard(e.target.checked)}>附答题卡</Checkbox>
        <Typography.Text type="secondary">
          {size === 'A3' ? 'A3 = 横向，两张 A4 拼在一张上' : 'A4 单页'}
        </Typography.Text>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div ref={measureRef} style={{ position: 'absolute', left: -99999, top: 0, width: '180mm', visibility: 'hidden' }}>
          {blocks.map((block) => (
            <div key={block.key} data-block>
              {block.node}
            </div>
          ))}
        </div>

        {sheets.map((sheet, sheetIndex) => (
          <div key={sheetIndex} className="sheet" style={sheetStyle}>
            {sheet.map((page, pageIndex) => {
              const globalPage = size === 'A3' ? sheetIndex * 2 + pageIndex + 1 : sheetIndex + 1;
              return (
                <div key={pageIndex} style={pageStyle}>
                  {page.map((blockIndex) => (
                    <div key={blocks[blockIndex].key}>{blocks[blockIndex].node}</div>
                  ))}
                  <div style={{ position: 'absolute', bottom: '8mm', left: 0, right: 0, textAlign: 'center', fontSize: 11 }}>
                    第 {globalPage} 页 / 共 {pages.length} 页
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
