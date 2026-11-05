import { Radio as AntRadio } from 'antd';
import type { QuestionComponentProps } from '../types';
import { optionAnswer, selectedIds, toOptions } from './answers';
import { EmptyOptions, QuestionFrame, useAnswerState } from './shared';

/** 单选：answer = { [optionId]: option.label } */
export default function Radio(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const options = toOptions(schema.dataSource);
  const [answer, setAnswer] = useAnswerState(props);
  const locked = mode === 'edit' || Boolean(disabled);

  return (
    <QuestionFrame schema={schema} number={number}>
      {options.length === 0 ? (
        <EmptyOptions />
      ) : (
        <AntRadio.Group
          disabled={locked}
          value={selectedIds(answer, options)[0]}
          onChange={(e) => {
            const option = options.find((o) => o.value === e.target.value);
            if (option) setAnswer(optionAnswer(option));
          }}
        >
          {options.map((o) => (
            <AntRadio key={o.value} value={o.value}>
              {o.label}
            </AntRadio>
          ))}
        </AntRadio.Group>
      )}
    </QuestionFrame>
  );
}
