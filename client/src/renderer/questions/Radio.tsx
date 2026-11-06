import type { QuestionComponentProps } from '../types';
import { optionAnswer, optionsOf, selectedIds } from './answers';
import OptionList from './OptionList';
import { QuestionFrame, useAnswerState } from './shared';

/** 单选：answer = { 选中选项id: true } */
export default function Radio(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const options = optionsOf(schema);
  const [answer, setAnswer] = useAnswerState(props);
  const locked = mode === 'edit' || Boolean(disabled);
  const picked = selectedIds(answer, options);

  return (
    <QuestionFrame schema={schema} number={number}>
      <OptionList
        options={options}
        picked={picked.slice(0, 1)}
        locked={locked}
        onPick={(value) => {
          if (locked) return;
          const hit = options.find((o) => o.value === value);
          if (hit) setAnswer(optionAnswer(hit));
        }}
      />
    </QuestionFrame>
  );
}
