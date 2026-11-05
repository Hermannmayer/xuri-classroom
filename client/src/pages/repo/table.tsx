import type { ComponentProps, Dispatch, SetStateAction } from 'react';
import type { PaginationProps } from 'antd';

/**
 * 蓝图风格表格：主题只配了表头竖向分隔色，这里补一条表头下沿虚线。
 */
export const TABLE_COMPONENTS = {
  header: {
    cell: (props: ComponentProps<'th'>) => (
      <th {...props} style={{ ...props.style, borderBottom: '1px dashed var(--bp-line)' }} />
    ),
  },
};

/** 表格分页的公共六件套，showTotal 可选以保留各页自己的量词 */
export function pager(
  page: number,
  pageSize: number,
  total: number,
  setPage: Dispatch<SetStateAction<number>>,
  setPageSize: Dispatch<SetStateAction<number>>,
  showTotal: (total: number) => string = (n) => `共 ${n} 条`,
): PaginationProps {
  return {
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    showTotal,
    onChange: (p, s) => {
      setPage(p);
      setPageSize(s);
    },
  };
}

