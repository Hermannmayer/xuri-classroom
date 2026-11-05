import type { QuestionComponentProps } from '../types';
import { answersOf, selectedIds, toOptions } from './answers';
import OptionList from './OptionList';
import { QuestionFrame, useAnswerState } from './shared';

/** 多选：answer = { 选中选项id: true, ... }，可多选 */
export default function Checkbox(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const options = toOptions(schema.dataSource);
  const [answer, setAnswer] = useAnswerState(props);
  const locked = mode === 'edit' || Boolean(disabled);
  const picked = selectedIds(answer, options);

  return (
    <QuestionFrame schema={schema} number={number}>
      <OptionList
        options={options}
        picked={picked}
        locked={locked}
        onPick={(value) => {
          if (locked) return;
          const next = picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value];
          setAnswer(answersOf(options, next));
        }}
      />
    </QuestionFrame>
  );
}
