import type { ReactNode } from 'react';
import type { Row } from '../../schema/types';
import type { Option } from './answers';

/** 矩阵表格骨架：行标题固定首列，列多时外层横向滚动（375px 不撑破页面） */
export function MatrixTable({
  rows,
  columns,
  renderCell,
}: {
  rows: Row[];
  columns: Option[];
  renderCell: (rowId: string, colId: string, label: string) => ReactNode;
}) {
  if (rows.length === 0 || columns.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--bp-orange)' }}>未配置矩阵行/列（row 或 dataSource 为空）</div>;
  }

  return (
    <div className="sk-matrix-wrap">
      <table className="sk-matrix">
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
                  <td key={column.value}>{renderCell(rowId, column.value, `${rowTitle} / ${column.label}`)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 矩阵里的方形格子：选中变橙，复用蓝图风格 */
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
  return (
    <button
      type="button"
      className={`sk-matrix-cell${checked ? ' selected' : ''}`}
      disabled={disabled}
      aria-label={label}
      aria-pressed={checked}
      onClick={onToggle}
    >
      <span className="sk-matrix-box" />
    </button>
  );
}
