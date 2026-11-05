import { Input } from 'antd';
import type { QuestionComponentProps } from '../types';
import { addressAnswer, addressText } from './answers';
import { QuestionFrame, useAnswerState } from './shared';

/**
 * 地址：answer = { [questionId]: '省 市 区' }。
 * 新前端没有省市级联字典接口可用（boundary 不改 api），按任务约定退化成三个 Input 组合。
 */
export default function Address(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const parts = addressText(answer, schema.id).split(/\s+/);
  const values = [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
  const locked = mode === 'edit' || Boolean(disabled);

  const commit = (index: number, raw: string) => {
    const next = [...values];
    next[index] = raw;
    setAnswer(addressAnswer(schema.id, next.map((part) => part.trim()).filter(Boolean).join(' ')));
  };

  return (
    <QuestionFrame schema={schema} number={number}>
      <div className="sk-address">
        {['省份', '城市', '区/县'].map((label, index) => (
          <Input
            key={label}
            value={values[index]}
            placeholder={label}
            disabled={locked}
            aria-label={label}
            onChange={(e) => commit(index, e.target.value)}
          />
        ))}
      </div>
    </QuestionFrame>
  );
}
