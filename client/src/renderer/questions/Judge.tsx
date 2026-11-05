import type { QuestionComponentProps } from '../types';
import { optionAnswer, selectedIds, toOptions } from './answers';
import OptionList from './OptionList';
import { QuestionFrame, useAnswerState } from './shared';

/** 判断题：选项固定为「正确 / 错误」，答案格式与单选一致 */
export default function Judge(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const options = toOptions(schema.dataSource);
  const [answer, setAnswer] = useAnswerState(props);
  const locked = mode === 'edit' || Boolean(disabled);
  const picked = selectedIds(answer, options);

  return (
    <QuestionFrame schema={schema} number={number}>
      <OptionList
        options={options}
        picked={picked.slice(0, 1)}
        locked={locked}
        mark={(i) => (i === 0 ? '√' : '×')}
        onPick={(value) => {
          if (locked) return;
          const hit = options.find((o) => o.value === value);
          if (hit) setAnswer(optionAnswer(hit));
        }}
      />
    </QuestionFrame>
  );
}
