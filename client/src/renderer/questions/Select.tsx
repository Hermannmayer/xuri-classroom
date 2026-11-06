import { Select as AntSelect } from 'antd';
import type { QuestionComponentProps } from '../types';
import { optionAnswer, optionsOf, selectedIds } from './answers';
import { EmptyOptions, QuestionFrame, useAnswerState } from './shared';

/** 下拉单选：answer = { [optionId]: option.label } */
export default function Select(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const options = optionsOf(schema);
  const [answer, setAnswer] = useAnswerState(props);
  const locked = mode === 'edit' || Boolean(disabled);

  return (
    <QuestionFrame schema={schema} number={number}>
      {options.length === 0 ? (
        <EmptyOptions />
      ) : (
        <AntSelect
          style={{ width: '100%', maxWidth: 360 }}
          value={selectedIds(answer, options)[0]}
          options={options}
          placeholder={schema.attribute?.placeholder || '请选择'}
          disabled={locked}
          allowClear
          showSearch
          optionFilterProp="label"
          onChange={(id) => {
            const option = options.find((o) => o.value === id);
            setAnswer(option ? optionAnswer(option) : null);
          }}
        />
      )}
    </QuestionFrame>
  );
}
