import type { QuestionComponentProps } from '../types';
import MatrixChoice from './MatrixChoice';

/** 矩阵多选：answer = { [rowId]: { [colId]: true, ... } } */
export default function MatrixCheckbox(props: QuestionComponentProps) {
  return <MatrixChoice {...props} multiple />;
}
