import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { FlagFilled, FlagOutlined } from '@ant-design/icons';
import type { SurveySchema } from '../../schema/types';
import type { AnswerValue, QuestionComponentProps } from '../types';

/**
 * 题目标记（只给答题页用）：答题页用 Provider 注入，设计器 / 预览页没有 Provider，
 * QuestionFrame 就不渲染标记按钮 —— 共用组件的默认行为完全不变。
 * 标记状态本身存在答题页（localStorage），这里只负责渲染与回调。
 */
export interface QuestionMarkApi {
  isMarked: (questionId: string) => boolean;
  toggle: (questionId: string) => void;
}

export const QuestionMarkContext = createContext<QuestionMarkApi | null>(null);

/**
 * 题目外壳：题号 + 标题 + 必填标记 + description。
 * 题型组件自带外壳，渲染层（SchemaRenderer）只负责布局与显隐，避免重复渲染标题。
 *
 * 题干字号 / 题干与选项的间距走 CSS 变量，默认值 = 设计器与预览页原有的视觉；
 * 答题页在 styles/answer.css 的 .sk-answer 作用域里把它们调大，互不影响。
 */
export function QuestionFrame({
  schema,
  number,
  children,
}: {
  schema: SurveySchema;
  number?: number;
  children: ReactNode;
}) {
  const indent = number === undefined ? 0 : 34;
  const markApi = useContext(QuestionMarkContext);
  const marked = markApi?.isMarked(schema.id) ?? false;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {number !== undefined && <span className="bp-tag">{String(number).padStart(2, '0')}</span>}
        <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--sk-stem-size, 14px)', letterSpacing: '0.02em' }}>
          {schema.attribute?.required && (
            <span style={{ color: 'var(--bp-orange)', marginRight: 4 }}>*</span>
          )}
          {schema.title || <span style={{ color: 'rgba(160,196,232,0.45)' }}>未命名题目</span>}
        </span>
        {markApi && (
          <button
            type="button"
            className={marked ? 'sk-mark marked' : 'sk-mark'}
            onClick={() => markApi.toggle(schema.id)}
            aria-pressed={marked}
            title={marked ? '取消标记' : '标记这道题，最后回来看'}
          >
            {marked ? <FlagFilled /> : <FlagOutlined />}
            <span className="sk-mark-text">{marked ? '已标记' : '标记'}</span>
          </button>
        )}
      </div>
      {schema.description && (
        <div
          style={{
            marginTop: 6,
            paddingLeft: indent,
            fontSize: 12,
            lineHeight: 1.7,
            color: 'var(--bp-text-soft)',
          }}
        >
          {schema.description}
        </div>
      )}
      <div style={{ marginTop: 'var(--sk-stem-gap, 10px)', paddingLeft: indent }}>{children}</div>
    </div>
  );
}

/** dataSource 为空时给设计器一个明确信号 */
export function EmptyOptions() {
  return <div style={{ fontSize: 12, color: 'var(--bp-orange)' }}>未配置选项（dataSource 为空）</div>;
}

/**
 * 三态取值：
 * - answer：受控，onChange 写回外部
 * - preview：内部 state，影响不到外部
 * - edit：只读（输入组件由调用方 disabled）
 */
export function useAnswerState(props: QuestionComponentProps) {
  const { value, onChange, mode, schema } = props;
  const [draft, setDraft] = useState<AnswerValue>(value);

  // 设计器/预览里切题时清掉上一题残留；答题态本来就是受控的
  useEffect(() => {
    if (mode !== 'answer') setDraft(value);
  }, [value, schema.id, mode]);

  const update = (next: AnswerValue) => {
    if (mode === 'answer') onChange(next);
    else setDraft(next);
  };

  return [mode === 'answer' ? value : draft, update] as const;
}
