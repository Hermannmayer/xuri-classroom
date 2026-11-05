import { Input } from 'antd';
import type { QuestionComponentProps } from '../types';
import { matrixColumns, matrixSetText, matrixText } from './answers';
import { MatrixTable } from './Matrix';
import { QuestionFrame, useAnswerState } from './shared';

/** 矩阵填空：answer = { [rowId]: { [colId]: 文本 } }，空格子不产生 key */
export default function MatrixFillBlank(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const rows = schema.row ?? [];
  const columns = matrixColumns(schema);
  const locked = mode === 'edit' || Boolean(disabled);

  return (
    <QuestionFrame schema={schema} number={number}>
      <MatrixTable
        rows={rows}
        columns={columns}
        renderCell={(rowId, colId, label) => (
          <Input
            size="small"
            style={{ width: '100%', minWidth: 88 }}
            value={matrixText(answer, rowId, colId)}
            placeholder={schema.attribute?.placeholder || '请输入'}
            disabled={locked}
            aria-label={label}
            onChange={(e) => {
              if (!locked) setAnswer(matrixSetText(answer, rowId, colId, e.target.value));
            }}
          />
        )}
      />
    </QuestionFrame>
  );
}
