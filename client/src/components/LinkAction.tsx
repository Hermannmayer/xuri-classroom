import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';

type LinkActionProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
};

/**
 * 可访问的「链接式操作」。
 *
 * 全站原来有大量 `<a onClick>`（无 href）：视觉上是链接，但读屏不会识别成可操作元素、
 * 键盘也无法聚焦。这里统一替换成：保留 `<a>` 的外观（字重/颜色/间距与原来一致），
 * 补上 `role="button" tabIndex={0}`，并让 Enter / 空格触发一次原生 click（这样
 * Popconfirm 之类依赖 click 的包装组件也能正常工作）。
 *
 * 之所以不用 antd `<Button type="link">`：本项目的 `.ant-btn` 有 `text-transform: uppercase`
 * 与 `font-weight: 600`，替换后表格操作列的字重/行高会变化；用 `<a>` 包裹可以做到零视觉回归。
 */
const LinkAction = forwardRef<HTMLAnchorElement, LinkActionProps>(function LinkAction(
  { onClick, onKeyDown, children, style, ...rest },
  ref,
) {
  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      // 阻止空格滚动页面，然后触发一次原生 click（同时兼容 Popconfirm 等包装组件）
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <a
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'pointer', ...style }}
      {...rest}
    >
      {children}
    </a>
  );
});

export default LinkAction;
