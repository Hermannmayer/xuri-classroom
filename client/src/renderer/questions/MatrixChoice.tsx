import type { QuestionComponentProps } from '../types';
import { matrixAnswer, matrixColumns, matrixPick } from './answers';
import { MatrixMark, MatrixTable } from './Matrix';
import { QuestionFrame, useAnswerState } from './shared';

/** 矩阵单选/多选共用：multiple=false 时每行只保留一个 key */
export default function MatrixChoice({ multiple, ...props }: QuestionComponentProps & { multiple: boolean }) {
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
            checked={Object.prototype.hasOwnProperty.call(matrix[rowId] ?? {}, colId)}
            disabled={locked}
            label={label}
            onToggle={() => {
              if (!locked) setAnswer(matrixPick(answer, rowId, colId, multiple));
            }}
          />
        )}
      />
    </QuestionFrame>
  );
}
