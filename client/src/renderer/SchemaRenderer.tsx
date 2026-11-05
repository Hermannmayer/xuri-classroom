import { Fragment, useMemo, type CSSProperties, type ReactNode } from 'react';
import { flattenSchema } from '../schema/flatten';
import { DATA_TYPES, type SurveySchema } from '../schema/types';
import { getQuestionComponent } from './registry';
import type { AnswerValue, RenderMode } from './types';

export interface SchemaRendererProps {
  schema: SurveySchema;
  values: Record<string, AnswerValue>;
  onChange: (qId: string, value: AnswerValue) => void;
  mode: RenderMode;
  /** 规则求值结果：false 的节点整题不渲染 */
  displays?: Record<string, boolean>;
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

export function SchemaRenderer({ schema, values, onChange, mode, displays }: SchemaRendererProps) {
  // 题号只对数据题递增，交给 flattenSchema 统一算，避免与设计器大纲/规则引用的编号漂移
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of flattenSchema(schema)) {
      if (q.number !== undefined) map.set(q.id, q.number);
    }
    return map;
  }, [schema]);

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
              {node.title ? <div style={styles.groupTitle}>{node.title}</div> : null}
              {renderNodes(node.children)}
            </section>
          );
        case 'Remark':
          // 富文本由问卷设计者编写，与旧版一致直出 HTML；若日后接入用户可写来源，需要先消毒
          return node.attribute?.content ? (
            <div
              key={node.id}
              style={styles.remark}
              data-node-id={node.id}
              dangerouslySetInnerHTML={{ __html: node.attribute.content }}
            />
          ) : null;
        case 'SplitLine':
          return <hr key={node.id} style={styles.splitLine} />;
        default:
          // Survey / Pagination（以及 Option / RandomSurvey 这类纯容器）直接下钻
          return <Fragment key={node.id}>{renderNodes(node.children)}</Fragment>;
      }
    }

    const Question = getQuestionComponent(node.type);
    const number = numbers.get(node.id);

    // 已注册的题型自带外壳（题号/标题/必填/描述），这里只留间距容器，避免渲染两遍
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

    // 未注册：外壳照常显示题目信息，下面挂橙色占位框
    return (
      <div key={node.id} style={styles.question} data-qid={node.id} data-type={node.type}>
        <div style={styles.titleRow}>
          {number !== undefined && <span className="bp-tag">{number}</span>}
          <span style={styles.title}>{node.title}</span>
          {node.attribute?.required && <span style={styles.required}>*</span>}
        </div>
        {node.description && <div style={styles.description}>{node.description}</div>}
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
