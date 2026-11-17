import { useState } from 'react';
import { Input } from 'antd';
import type { QuestionComponentProps } from '../types';
import { QuestionFrame, questionA11yIds, useAnswerState } from './shared';
import { blankAnswer, blankId, blankText, inputRule } from './answers';

/**
 * 填空：answer = { [空位id]: 文本 }
 * 输入过滤在 onChange / onCompositionEnd / onPaste 三处都做一遍，
 * 否则中文输入法组合期间和粘贴进来的非法字符会漏过。
 */
export default function FillBlank(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const [error, setError] = useState<string>();
  const id = blankId(schema);
  const text = blankText(answer, id);
  const rule = inputRule(schema.attribute?.dataType, schema.attribute?.textLimit);
  const readOnly = mode === 'edit' || Boolean(disabled);
  // 输入框的无障碍名称指向题干：读屏聚焦时先念题目，不只剩一句「编辑框」
  const { labelId, descId } = questionA11yIds(schema);

  const sanitize = (raw: string) => (rule.filter ? rule.filter(raw) : raw);
  const commit = (raw: string) => {
    const clean = sanitize(raw);
    setAnswer(blankAnswer(id, clean));
    if (error) setError(undefined);
    return clean;
  };

  return (
    <QuestionFrame schema={schema} number={number}>
      <Input
        style={{ maxWidth: 380 }}
        aria-labelledby={labelId}
        aria-describedby={descId}
        aria-invalid={error ? true : undefined}
        value={text}
        placeholder={schema.attribute?.placeholder || '请输入'}
        disabled={readOnly}
        maxLength={rule.maxLength}
        inputMode={rule.inputMode}
        type={rule.inputMode === 'tel' || rule.inputMode === 'numeric' || rule.inputMode === 'decimal' ? 'tel' : 'text'}
        status={error ? 'error' : undefined}
        onChange={(e) => {
          const clean = commit(e.target.value);
          // 受控值要等 React 回写，这里同步纠正 DOM，组合输入期间也能立刻挡掉
          if (clean !== e.target.value) e.target.value = clean;
        }}
        onCompositionEnd={(e) => {
          const el = e.target as HTMLInputElement;
          const clean = commit(el.value);
          if (clean !== el.value) el.value = clean;
        }}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text');
          const clean = sanitize(pasted);
          if (clean !== pasted) {
            e.preventDefault();
            commit(`${text}${clean}`);
          }
        }}
        onBlur={() => !readOnly && setError(rule.validate?.(text))}
      />
      {/* 校验提示容器常驻 + role="status"：错误出现/变化时读屏会播报（3.3.1 错误识别 + 4.1.3 状态消息） */}
      <div
        role="status"
        aria-live="polite"
        style={{ color: 'var(--bp-orange)', fontSize: 11, marginTop: error ? 4 : 0 }}
      >
        {error}
      </div>
    </QuestionFrame>
  );
}
