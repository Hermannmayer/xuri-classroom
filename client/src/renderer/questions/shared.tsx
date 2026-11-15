import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { FlagFilled, FlagOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import DOMPurify from 'dompurify';
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

/** 题目收藏：答题页 / 练习页注入；null 时不渲染收藏按钮。 */
export interface QuestionFavoriteApi {
  enabled: boolean;
  /** 一页一题模式由底部操作条渲染，题干旁不重复 */
  showInline: boolean;
  isFavorite: (questionId: string) => boolean;
  toggleFavorite: (schema: SurveySchema) => void;
}

export const QuestionFavoriteContext = createContext<QuestionFavoriteApi | null>(null);

/**
 * 题干：普通题直接出文本；带 richTitle 的题（Word 导入含图片）按富文本消毒后渲染。
 */
export function TitleContent({ schema }: { schema: SurveySchema }) {
  if (!schema.title) {
    return <span style={{ color: 'var(--bp-text-soft)' }}>未命名题目</span>;
  }
  if (schema.attribute?.richTitle) {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(schema.title, { ADD_TAGS: ['img'], ADD_ATTR: ['src', 'alt', 'style'] }),
        }}
      />
    );
  }
  return <>{schema.title}</>;
}

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
  const favoriteApi = useContext(QuestionFavoriteContext);
  const marked = markApi?.isMarked(schema.id) ?? false;
  const favorited = favoriteApi?.isFavorite(schema.id) ?? false;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {number !== undefined && <span className="bp-tag">{String(number).padStart(2, '0')}</span>}
        <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--sk-stem-size, 14px)', letterSpacing: '0.02em' }}>
          {schema.attribute?.required && (
            <span style={{ color: 'var(--bp-orange)', marginRight: 4 }}>*</span>
          )}
          <TitleContent schema={schema} />
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
        {favoriteApi?.enabled && favoriteApi.showInline && (
          <button
            type="button"
            className={favorited ? 'sk-mark marked' : 'sk-mark'}
            onClick={() => favoriteApi.toggleFavorite(schema)}
            aria-pressed={favorited}
            title={favorited ? '取消收藏' : '收藏这道题，练习册里可以再做'}
          >
            {favorited ? <StarFilled /> : <StarOutlined />}
            <span className="sk-mark-text">{favorited ? '已收藏' : '收藏'}</span>
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
            whiteSpace: 'pre-wrap',
          }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(schema.description) }}
        />
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
