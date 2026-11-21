import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';

type LinkActionProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
};

/** 可访问的「链接式操作」 */
const LinkAction = forwardRef<HTMLAnchorElement, LinkActionProps>(function LinkAction(
  { onClick, onKeyDown, children, style, ...rest },
  ref,
) {
  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {

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
