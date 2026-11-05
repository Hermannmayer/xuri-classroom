import type { QuestionComponentProps } from '../types';
import { answersOf, selectedIds, toOptions } from './answers';
import { EmptyOptions, QuestionFrame, useAnswerState } from './shared';

/** 多选：整行卡片可点，可多选；左侧字母标 */
export default function Checkbox(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const options = toOptions(schema.dataSource);
  const [answer, setAnswer] = useAnswerState(props);
  const locked = mode === 'edit' || Boolean(disabled);
  const picked = selectedIds(answer, options);

  const toggle = (value: string) => {
    if (locked) return;
    const next = picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value];
    setAnswer(answersOf(options, next));
  };

  return (
    <QuestionFrame schema={schema} number={number}>
      {options.length === 0 ? (
        <EmptyOptions />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map((o, i) => {
            const active = picked.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                className={`sk-option${active ? ' selected' : ''}`}
                disabled={locked}
                onClick={() => toggle(o.value)}
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
