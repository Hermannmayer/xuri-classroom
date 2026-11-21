import type { ReactNode } from 'react';
import type { Row } from '../../schema/types';
import type { Option } from './answers';
import { useQuestionA11y, useQuestionLabelId } from './shared';

/**
 * 矩阵表格骨架：行标题固定首列，列多时外层横向滚动（375px 不撑破页面）。
 * 无障碍：表格名指向题干 id；单元格的可访问名带上「行 / 列」，读屏才不用自己数格子。
 */
export function MatrixTable({
  rows,
  columns,
  renderCell,
}: {
  rows: Row[];
  columns: Option[];
  renderCell: (rowId: string, colId: string, label: string) => ReactNode;
}) {

  const labelId = useQuestionLabelId();
  if (rows.length === 0 || columns.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--bp-orange)' }}>未配置矩阵行/列（row 或 dataSource 为空）</div>;
  }

  return (
    <div className="sk-matrix-wrap">
      <table className="sk-matrix" aria-labelledby={labelId}>
        <thead>
          <tr>
            <th scope="col" />
            {columns.map((column) => (
              <th scope="col" key={column.value}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const rowId = row.id || String(i);
            const rowTitle = row.title || `行 ${i + 1}`;
            return (
              <tr key={rowId}>
                <th scope="row">{rowTitle}</th>
                {columns.map((column) => (
                  <td key={column.value}>
                    {renderCell(rowId, column.value, `行：${rowTitle}，列：${column.label}`)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 矩阵里的方形格子：选中变橙，复用蓝图风格。
 * 无障碍：角色跟着题型走（矩阵单选是 radio、多选是 checkbox，由 QuestionFrame 通过 Context 给），
 * 用 aria-checked 表达选中状态；aria-label 说明这是哪一行哪一列。
 */
export function MatrixMark({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onToggle: () => void;
}) {
  const a11y = useQuestionA11y();
  return (
    <button
      type="button"
      role={a11y?.optionRole ?? 'radio'}
      className={`sk-matrix-cell${checked ? ' selected' : ''}`}
      disabled={disabled}
      aria-label={label}
      aria-checked={checked}
      onClick={onToggle}
    >
      <span className="sk-matrix-box" />
    </button>
  );
}
