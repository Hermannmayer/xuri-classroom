import type { QuestionComponentProps } from '../types';
import { firstSelectedId, npsRange } from './answers';
import { QuestionFrame, useAnswerState } from './shared';

/** NPS 净推荐值：answer = { [分值]: true }，分值范围取 attribute.npsStartNum/npsTotalNum（默认 0..10） */
export default function Nps(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const scores = npsRange(schema.attribute);
  const picked = firstSelectedId(answer);
  const locked = mode === 'edit' || Boolean(disabled);
  const last = scores[scores.length - 1];

  return (
    <QuestionFrame schema={schema} number={number}>
      <div className="sk-nps">
        {scores.map((score) => {
          const active = picked === String(score);
          return (
            <button
              type="button"
              key={score}
              className={`sk-option sk-nps-btn${active ? ' selected' : ''}`}
              disabled={locked}
              aria-pressed={active}
              onClick={() => {
                if (!locked) setAnswer({ [String(score)]: true });
              }}
            >
              {score}
            </button>
          );
        })}
      </div>
      <div className="sk-nps-hint">
        <span>{scores[0]} 完全不推荐</span>
        <span>{last} 非常推荐</span>
      </div>
    </QuestionFrame>
  );
}
