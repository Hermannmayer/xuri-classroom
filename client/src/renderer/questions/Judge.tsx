import type { QuestionComponentProps } from '../types';
import { optionAnswer, selectedIds, toOptions } from './answers';
import { EmptyOptions, QuestionFrame, useAnswerState } from './shared';

/** 判断题：选项是「正确 / 错误」，答案格式与单选一致（{ 选项id: true }） */
export default function Judge(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const options = toOptions(schema.dataSource);
  const [answer, setAnswer] = useAnswerState(props);
  const locked = mode === 'edit' || Boolean(disabled);
  const picked = selectedIds(answer, options)[0];

  return (
    <QuestionFrame schema={schema} number={number}>
      {options.length === 0 ? (
        <EmptyOptions />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
          {options.map((o, i) => {
            const active = picked === o.value;
            return (
              <button
                type="button"
                key={o.value}
                className={`sk-option${active ? ' selected' : ''}`}
                disabled={locked}
                onClick={() => {
                  if (!locked) setAnswer(optionAnswer(o));
                }}
              >
                <span className="sk-option-key">{i === 0 ? '√' : '×'}</span>
                <span className="sk-option-label">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </QuestionFrame>
  );
}
