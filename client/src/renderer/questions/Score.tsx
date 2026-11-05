import { Rate } from 'antd';
import type { QuestionComponentProps } from '../types';
import { scoreMax } from './answers';
import { QuestionFrame, useAnswerState } from './shared';

/**
 * 评分：answer = number；星数取 attribute.scope 上限（默认 [0,5]）。
 * ponytail: 先只做默认星形，attribute.scoreStyle 的 heart/smile 皮肤等做考试皮肤时再补。
 */
export default function Score(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);

  return (
    <QuestionFrame schema={schema} number={number}>
      <Rate
        count={scoreMax(schema.attribute?.scope)}
        value={typeof answer === 'number' ? answer : 0}
        disabled={mode === 'edit' || Boolean(disabled)}
        onChange={(n) => setAnswer(n)}
      />
    </QuestionFrame>
  );
}
