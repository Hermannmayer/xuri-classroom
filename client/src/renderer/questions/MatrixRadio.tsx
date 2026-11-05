import type { QuestionComponentProps } from '../types';
import MatrixChoice from './MatrixChoice';

/** 矩阵单选：answer = { [rowId]: { [colId]: true } }，每行恰好一个 key */
export default function MatrixRadio(props: QuestionComponentProps) {
  return <MatrixChoice {...props} multiple={false} />;
}
