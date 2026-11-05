import type { QuestionComponentProps } from '../types';
import { matrixAnswer, matrixColumns, matrixPick } from './answers';
import { MatrixMark, MatrixTable } from './Matrix';
import { QuestionFrame, useAnswerState } from './shared';

/** 矩阵多选：answer = { [rowId]: { [colId]: true } }，一行可多个 key */
export default function MatrixCheckbox(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const [answer, setAnswer] = useAnswerState(props);
  const rows = schema.row ?? [];
  const columns = matrixColumns(schema);
  const matrix = matrixAnswer(answer);
  const locked = mode === 'edit' || Boolean(disabled);

  return (
    <QuestionFrame schema={schema} number={number}>
      <MatrixTable
        rows={rows}
        columns={columns}
        renderCell={(rowId, colId, label) => (
          <MatrixMark
            checked={Boolean(Object.prototype.hasOwnProperty.call(matrix[rowId] ?? {}, colId))}
            disabled={locked}
            label={label}
            onToggle={() => {
              if (!locked) setAnswer(matrixPick(answer, rowId, colId, true));
            }}
          />
        )}
      />
    </QuestionFrame>
  );
}
