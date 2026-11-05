import { Input } from 'antd';
import type { QuestionComponentProps } from '../types';
import { blankValues, inputRule } from './answers';
import { QuestionFrame, useAnswerState } from './shared';

/** 多空填空：answer = { [空位id]: 文本 }，空位来自 schema.children，title 作提示 */
export default function MultipleBlank(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const blanks = schema.children ?? [];
  const values = blankValues(answer);
  const rule = inputRule(schema.attribute?.dataType, schema.attribute?.textLimit);
  const locked = mode === 'edit' || Boolean(disabled);

  const commit = (id: string, raw: string) => {
    const clean = rule.filter ? rule.filter(raw) : raw;
    setAnswer({ ...values, [id]: clean });
  };

  return (
    <QuestionFrame schema={schema} number={number}>
      {blanks.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--bp-orange)' }}>未配置填空项（children 为空）</div>
      ) : (
        <div className="sk-blanks">
          {blanks.map((blank, i) => (
            <div className="sk-blank-row" key={blank.id}>
              <span className="sk-option-key">{String(i + 1).padStart(2, '0')}</span>
              <Input
                value={values[blank.id] ?? ''}
                placeholder={blank.title || `第 ${i + 1} 空`}
                disabled={locked}
                maxLength={rule.maxLength}
                inputMode={rule.inputMode}
                onChange={(e) => commit(blank.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </QuestionFrame>
  );
}
