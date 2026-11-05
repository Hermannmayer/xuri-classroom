import { Checkbox as AntCheckbox } from 'antd';
import type { QuestionComponentProps } from '../types';
import { answersOf, selectedIds, toOptions } from './answers';
import { EmptyOptions, QuestionFrame, useAnswerState } from './shared';

/** 多选：answer = { [optionId]: option.label }，可多个 key */
export default function Checkbox(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const options = toOptions(schema.dataSource);
  const [answer, setAnswer] = useAnswerState(props);
  const locked = mode === 'edit' || Boolean(disabled);

  return (
    <QuestionFrame schema={schema} number={number}>
      {options.length === 0 ? (
        <EmptyOptions />
      ) : (
        <AntCheckbox.Group
          disabled={locked}
          options={options}
          value={selectedIds(answer, options)}
          onChange={(ids) => setAnswer(answersOf(options, ids.map(String)))}
        />
      )}
    </QuestionFrame>
  );
}
