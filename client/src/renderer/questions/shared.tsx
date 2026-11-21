import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { FlagFilled, FlagOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import DOMPurify from 'dompurify';
import RichTextContent from '../../components/RichTextContent';
import type { QuestionType, SurveySchema } from '../../schema/types';
import type { AnswerValue, QuestionComponentProps } from '../types';






export interface QuestionMarkApi {
  isMarked: (questionId: string) => boolean;
  toggle: (questionId: string) => void;
}

export const QuestionMarkContext = createContext<QuestionMarkApi | null>(null);


export interface QuestionFavoriteApi {
  enabled: boolean;

  showInline: boolean;
  isFavorite: (questionId: string) => boolean;
  toggleFavorite: (schema: SurveySchema) => void;
}

export const QuestionFavoriteContext = createContext<QuestionFavoriteApi | null>(null);

/**
 * 题干 / 描述的 DOM id：由 schema.id 派生。
 * QuestionFrame 生成它、各题型组件引用它，两边共用同一套规则 —— 各拼一遍字符串迟早会漂。
 */
export function questionLabelId(schemaId: string): string {
  return `sk-q-${schemaId}-label`;
}

export function questionDescId(schemaId: string): string {
  return `sk-q-${schemaId}-desc`;
}

/** 一次拿到某题的题干 / 描述 id；没有描述时 descId 为 undefined，避免挂一个指向空节点的引用 */
export function questionA11yIds(schema: SurveySchema): { labelId: string; descId?: string } {
  return {
    labelId: questionLabelId(schema.id),
    descId: schema.description ? questionDescId(schema.id) : undefined,
  };
}

/** 选项控件的 ARIA 角色：只有多选类读成 checkbox，其余（单选 / 判断 / NPS / 矩阵单选）都读成 radio */
function optionRoleOf(type: QuestionType): 'radio' | 'checkbox' {
  return type === 'Checkbox' || type === 'MatrixCheckbox' ? 'checkbox' : 'radio';
}





export interface QuestionA11y {

  labelId: string;

  descId?: string;

  optionRole: 'radio' | 'checkbox';
}

export const QuestionA11yContext = createContext<QuestionA11y | null>(null);

/** 外壳内层组件用：Provider 外调用返回 null（设计器里单独渲染某个子组件时不会拿到假 id） */
export function useQuestionA11y(): QuestionA11y | null {
  return useContext(QuestionA11yContext);
}

/** 只要题干 id 时的便捷写法 */
export function useQuestionLabelId(): string | undefined {
  return useContext(QuestionA11yContext)?.labelId;
}

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
 *
 * 无障碍：题干 span 挂稳定 id（questionLabelId），子控件用 aria-labelledby 指过来；
 * 描述节点挂 descId 供 aria-describedby 使用；同时把题干 id / 选项角色放进 Context，
 * 供外壳内层（选项列表、矩阵格子）直接取用，不用层层传参。
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

  const { labelId, descId } = questionA11yIds(schema);

  const a11y: QuestionA11y = { labelId, descId, optionRole: optionRoleOf(schema.type) };
  return (
    <QuestionA11yContext.Provider value={a11y}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {number !== undefined && <span className="bp-tag">{String(number).padStart(2, '0')}</span>}
          <span
            id={labelId}
            style={{ flex: 1, minWidth: 0, fontSize: 'var(--sk-stem-size, 14px)', letterSpacing: '0.02em' }}
          >
            {schema.attribute?.required && (
              <>

                <span aria-hidden="true" style={{ color: 'var(--bp-orange)', marginRight: 4 }}>*</span>
                <span className="sk-sr-only">（必填）</span>
              </>
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
        {schema.description && descId && (
          <div id={descId}>
            <RichTextContent
              html={schema.description}
              style={{
                marginTop: 6,
                paddingLeft: indent,
                fontSize: 12,
                lineHeight: 1.7,
                color: 'var(--bp-text-soft)',
                whiteSpace: 'pre-wrap',
              }}
            />
          </div>
        )}
        <div style={{ marginTop: 'var(--sk-stem-gap, 10px)', paddingLeft: indent }}>{children}</div>
      </div>
    </QuestionA11yContext.Provider>
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


  useEffect(() => {
    if (mode !== 'answer') setDraft(value);
  }, [value, schema.id, mode]);

  const update = (next: AnswerValue) => {
    if (mode === 'answer') onChange(next);
    else setDraft(next);
  };

  return [mode === 'answer' ? value : draft, update] as const;
}
