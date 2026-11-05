import { Input } from 'antd';
import type { QuestionComponentProps } from '../types';
import { QuestionFrame, useAnswerState } from './shared';
import { blankAnswer, blankId, blankText, inputRule } from './answers';

/** 多行文本：answer = { [空位id]: 文本 }，按 attribute.textLimit 限制长度 */
export default function Textarea(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const id = blankId(schema);
  const text = blankText(answer, id);
  const rule = inputRule(schema.attribute?.dataType, schema.attribute?.textLimit);

  return (
    <QuestionFrame schema={schema} number={number}>
      <Input.TextArea
        style={{ maxWidth: 720 }}
        rows={schema.attribute?.rows ?? 4}
        value={text}
        placeholder={schema.attribute?.placeholder || '请输入'}
        disabled={mode === 'edit' || Boolean(disabled)}
        maxLength={rule.maxLength}
        showCount={Boolean(rule.maxLength)}
        onChange={(e) => {
          const next = rule.filter ? rule.filter(e.target.value) : e.target.value;
          setAnswer(blankAnswer(id, next));
        }}
      />
    </QuestionFrame>
  );
}
