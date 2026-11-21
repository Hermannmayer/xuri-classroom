import { Fragment, useMemo, type CSSProperties, type ReactNode } from 'react';
import RichTextContent from '../components/RichTextContent';
import { flattenSchema } from '../schema/flatten';
import { DATA_TYPES, type SurveySchema } from '../schema/types';
import { getQuestionComponent } from './registry';
import { TitleContent } from './questions/shared';
import type { AnswerValue, RenderMode } from './types';

export interface SchemaRendererProps {
  schema: SurveySchema;
  values: Record<string, AnswerValue>;
  onChange: (qId: string, value: AnswerValue) => void;
  mode: RenderMode;

  displays?: Record<string, boolean>;

  numberOffset?: number;
}

const styles = {
  question: { marginBottom: 20 },
  titleRow: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 14, lineHeight: 1.5 },
  required: { color: 'var(--bp-orange)' },
  description: {
    marginTop: 4,
    fontSize: 12,
    color: 'var(--bp-text-soft)',
    whiteSpace: 'pre-wrap',
  },
  body: { marginTop: 8 },
  group: {
    border: '1px dashed var(--bp-line)',
    padding: '14px 16px 2px',
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 11,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--bp-text-soft)',
    marginBottom: 12,
  },
  remark: { marginBottom: 16, fontSize: 13, lineHeight: 1.7 },
  splitLine: {
    border: 0,
    borderTop: '1px dashed var(--bp-line)',
    margin: '2px 0 20px',
  },
  placeholder: {
    border: '1px dashed var(--bp-orange)',
    color: 'var(--bp-orange)',
    padding: '10px 12px',
    fontSize: 11,
    letterSpacing: '0.08em',
  },
} satisfies Record<string, CSSProperties>;

export function SchemaRenderer({ schema, values, onChange, mode, displays, numberOffset = 0 }: SchemaRendererProps) {
  // 题号只对数据题递增，交给 flattenSchema 统一算，避免与设计器大纲/规则引用的编号漂移
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of flattenSchema(schema)) {
      if (q.number !== undefined) map.set(q.id, q.number + numberOffset);
    }
    return map;
  }, [schema, numberOffset]);

  function renderNodes(nodes?: SurveySchema[]): ReactNode[] {
    return (nodes ?? []).map(renderNode);
  }

  function renderNode(node: SurveySchema): ReactNode {
    if (displays?.[node.id] === false) return null;

    if (!DATA_TYPES.has(node.type)) {
      switch (node.type) {
        case 'QuestionSet':
          return (
            <section key={node.id} style={styles.group} data-node-id={node.id}>
              {node.title ? (
                <div style={styles.groupTitle}>
                  <TitleContent schema={node} />
                </div>
              ) : null}
              {renderNodes(node.children)}
            </section>
          );
        case 'Remark':


          return node.attribute?.content ? (
            <RichTextContent
              key={node.id}
              html={node.attribute.content}
              style={styles.remark}
            />
          ) : null;
        case 'SplitLine':
          return <hr key={node.id} style={styles.splitLine} />;
        default:

          return <Fragment key={node.id}>{renderNodes(node.children)}</Fragment>;
      }
    }

    const Question = getQuestionComponent(node.type);
    const number = numbers.get(node.id);


    if (Question) {
      return (
        <div key={node.id} style={styles.question} data-qid={node.id} data-type={node.type}>
          <Question
            schema={node}
            value={values[node.id]}
            onChange={(value) => onChange(node.id, value)}
            mode={mode}
            number={number}
          />
        </div>
      );
    }


    return (
      <div key={node.id} style={styles.question} data-qid={node.id} data-type={node.type}>
        <div style={styles.titleRow}>
          {number !== undefined && <span className="bp-tag">{number}</span>}
          <span style={styles.title}>
            <TitleContent schema={node} />
          </span>
          {node.attribute?.required && <span style={styles.required}>*</span>}
        </div>
        {node.description && (
          <RichTextContent
            html={node.description}
            style={{ ...styles.description, whiteSpace: 'pre-wrap' }}
          />
        )}
        <div style={styles.body}>
          <div style={styles.placeholder} data-unregistered={node.type}>
            [未注册题型] {node.type}
          </div>
        </div>
      </div>
    );
  }

  return <div className="sk-renderer">{renderNodes(schema.children)}</div>;
}

export default SchemaRenderer;
