import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, Checkbox, Segmented, Select, Spin, Typography, message } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { download, getProject } from '../../api';
import type { SurveySchema } from '../../schema/types';

const LETTERS = 'ABCDEFGH';

interface PrintBlock {
  key: string;
  node: ReactNode;
  breakBefore?: boolean;
}

function stripHtml(text?: string) {
  return (text || '').replace(/<[^>]+>/g, '').trim();
}

function QuestionBlock({ question, number, answerArea }: { question: SurveySchema; number: number; answerArea: 'line' | 'blank' }) {
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
          {answerArea === 'line'
            ? [0, 1, 2].map((line) => <div key={line} style={{ borderBottom: '1px solid #000', height: 24 }} />)
            : <div style={{ height: 72 }} />}
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

const OBJECTIVE_TYPES = new Set(['Radio', 'Checkbox', 'Judge', 'FillBlank', 'Select', 'HorzBlank']);

function AnswerCard({ questions }: { questions: SurveySchema[] }) {
  return (
    <section>
      <h2 style={{ fontSize: 15, margin: '0 0 10px' }}>答题卡</h2>
      <div style={{ display: 'flex', gap: 24, fontSize: 12, marginBottom: 10 }}>
        <span>姓名：____________</span>
        <span>考号：____________</span>
        <span>班级：____________</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          borderTop: '1px solid #000',
          borderLeft: '1px solid #000',
        }}
      >
        {questions.map((question, index) => (
          <div
            key={question.id}
            style={{
              display: 'flex',
              height: 34,
              borderRight: '1px solid #000',
              borderBottom: '1px solid #000',
            }}
          >
            <span
              style={{
                width: 22,
                flex: '0 0 22px',
                borderRight: '1px solid #000',
                fontSize: 10,
                lineHeight: '32px',
                textAlign: 'center',
              }}
            >
              {index + 1}
            </span>
            <span style={{ flex: 1 }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, marginTop: 6 }}>请把答案填写在对应题号的格子里。</div>
    </section>
  );
}

function ObjectiveAnswerGrid({ items }: { items: { number: number; answer: string }[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        borderTop: '1px solid #000',
        borderLeft: '1px solid #000',
        marginBottom: 10,
      }}
    >
      {items.map((item) => (
        <div
          key={item.number}
          style={{
            borderRight: '1px solid #000',
            borderBottom: '1px solid #000',
            padding: '4px 6px',
            fontSize: 11,
          }}
        >
          {item.number}. {item.answer || '—'}
        </div>
      ))}
    </div>
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
  const [showInfo, setShowInfo] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [sealLine, setSealLine] = useState(false);
  const [pageNumber, setPageNumber] = useState(true);
  const [answerArea, setAnswerArea] = useState<'line' | 'blank'>('line');
  const [margin, setMargin] = useState<'standard' | 'wide'>('standard');
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
    const headerTitle = project?.survey?.attribute?.headerTitle || title;
    const headerSubtitle = project?.survey?.attribute?.headerSubtitle;
    const headerInfo = project?.survey?.attribute?.examHeaderInfo || '姓名：____________　考号：____________　得分：________';
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
    if (showCode) {
      list.push({
        key: 'code',
        node: <div style={{ textAlign: 'right', fontSize: 11, marginBottom: 4 }}>试卷代码：SK-{id.toUpperCase()}</div>,
      });
    }
    list.push({
      key: 'title',
      node: <h1 style={{ textAlign: 'center', fontSize: 22, margin: '0 0 6px' }}>{headerTitle}</h1>,
    });
    if (headerSubtitle) {
      list.push({
        key: 'subtitle',
        node: <div style={{ textAlign: 'center', fontSize: 12, marginBottom: 8 }}>{headerSubtitle}</div>,
      });
    }
    if (showInfo) {
      list.push({
        key: 'info',
        node: (
          <div style={{ textAlign: 'center', fontSize: 13, marginBottom: 18 }}>
            {headerInfo}
          </div>
        ),
      });
    }

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
          node: <QuestionBlock question={question} number={number} answerArea={answerArea} />,
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
      const objective = questions
        .map((question, index) => ({ number: index + 1, question }))
        .filter((item) => OBJECTIVE_TYPES.has(item.question.type))
        .map((item) => ({ number: item.number, answer: answerOf(item.question) }));
      for (let i = 0; i < objective.length; i += 80) {
        list.push({
          key: 'answer-grid-' + i,
          node: <ObjectiveAnswerGrid items={objective.slice(i, i + 80)} />,
        });
      }
      const essays = questions
        .map((question, index) => ({ number: index + 1, question }))
        .filter((item) => item.question.type === 'Textarea');
      if (essays.length) {
        list.push({
          key: 'essay-title',
          node: <h3 style={{ fontSize: 14, margin: '6px 0' }}>简答题参考答案</h3>,
        });
        for (const item of essays) {
          list.push({
            key: 'essay-' + item.question.id,
            node: (
              <div style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 6 }}>
                {item.number}. {answerOf(item.question) || '（略）'}
              </div>
            ),
          });
        }
      }
    }
    return list;
  }, [project, groups, questions, showCard, showAnswers, answerArea, showInfo, showCode, id]);

  const marginMm = margin === 'wide' ? 22 : 18;

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll('[data-block]')) as HTMLElement[];
    // 预留 24px 缓冲，避免字体/行高取整把最后一行挤出页面
    const pageHeight = ((297 - marginMm * 2) * 96) / 25.4 - 24;
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
      // 外层 wrapper 不含内层题目的 marginBottom，单独补上，否则分页会多塞 1-2 题
      const child = el.firstElementChild as HTMLElement | null;
      const childStyle = child ? getComputedStyle(child) : null;
      const margin = childStyle
        ? (parseFloat(childStyle.marginTop) || 0) + (parseFloat(childStyle.marginBottom) || 0)
        : 0;
      const height = el.getBoundingClientRect().height + margin;
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
  }, [blocks, marginMm]);

  const safePages = useMemo(
    () => pages.map((page) => page.filter((index) => Boolean(blocks[index]))).filter((page) => page.length > 0),
    [pages, blocks],
  );

  const sheets = useMemo(() => {
    if (size === 'A3') {
      const result: number[][][] = [];
      for (let i = 0; i < safePages.length; i += 2) result.push(safePages.slice(i, i + 2));
      return result;
    }
    return safePages.map((page) => [page]);
  }, [safePages, size]);

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
    '@media print { html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; } .no-print { display: none !important; } .print-root { padding: 0 !important; background: #fff !important; min-height: 0 !important; } .print-scroll { overflow: visible !important; } .sheet { box-shadow: none !important; margin: 0 !important; break-after: page; } } @page { size: ' +
    (size === 'A3' ? 'A3 landscape' : 'A4') +
    '; margin: 0; }';
  const sheetStyle = size === 'A3'
    ? { width: '420mm', height: '297mm', display: 'flex', margin: '0 auto 16px', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,.12)' }
    : { width: '210mm', height: '297mm', margin: '0 auto 16px', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,.12)' };
  const pageStyle = { width: '210mm', height: '297mm', padding: marginMm + 'mm', boxSizing: 'border-box' as const, position: 'relative' as const, overflow: 'hidden' as const };

  return (
    <div className="print-root" style={{ background: '#eef1f5', minHeight: '100vh', padding: '16px 0 40px' }}>
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
        <Checkbox checked={showInfo} onChange={(e) => setShowInfo(e.target.checked)}>试卷信息</Checkbox>
        <Checkbox checked={showCode} onChange={(e) => setShowCode(e.target.checked)}>试卷代码</Checkbox>
        <Checkbox checked={sealLine} onChange={(e) => setSealLine(e.target.checked)}>密封线</Checkbox>
        <Checkbox checked={pageNumber} onChange={(e) => setPageNumber(e.target.checked)}>页码</Checkbox>
        <Select
          size="small"
          style={{ width: 110 }}
          value={answerArea}
          onChange={(value) => setAnswerArea(value as 'line' | 'blank')}
          options={[{ label: '答题区横线', value: 'line' }, { label: '答题区留白', value: 'blank' }]}
        />
        <Select
          size="small"
          style={{ width: 110 }}
          value={margin}
          onChange={(value) => setMargin(value as 'standard' | 'wide')}
          options={[{ label: '页边距标准', value: 'standard' }, { label: '页边距宽松', value: 'wide' }]}
        />
        <Typography.Text type="secondary">
          {size === 'A3' ? 'A3 = 横向，两张 A4 拼在一张上' : 'A4 单页'}
        </Typography.Text>
      </div>

      <div className="print-scroll" style={{ overflowX: 'auto' }}>
        <div ref={measureRef} style={{ position: 'absolute', left: -99999, top: 0, width: (210 - marginMm * 2) + 'mm', visibility: 'hidden' }}>
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
                <div key={pageIndex} className="a4-page" style={pageStyle}>
                  {sealLine && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '2mm',
                        top: '30mm',
                        bottom: '30mm',
                        writingMode: 'vertical-rl',
                        fontSize: 11,
                        letterSpacing: 4,
                      }}
                    >
                      密封线内不要答题
                    </div>
                  )}
                  {page.map((blockIndex) => {
                    const block = blocks[blockIndex];
                    return block ? <div key={block.key}>{block.node}</div> : null;
                  })}
                  {pageNumber && (
                    <div style={{ position: 'absolute', bottom: '8mm', left: 0, right: 0, textAlign: 'center', fontSize: 11 }}>
                      第 {globalPage} 页 / 共 {safePages.length} 页
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
