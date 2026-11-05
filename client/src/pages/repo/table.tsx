import type { ComponentProps } from 'react';

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
