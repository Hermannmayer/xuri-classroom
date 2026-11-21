import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/** 给 antd Table 的横向滚动容器补键盘可达性 */
export default function TableScrollRegion({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('.ant-table-content, .ant-table-body').forEach((el) => {
      el.tabIndex = 0;
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', label);
    });
  });

  return <div ref={ref}>{children}</div>;
}
