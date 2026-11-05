import { Input } from 'antd';
import type { QuestionComponentProps } from '../types';
import { QuestionFrame, useAnswerState } from './shared';

/** 填空：answer = string */
export default function FillBlank(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const text = typeof answer === 'string' ? answer : '';

  return (
    <QuestionFrame schema={schema} number={number}>
      <Input
        style={{ maxWidth: 360 }}
        value={text}
        placeholder={schema.attribute?.placeholder || '请输入'}
        disabled={mode === 'edit' || Boolean(disabled)}
        onChange={(e) => setAnswer(e.target.value)}
      />
    </QuestionFrame>
  );
}
