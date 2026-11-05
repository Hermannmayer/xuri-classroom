import { useState } from 'react';
import { Input } from 'antd';
import type { QuestionComponentProps } from '../types';
import { QuestionFrame, useAnswerState } from './shared';
import { blankAnswer, blankId, blankText, inputRule } from './answers';

/** 填空：answer = { [空位id]: 文本 }，按 attribute.dataType 过滤与校验 */
export default function FillBlank(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const [error, setError] = useState<string>();
  const id = blankId(schema);
  const text = blankText(answer, id);
  const rule = inputRule(schema.attribute?.dataType, schema.attribute?.textLimit);
  const readOnly = mode === 'edit' || Boolean(disabled);

  return (
    <QuestionFrame schema={schema} number={number}>
      <Input
        style={{ maxWidth: 380 }}
        value={text}
        placeholder={schema.attribute?.placeholder || '请输入'}
        disabled={readOnly}
        maxLength={rule.maxLength}
        inputMode={rule.inputMode}
        status={error ? 'error' : undefined}
        onChange={(e) => {
          const next = rule.filter ? rule.filter(e.target.value) : e.target.value;
          setAnswer(blankAnswer(id, next));
          if (error) setError(undefined);
        }}
        onBlur={() => !readOnly && setError(rule.validate?.(text))}
      />
      {error && <div style={{ color: 'var(--bp-orange)', fontSize: 11, marginTop: 4 }}>{error}</div>}
    </QuestionFrame>
  );
}
