import type { QuestionComponentProps } from '../types';
import { optionAnswer, selectedIds, toOptions } from './answers';
import { EmptyOptions, QuestionFrame, useAnswerState } from './shared';

/** 单选：整行卡片可点，左侧字母标（直角，保持蓝图风格） */
export default function Radio(props: QuestionComponentProps) {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                <span className="sk-option-key">{String.fromCharCode(65 + i)}</span>
                <span className="sk-option-label">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </QuestionFrame>
  );
}
