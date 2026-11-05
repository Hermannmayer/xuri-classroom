import { Cascader } from 'antd';
import type { QuestionComponentProps } from '../types';
import { cascaderLabel, cascaderPath, firstSelectedId } from './answers';
import { EmptyOptions, QuestionFrame, useAnswerState } from './shared';

/** 级联：answer = { [末级value]: 末级label }，dataSource 为 {label,value,children} 树 */
export default function CascaderQuestion(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const tree = schema.dataSource ?? [];
  const leaf = firstSelectedId(answer);
  const locked = mode === 'edit' || Boolean(disabled);

  return (
    <QuestionFrame schema={schema} number={number}>
      {tree.length === 0 ? (
        <EmptyOptions />
      ) : (
        <Cascader
          style={{ width: '100%', maxWidth: 360 }}
          options={tree}
          value={leaf ? cascaderPath(tree, leaf) : []}
          placeholder={schema.attribute?.placeholder || '请选择'}
          disabled={locked}
          allowClear
          onChange={(path) => {
            if (locked) return;
            if (!path || path.length === 0) {
              setAnswer(null);
              return;
            }
            const last = String(path[path.length - 1]);
            setAnswer({ [last]: cascaderLabel(tree, last) ?? last });
          }}
        />
      )}
    </QuestionFrame>
  );
}
