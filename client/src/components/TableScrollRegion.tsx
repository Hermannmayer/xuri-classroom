import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * 给 antd Table 的横向滚动容器补键盘可达性。
 *
 * antd 的 `scroll={{ x }}` 会由 rc-table 渲染一个 `.ant-table-content`（x+y 时是 `.ant-table-body`）
 * 且默认不可聚焦，axe 会报 `scrollable-region-focusable`（横向表格键盘无法滚动）。
 * rc-table 没有暴露 scroller 的 props，这里在每次渲染后找到滚动容器补：
 * `tabIndex=0` + `role="region"` + `aria-label`，键盘用户 Tab 到表格即可用方向键横向滚动。
 *
 * 用法：`<TableScrollRegion label="题库列表（可横向滚动）"><Table ... /></TableScrollRegion>`
 */
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
