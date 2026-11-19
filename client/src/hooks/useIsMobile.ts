import { useEffect, useState } from 'react';

/**
 * 手机断点。与 antd 的 md 对齐（767.98 覆盖 767.x 这种小数视口），
 * 也等于 global.css 里所有 @media (max-width: 767.98px) 的口径。
 */
export const MOBILE_QUERY = '(max-width: 767.98px)';

/**
 * 当前视口是不是手机宽度。
 *
 * <p>用 matchMedia 而不是读 innerWidth：滚动条出现/消失、软键盘弹出都会让 innerWidth 抖一下，
 * 而这里关心的是「断点跨没跨过去」。
 */
export function useIsMobile(query: string = MOBILE_QUERY): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}
